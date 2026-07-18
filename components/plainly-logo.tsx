import { cn } from "@/lib/utils";

export function PlainlyLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn("font-medium tracking-tight text-foreground", className)}
      style={{ fontFamily: "var(--font-space-grotesk)" }}
    >
      plainly
    </span>
  );
}
