"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookText, RefreshCcw, Trash2 } from "lucide-react";
import { useRepoHeader } from "@/components/repo/repo-header-context";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { requireApiSuccess } from "@/lib/api-client";

type CacheStatusPayload = {
  fileMeta: {
    commitSha: string | null;
    status: string;
    error: string | null;
    updatedAt: string;
    lastCheckedAt: string;
  } | null;
  folderMeta: Array<{
    path: string;
    context: string;
    status: string;
    commitSha: string | null;
    updatedAt: string;
  }>;
  fileCount: number;
  permissionCount: number;
  config: {
    sha: string;
    lastCheckedAt: string;
    version: string;
  } | null;
  branchHeadSha: string;
};

function formatTimeAgo(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return formatDistanceToNow(date, { addSuffix: true });
}

function fullDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function TimeWithTooltip({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="font-medium">-</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help font-medium">{formatTimeAgo(value)}</span>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{fullDate(value)}</TooltipContent>
    </Tooltip>
  );
}

function ConfirmActionButton({
  label,
  title,
  description,
  confirmLabel = "Подтвердить",
  variant = "outline",
  size = "sm",
  iconOnly = false,
  tooltip,
  className,
  icon,
  disabled,
  onConfirm,
}: {
  label: string;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  iconOnly?: boolean;
  tooltip?: string;
  className?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  onConfirm: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {iconOnly ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Button
                size={size}
                variant={variant}
                className={className}
                disabled={disabled}
                aria-label={label}
              >
                {icon ?? <Trash2 className="size-4" />}
              </Button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent sideOffset={6}>{tooltip || label}</TooltipContent>
        </Tooltip>
      ) : (
        <AlertDialogTrigger asChild>
          <Button
            size={size}
            variant={variant}
            className={className}
            disabled={disabled}
          >
            {label}
          </Button>
        </AlertDialogTrigger>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отменить</AlertDialogCancel>
          <AlertDialogAction
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={() => {
              void onConfirm().finally(() => setOpen(false));
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function CachePage({
  owner,
  repo,
  branch,
}: {
  owner: string;
  repo: string;
  branch: string;
}) {
  const [data, setData] = useState<CacheStatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/${owner}/${repo}/${encodeURIComponent(branch)}/cache`,
      );
      const payload = await requireApiSuccess<{
        status: string;
        data: CacheStatusPayload;
      }>(response, "Не удалось загрузить состояние кэша");
      setData(payload.data);
    } catch (error: any) {
      toast.error(error?.message || "Не удалось загрузить состояние кэша");
    } finally {
      setLoading(false);
    }
  }, [branch, owner, repo]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const runAction = useCallback(
    async (action: string, successMessage: string) => {
      setActionLoading(action);
      const loadingId = toast.loading("Обновляем кэш…");
      try {
        const response = await fetch(
          `/api/${owner}/${repo}/${encodeURIComponent(branch)}/cache`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          },
        );
        await requireApiSuccess(response, "Не удалось выполнить действие с кэшем");
        toast.success(successMessage, { id: loadingId });
        await fetchStatus();
      } catch (error: any) {
        toast.error(error?.message || "Не удалось выполнить действие с кэшем", { id: loadingId });
      } finally {
        setActionLoading(null);
      }
    },
    [branch, fetchStatus, owner, repo],
  );

  const headerNode = useMemo(
    () => (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-lg">Кэш</h1>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
              >
                <Link
                  href="https://pagescms.org/docs/development/caching/"
                  target="_blank"
                  rel="noreferrer"
                >
                  <BookText />
                  <span className="sr-only">Документация по кэшу</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Документация</TooltipContent>
          </Tooltip>
        </div>
        <ConfirmActionButton
          label="Очистить весь кэш"
          title="Очистить весь кэш?"
          description="Будет очищен кэш файлов, конфигурации и прав доступа для этого репозитория и ветки."
          confirmLabel="Очистить всё"
          variant="default"
          size="default"
          disabled={loading || actionLoading != null}
          onConfirm={async () =>
            runAction("clear-all-cache", "Кэш полностью очищен")
          }
        />
      </div>
    ),
    [actionLoading, loading, runAction],
  );

  useRepoHeader({ header: headerNode });

  const remoteSha = data?.branchHeadSha ?? null;
  const localSha = data?.fileMeta?.commitSha ?? null;
  const isOutOfSync = !!remoteSha && !!localSha && remoteSha !== localSha;
  const canReconcile = !!data && isOutOfSync;
  const shortSha = (sha: string | null | undefined) =>
    sha ? sha.slice(0, 8) : "-";

  if (loading || !data) {
    return (
      <div className="max-w-screen-lg mx-auto space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Контент</CardTitle>
              <CardDescription>
                Кэшированный контент (файлы и коллекции).
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm flex-1">
              <div className="divide-y rounded-md border">
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground">Файлов в кэше</span>
                  <Skeleton className="h-4 w-10" />
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground">Кэши папок</span>
                  <Skeleton className="h-4 w-10" />
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground">SHA кэша</span>
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground">SHA на сервере</span>
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground">Обновлено</span>
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground">Статус</span>
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground">Последняя проверка</span>
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <div className="inline-flex items-center">
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="rounded-r-none"
                  disabled
                >
                  <RefreshCcw className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="rounded-l-none border-l-0"
                  disabled
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Конфигурация</CardTitle>
                <CardDescription>
                  Кэш файла конфигурации (
                  <code className="text-[13px]">.pages.yml</code>).
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm flex-1">
                <div className="divide-y rounded-md border">
                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-muted-foreground">SHA кэша</span>
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-muted-foreground">Версия</span>
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-muted-foreground">Последняя проверка</span>
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <div className="inline-flex items-center">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="rounded-r-none"
                    disabled
                  >
                    <RefreshCcw className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="rounded-l-none border-l-0"
                    disabled
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Права доступа</CardTitle>
                <CardDescription>
                  Кэш проверок прав доступа к репозиторию.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm flex-1">
                <div className="divide-y rounded-md border">
                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-muted-foreground">Записи</span>
                    <Skeleton className="h-4 w-10" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button variant="outline" size="icon-sm" disabled>
                  <Trash2 className="size-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="max-w-screen-lg mx-auto space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Контент</CardTitle>
              <CardDescription>
                Кэшированный контент (файлы и коллекции).
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm flex-1">
              <div className="divide-y rounded-md border">
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground">Файлов в кэше</span>
                  <span className="font-medium">{data.fileCount}</span>
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground">Кэши папок</span>
                  <span className="font-medium">{data.folderMeta.length}</span>
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground">SHA кэша</span>
                  <span className="font-mono font-medium">
                    {shortSha(localSha)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground">SHA на сервере</span>
                  <span className="font-mono font-medium">
                    {shortSha(remoteSha)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground">Обновлено</span>
                  <TimeWithTooltip value={data.fileMeta?.updatedAt} />
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground">Статус</span>
                  <span className="font-medium capitalize">
                    {data.fileMeta?.status || "неизвестно"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground">Последняя проверка</span>
                  <TimeWithTooltip value={data.fileMeta?.lastCheckedAt} />
                </div>
              </div>
              {data.fileMeta?.status === "error" && (
                <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-3 text-sm">
                  <p className="font-medium text-destructive">
                    Неизвестная ошибка кэша
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Сначала попробуйте обновить кэш. Если проблема не исчезнет,
                    очистите кэш и обновите его ещё раз.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end">
              <div className="inline-flex items-center">
                <ConfirmActionButton
                  label="Обновить кэш"
                  title="Обновить кэш файлов?"
                  description="Будет проверен SHA на сервере и при необходимости синхронизирован кэш файлов."
                  confirmLabel="Обновить"
                  variant="outline"
                  size="icon-sm"
                  iconOnly
                  tooltip="Обновить кэш"
                  icon={<RefreshCcw className="size-4" />}
                  className="rounded-r-none"
                  disabled={actionLoading != null || !canReconcile}
                  onConfirm={async () =>
                    runAction("reconcile-file-cache", "Кэш файлов обновлён")
                  }
                />
                <ConfirmActionButton
                  label="Очистить кэш"
                  title="Очистить кэш файлов?"
                  description="Будут удалены записи кэша файлов и сброшены метаданные кэша."
                  confirmLabel="Очистить"
                  variant="outline"
                  size="icon-sm"
                  iconOnly
                  tooltip="Очистить кэш"
                  icon={<Trash2 className="size-4" />}
                  className="rounded-l-none border-l-0"
                  disabled={actionLoading != null}
                  onConfirm={async () =>
                    runAction("clear-file-cache", "Кэш файлов очищен")
                  }
                />
              </div>
            </CardFooter>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Конфигурация</CardTitle>
                <CardDescription>
                  Кэш файла конфигурации (
                  <code className="text-[13px]">.pages.yml</code>).
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm flex-1">
                <div className="divide-y rounded-md border">
                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-muted-foreground">SHA кэша</span>
                    <span className="font-mono font-medium">
                      {shortSha(data.config?.sha)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-muted-foreground">Версия</span>
                    <span className="font-medium">
                      {data.config?.version || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-muted-foreground">Последняя проверка</span>
                    <TimeWithTooltip value={data.config?.lastCheckedAt} />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <div className="inline-flex items-center">
                  <ConfirmActionButton
                    label="Обновить кэш"
                    title="Обновить кэш конфигурации?"
                    description="Конфигурация будет загружена заново и проверена."
                    confirmLabel="Обновить"
                    variant="outline"
                    size="icon-sm"
                    iconOnly
                    tooltip="Обновить кэш"
                    icon={<RefreshCcw className="size-4" />}
                    className="rounded-r-none"
                    disabled={actionLoading != null}
                    onConfirm={async () =>
                      runAction("refresh-config", "Кэш конфигурации обновлён")
                    }
                  />
                  <ConfirmActionButton
                    label="Очистить кэш"
                    title="Очистить кэш конфигурации?"
                    description="Будет удалён кэш конфигурации для этого репозитория и ветки."
                    confirmLabel="Очистить"
                    variant="outline"
                    size="icon-sm"
                    iconOnly
                    tooltip="Очистить кэш"
                    icon={<Trash2 className="size-4" />}
                    className="rounded-l-none border-l-0"
                    disabled={actionLoading != null}
                    onConfirm={async () =>
                      runAction("clear-config-cache", "Кэш конфигурации очищен")
                    }
                  />
                </div>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Права доступа</CardTitle>
                <CardDescription>
                  Кэш проверок прав доступа к репозиторию.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm flex-1">
                <div className="divide-y rounded-md border">
                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-muted-foreground">Записи</span>
                    <span className="font-medium">{data.permissionCount}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <ConfirmActionButton
                  label="Очистить кэш"
                  title="Очистить кэш прав доступа?"
                  description="Будут удалены записи кэша прав доступа для этого репозитория."
                  confirmLabel="Очистить"
                  variant="outline"
                  size="icon-sm"
                  iconOnly
                  tooltip="Очистить кэш"
                  icon={<Trash2 className="size-4" />}
                  disabled={actionLoading != null}
                  onConfirm={async () =>
                    runAction(
                      "clear-permission-cache",
                      "Кэш прав доступа очищен",
                    )
                  }
                />
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
