"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/user-context";
import { Button } from "@/components/ui/button";

export function AdminButton() {
  const { user } = useUser();
  const router = useRouter();

  if (!user?.isAdmin) return null;

  // A button rather than a <Link>: prefetch={false} still prefetches on hover
  // in the App Router, and /admin is heavy enough (eleven queries) that
  // speculative loads of it were saturating the browser's connection pool.
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => router.push("/admin")}
    >
      Админ
    </Button>
  );
}
