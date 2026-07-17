"use client";

import Link from "next/link";
import { Entry } from "@/components/entry/entry";
import {
  DocumentTitle,
  formatRepoBranchTitle,
} from "@/components/document-title";
import { useConfig } from "@/contexts/config-context";
import { useUser } from "@/contexts/user-context";
import { hasGithubIdentity } from "@/lib/authz-shared";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BookText } from "lucide-react";

export default function Page() {
  const { config, setConfig } = useConfig();
  const { user } = useUser();

  const handleSave = async (data: Record<string, any>) => {
    setConfig(data.config);
  };

  if (!hasGithubIdentity(user)) {
    return (
      <Empty className="absolute inset-0 border-0 rounded-none">
        <EmptyHeader>
          <EmptyTitle>Доступ запрещён</EmptyTitle>
          <EmptyDescription>
            Управлять конфигурацией репозитория могут только пользователи GitHub.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      {config && (
        <DocumentTitle
          title={formatRepoBranchTitle(
            "Конфигурация",
            config.owner,
            config.repo,
            config.branch,
          )}
        />
      )}
      <Entry
        path=".pages.yml"
        onSave={handleSave}
        title="Конфигурация"
      />
    </>
  );
}
