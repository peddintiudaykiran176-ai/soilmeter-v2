"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export function HomeAuthLink() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <span
        aria-label="Checking sign-in status"
        className="size-10 animate-pulse rounded-full bg-[#dce7d7]"
      />
    );
  }

  if (!session) {
    return (
      <Link
        href="/login"
        className="rounded-full bg-[#1f513b] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#163e2d]"
      >
        Sign in
      </Link>
    );
  }

  const initial =
    session.user.name.trim().charAt(0) || session.user.email.charAt(0) || "U";

  return (
    <Link
      href="/dashboard"
      aria-label={`Open ${session.user.name || "your"} profile`}
      title={session.user.name || session.user.email}
      className="flex size-10 items-center justify-center rounded-full bg-[#1f513b] text-sm font-semibold uppercase text-white transition-colors hover:bg-[#163e2d]"
    >
      {initial.toUpperCase()}
    </Link>
  );
}
