"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import packageJson from "../package.json";

const releaseRef = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF;
const inferredTagVersion =
  releaseRef && /^v\d+\.\d+\.\d+/.test(releaseRef) ? releaseRef : undefined;
const version =
  process.env.NEXT_PUBLIC_APP_VERSION ??
  inferredTagVersion ??
  packageJson.version;

export function About() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button size="icon-sm" variant="ghost">
                <span className="bg-primary text-primary-foreground rounded-md size-6 flex items-center justify-center">
                  <svg
                    className="size-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="12" cy="12" r="7" />
                  </svg>
                </span>
                <span className="sr-only">О программе Plainly</span>
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>О программе Plainly</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="w-[20rem] max-w-[calc(100vw-2rem)]">
        <DialogHeader className="items-center gap-3 text-center">
          <div className="flex size-15 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <svg
              className="size-10"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="12" cy="12" r="7" />
            </svg>
          </div>
          <DialogTitle className="text-base font-semibold">
            Plainly
          </DialogTitle>
          <DialogDescription>
            Простой редактор контента для статических сайтов. Меняйте тексты и
            фото прямо в браузере — изменения сохраняются на GitHub.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border">
          <Row
            label="Версия"
            value={<span className="text-sm">{version}</span>}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-sm">{value}</div>
    </div>
  );
}
