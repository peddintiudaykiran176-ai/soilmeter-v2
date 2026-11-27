import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";

export const userRoles = ["super_admin", "admin", "user"] as const;
export type UserRole = (typeof userRoles)[number];

export async function getCurrentSession() {
  return getAuth().api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login?next=%2Fdashboard");
  }
  return session;
}

export async function requireRole(...allowedRoles: UserRole[]) {
  const session = await requireSession();
  if (!allowedRoles.some((role) => role === session.user.role)) {
    redirect("/dashboard");
  }
  return session;
}

export function canViewUserProfile(
  actor: { id: string; role: string },
  owner: { id: string },
) {
  return actor.id === owner.id || actor.role === "super_admin";
}

export function canManageUser(
  actorRole: string,
  targetRole: string,
) {
  if (actorRole === "super_admin") return true;
  return actorRole === "admin" && targetRole === "user";
}

export function canAccessDeviceTelemetry(
  actor: { id: string; role: string },
  device: { ownerUserId: string; authorizedAdminIds: readonly string[] },
) {
  if (actor.role === "super_admin" || actor.id === device.ownerUserId) return true;
  return (
    actor.role === "admin" &&
    device.authorizedAdminIds.some((adminId) => adminId === actor.id)
  );
}

export function canAssignRole(actorRole: string, requestedRole: string) {
  return actorRole === "super_admin" && userRoles.some((role) => role === requestedRole);
}
