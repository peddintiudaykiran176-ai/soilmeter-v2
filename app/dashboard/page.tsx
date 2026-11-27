import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import "./dashboard.css";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { db } from "@/index";
import { dashboardPreferences } from "@/db/schema";
import { requireSession } from "@/lib/auth/authorization";
import { eq } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Dashboard | SoilMeter M1",
};

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="dashboard-shell" data-theme="system">
          <div className="dashboard-container" role="status">
            Loading your workspace…
          </div>
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  await connection();
  const session = await requireSession();
  const [preferences] = await db
    .select({
      timezone: dashboardPreferences.timezone,
      theme: dashboardPreferences.theme,
    })
    .from(dashboardPreferences)
    .where(eq(dashboardPreferences.userId, session.user.id))
    .limit(1);

  return (
    <DashboardClient
      user={{ id: session.user.id, name: session.user.name, email: session.user.email, role: session.user.role }}
      initialPreferences={{
        timezone: preferences?.timezone ?? null,
        theme: preferences?.theme ?? "system",
      }}
      adminLink={
        session.user.role === "admin" || session.user.role === "super_admin" ? (
          <Link href="/admin" className="dashboard-button-primary">
            Open administration
          </Link>
        ) : null
      }
      signOut={<SignOutButton />}
    />
  );
}
