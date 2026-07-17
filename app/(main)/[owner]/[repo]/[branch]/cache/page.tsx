"use client";

import { CachePage } from "@/components/cache/cache-page";
import { DocumentTitle, formatRepoBranchTitle } from "@/components/document-title";
import { useConfig } from "@/contexts/config-context";
import { useUser } from "@/contexts/user-context";
import { hasGithubIdentity } from "@/lib/authz-shared";
import { isCacheEnabled } from "@/lib/config";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export default function Page() {
  const { config } = useConfig();
  const { user } = useUser();

  if (!config) throw new Error("Configuration not found.");

  if (!hasGithubIdentity(user)) {
    return (
      <Empty className="absolute inset-0 border-0 rounded-none">
        <EmptyHeader>
          <EmptyTitle>Доступ запрещён</EmptyTitle>
          <EmptyDescription>Управлять кэшем могут только пользователи GitHub.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (!isCacheEnabled(config.object)) {
    return (
      <Empty className="absolute inset-0 border-0 rounded-none">
        <EmptyHeader>
          <EmptyTitle>Кэш отключён</EmptyTitle>
          <EmptyDescription>Включите кэш в &quot;.pages.yml&quot;, задав &quot;settings.cache: true&quot;.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      <DocumentTitle
        title={formatRepoBranchTitle("Кэш", config.owner, config.repo, config.branch)}
      />
      <CachePage owner={config.owner} repo={config.repo} branch={config.branch} />
    </>
  );
}
