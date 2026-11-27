import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireSession } from "@/lib/auth/authorization";

export const metadata: Metadata = {
  title: "Dashboard | SoilMeter M1",
};

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f0fdf4] px-5 py-8 text-sm text-[#627d6b]">
          Loading your workspace…
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const session = await requireSession();

  return (
    <main className="min-h-screen bg-[#f0fdf4] px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="text-lg font-semibold tracking-tight text-[#14532d]">
            SoilMeter <span className="font-normal text-[#718074]">M1</span>
          </Link>
          <SignOutButton />
        </header>

        <section className="mt-12 rounded-3xl border border-[#dceee0] bg-white p-7 shadow-sm sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#16a34a]">
            Your workspace
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#102a43]">
            Welcome, {session.user.name}
          </h1>
          <p className="mt-2 text-sm text-[#627d6b]">
            Signed in as {session.user.email}
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#f0fdf4] p-5">
              <p className="text-sm font-semibold text-[#14532d]">Account status</p>
              <p className="mt-2 text-sm text-[#52715d]">
                Your email has been verified.
              </p>
            </div>
            <div className="rounded-2xl bg-[#f0fdf4] p-5">
              <p className="text-sm font-semibold text-[#14532d]">Access role</p>
              <p className="mt-2 text-sm capitalize text-[#52715d]">
                {session.user.role.replace("_", " ")}
              </p>
            </div>
          </div>

          {session.user.role === "admin" || session.user.role === "super_admin" ? (
            <Link
              href="/admin"
              className="mt-7 inline-flex rounded-xl bg-[#14532d] px-5 py-3 text-sm font-semibold text-white hover:bg-[#166534]"
            >
              Open administration
            </Link>
          ) : (
            <p className="mt-7 rounded-xl border border-[#e1ece3] px-4 py-3 text-sm text-[#718074]">
              Your device readings and telemetry will appear here when devices
              are assigned to your account.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
