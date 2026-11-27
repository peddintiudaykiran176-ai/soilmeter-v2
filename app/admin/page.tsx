import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { AdminUserList } from "@/components/auth/admin-user-list";
import { requireRole } from "@/lib/auth/authorization";

export const metadata: Metadata = {
  title: "Administration | SoilMeter M1",
};

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f0fdf4] px-5 py-8 text-sm text-[#627d6b]">
          Loading administration…
        </main>
      }
    >
      <AdminContent />
    </Suspense>
  );
}

async function AdminContent() {
  const session = await requireRole("admin", "super_admin");

  return (
    <main className="min-h-screen bg-[#f0fdf4] px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight text-[#14532d]">
            SoilMeter <span className="font-normal text-[#718074]">M1</span>
          </Link>
          <SignOutButton />
        </header>
        <section className="mt-12 rounded-3xl border border-[#dceee0] bg-white p-7 shadow-sm sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#16a34a]">
            {session.user.role.replace("_", " ")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#102a43]">
            Administration
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-[#627d6b]">
            This route is protected by a server-validated session and role
            check. Administrators can manage regular user accounts; only
            super admins can assign administrator roles.
          </p>
          <AdminUserList
            canChangeRoles={session.user.role === "super_admin"}
            currentUserId={session.user.id}
          />
        </section>
      </div>
    </main>
  );
}
