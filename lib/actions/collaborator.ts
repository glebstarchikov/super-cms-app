"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getInstallationRepos, getInstallations } from "@/lib/github-app";
import { requireGithubRepoWriteAccess } from "@/lib/authz-server";
import { InviteEmailTemplate } from "@/components/email/invite";
import { CollaboratorAddedEmailTemplate } from "@/components/email/collaborator-added";
import { render } from "@react-email/render";
import { sendEmail } from "@/lib/mailer";
import { getBaseUrl } from "@/lib/base-url";
import { db } from "@/db";
import { and, eq, sql } from "drizzle-orm";
import { collaboratorInviteTable, collaboratorTable } from "@/db/schema";
import { z } from "zod";
import { randomBytes } from "crypto";
import { findVerifiedUserByEmail, normalizeEmail } from "@/lib/collaborator-access";

const parseInviteEmails = (raw: FormDataEntryValue | null) => {
  const value = typeof raw === "string" ? raw : "";
  const parts = value
    .split(/[\n,]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const unique = Array.from(new Set(parts.map((email) => email.toLowerCase())));
  return z.array(z.string().email()).safeParse(unique);
};

const assertRepoInInstallation = async (
  user: { id: string; githubUsername?: string | null },
  owner: string,
  repo: string
) => {
  const { token, repoAccess } = await requireGithubRepoWriteAccess(
    user,
    owner,
    repo,
    "You must be signed in with GitHub to manage collaborators.",
  );
  const installations = await getInstallations(token, [owner]);
  if (installations.length !== 1) throw new Error(`"${owner}" is not part of your GitHub App installations`);
  const installationRepos = await getInstallationRepos(token, installations[0].id);
  const isInstalledForRepo = installationRepos.some((installationRepo) =>
    installationRepo.id === repoAccess.repoId ||
    (
      installationRepo.owner?.login?.toLowerCase() === owner.toLowerCase() &&
      installationRepo.name?.toLowerCase() === repo.toLowerCase()
    )
  );
  if (!isInstalledForRepo) throw new Error(`«${owner}/${repo}» не входит в вашу установку Plainly.`);

  return {
    repoAccess,
    installation: installations[0],
  };
};

const generateInviteToken = () => {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const bytes = randomBytes(32);
  let token = "";

  for (let i = 0; i < 32; i += 1) {
    token += alphabet[bytes[i] % alphabet.length];
  }

  return token;
};

const createCollaboratorInviteUrl = async ({
  email,
  owner,
  repo,
  baseUrl,
}: {
  email: string;
  owner: string;
  repo: string;
  baseUrl: string;
}) => {
  const token = generateInviteToken();
  const expiresAt = new Date(
    Date.now() + ((Number(process.env.COLLABORATOR_INVITE_LINK_EXPIRES_IN) || 86400) * 1000),
  );

  await db
    .delete(collaboratorInviteTable)
    .where(
      and(
        sql`lower(${collaboratorInviteTable.email}) = lower(${email})`,
        sql`lower(${collaboratorInviteTable.owner}) = lower(${owner})`,
        sql`lower(${collaboratorInviteTable.repo}) = lower(${repo})`,
      ),
    );

  await db.insert(collaboratorInviteTable).values({
    token,
    email,
    owner,
    repo,
    expiresAt,
  });

  const inviteUrl = new URL("/sign-in/collaborator", baseUrl);
  inviteUrl.searchParams.set("token", token);

  return inviteUrl.toString();
};

// Invite a collaborator to a repository.
const handleAddCollaborator = async (prevState: any, formData: FormData) => {
	try {
		// TODO: remove the requirement for Github account, let any collaborator invite others
		const session = await auth.api.getSession({
      headers: await headers(),
    });
    const user = session?.user;
		if (!user) throw new Error("Чтобы приглашать участников, войдите через GitHub.");

		// TODO: add support for branches
		const ownerAndRepoValidation = z.object({
			owner: z.string().trim().min(1),
			repo: z.string().trim().min(1),
		}).safeParse({
			owner: formData.get("owner"),
			repo: formData.get("repo")
		});
		if (!ownerAndRepoValidation.success) throw new Error ("Неверный владелец или репозиторий");

		const owner = ownerAndRepoValidation.data.owner;
		const repo = ownerAndRepoValidation.data.repo;

    const emailsValidation = parseInviteEmails(formData.get("emails") ?? formData.get("email"));
		if (!emailsValidation.success || emailsValidation.data.length === 0) throw new Error("Неверный список адресов");
    const emails = emailsValidation.data;

    const { repoAccess, installation } = await assertRepoInInstallation(user, owner, repo);

		const baseUrl = getBaseUrl();
    const repoUrl = new URL(`/${owner}/${repo}`, baseUrl).toString();
    const createdCollaborators: (typeof collaboratorTable.$inferSelect)[] = [];
    const errors: string[] = [];
    let immediateAccessCount = 0;
    let pendingInviteCount = 0;

    for (const email of emails) {
      const normalizedEmail = normalizeEmail(email);
      const existingUser = await findVerifiedUserByEmail(normalizedEmail);
      const collaborator = await db.query.collaboratorTable.findFirst({
				where: and(
        eq(collaboratorTable.ownerId, repoAccess.ownerId),
        eq(collaboratorTable.repoId, repoAccess.repoId),
					sql`lower(${collaboratorTable.email}) = lower(${normalizedEmail})`
      ),
			});
      if (collaborator) {
        if (existingUser && collaborator.userId !== existingUser.id) {
          const updated = await db.update(collaboratorTable)
            .set({ userId: existingUser.id })
            .where(eq(collaboratorTable.id, collaborator.id))
            .returning();
          if (updated.length > 0) {
            createdCollaborators.push(...updated);
            immediateAccessCount += 1;
          }
        }
        errors.push(`${normalizedEmail} уже приглашён в «${owner}/${repo}».`);
        continue;
      }

      if (!existingUser) {
        const inviteUrl = await createCollaboratorInviteUrl({
          email: normalizedEmail,
          owner,
          repo,
          baseUrl,
        });
        try {
          const html = await render(
            InviteEmailTemplate({
              inviteUrl,
              repoName: `${formData.get("owner")}/${formData.get("repo")}`,
              email: normalizedEmail,
              invitedByName: user.name || user.githubUsername || user.email,
              invitedByUrl: `https://github.com/${user.githubUsername}`,
            }),
          );
          await sendEmail({
            to: normalizedEmail,
            subject: `Приглашение в «${owner}/${repo}» — Plainly`,
            html,
          });
        } catch (error: any) {
          console.error(`Failed to send invitation email to ${normalizedEmail}:`, error.message);
          errors.push(`${normalizedEmail}: ${error.message}`);
          continue;
        }
      } else {
        try {
          const html = await render(
            CollaboratorAddedEmailTemplate({
              email: normalizedEmail,
              repoName: `${formData.get("owner")}/${formData.get("repo")}`,
              repoUrl,
              invitedByName: user.name || user.githubUsername || user.email,
              invitedByUrl: `https://github.com/${user.githubUsername}`,
            }),
          );
          await sendEmail({
            to: normalizedEmail,
            subject: `Вас добавили в «${owner}/${repo}» — Plainly`,
            html,
          });
        } catch (error: any) {
          console.error(`Failed to send collaborator notification email to ${normalizedEmail}:`, error.message);
          errors.push(`${normalizedEmail}: ${error.message}`);
        }
      }

      const inserted = await db.insert(collaboratorTable).values({
        type: repoAccess.ownerType,
        installationId: installation.id,
        ownerId: repoAccess.ownerId,
        repoId: repoAccess.repoId,
        owner: repoAccess.ownerLogin,
        repo: repoAccess.repoName,
        email: normalizedEmail,
        userId: existingUser?.id ?? null,
        invitedBy: user.id
      }).returning();

      if (inserted.length > 0) {
        createdCollaborators.push(...inserted);
        if (existingUser) {
          immediateAccessCount += 1;
        } else {
          pendingInviteCount += 1;
        }
      }
    }

    if (createdCollaborators.length === 0) {
      throw new Error(errors.join(" "));
    }

		return {
      message:
        immediateAccessCount > 0 && pendingInviteCount > 0
          ? `Добавлено участников: ${immediateAccessCount}; отправлено приглашений: ${pendingInviteCount} — «${owner}/${repo}».`
          : immediateAccessCount > 0
            ? `Добавлено участников: ${immediateAccessCount} — «${owner}/${repo}».`
            : pendingInviteCount === 1
              ? `${createdCollaborators[0].email} приглашён в «${owner}/${repo}».`
              : `Приглашено участников: ${pendingInviteCount} — «${owner}/${repo}».`,
			data: createdCollaborators,
      errors
		};
	} catch (error: any) {
		console.error(error);
		return { error: error.message };
	}
};

// Remove a collaborator from a repository.
const handleRemoveCollaborator = async (collaboratorId: number, owner: string, repo: string) => {
	try {
		const session = await auth.api.getSession({
      headers: await headers(),
    });
    const user = session?.user;
		if (!user) throw new Error("Чтобы приглашать участников, войдите через GitHub.");

		const collaborator = await db.query.collaboratorTable.findFirst({ where: eq(collaboratorTable.id, collaboratorId) });
		if (!collaborator) throw new Error("Участник не найден");

    const { repoAccess } = await assertRepoInInstallation(user, owner, repo);

		const deletedCollaborator = await db.delete(collaboratorTable).where(
			and(
				eq(collaboratorTable.id, collaboratorId),
				eq(collaboratorTable.repoId, repoAccess.repoId)
			)
		).returning();

		if (!deletedCollaborator || deletedCollaborator.length === 0) throw new Error("Не удалось удалить участника");

    await db
      .delete(collaboratorInviteTable)
      .where(
        and(
          sql`lower(${collaboratorInviteTable.email}) = lower(${collaborator.email})`,
          sql`lower(${collaboratorInviteTable.owner}) = lower(${owner})`,
          sql`lower(${collaboratorInviteTable.repo}) = lower(${repo})`,
        ),
      );

		return { message: `Приглашение для ${collaborator.email} в «${owner}/${repo}» отменено.` };
	} catch (error: any) {
		console.error(error);
		return { error: error.message };
	}
};

const handleResendCollaboratorInvite = async (collaboratorId: number, owner: string, repo: string) => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const user = session?.user;
    if (!user) throw new Error("Чтобы повторно отправить приглашение, войдите через GitHub.");
    await assertRepoInInstallation(user, owner, repo);

    const collaborator = await db.query.collaboratorTable.findFirst({ where: eq(collaboratorTable.id, collaboratorId) });
    if (!collaborator) throw new Error("Участник не найден");

    if (collaborator.owner.toLowerCase() !== owner.toLowerCase() || collaborator.repo.toLowerCase() !== repo.toLowerCase()) {
      throw new Error("Участник не относится к этому репозиторию.");
    }

    const baseUrl = getBaseUrl();
    const inviteUrl = await createCollaboratorInviteUrl({
      email: collaborator.email,
      owner,
      repo,
      baseUrl,
    });

    const html = await render(
      InviteEmailTemplate({
        inviteUrl,
        repoName: `${owner}/${repo}`,
        email: collaborator.email,
        invitedByName: user.name || user.githubUsername || user.email,
        invitedByUrl: `https://github.com/${user.githubUsername}`,
      }),
    );

    await sendEmail({
      to: collaborator.email,
      subject: `Приглашение в «${owner}/${repo}» — Plainly`,
      html,
    });

    return { message: `Приглашение повторно отправлено на ${collaborator.email}.` };
  } catch (error: any) {
    console.error(error);
    return { error: error.message };
  }
};

export { handleAddCollaborator, handleRemoveCollaborator, handleResendCollaboratorInvite };
