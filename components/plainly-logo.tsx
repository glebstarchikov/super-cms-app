import { cn } from "@/lib/utils";

export function PlainlyLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn("font-medium tracking-tight text-foreground", className)}
      style={{ fontFamily: "var(--font-space-grotesk)" }}
    >
      plainly
      <span
        aria-hidden="true"
        className="ml-[0.1em] inline-block rounded-full bg-primary align-baseline"
        style={{ width: "0.3em", height: "0.3em" }}
      />
    </span>
  );
}
