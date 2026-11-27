import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/index";
import { user as userTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { canAssignRole, canManageUser } from "@/lib/auth/authorization";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }
  if (session.user.role !== "admin" && session.user.role !== "super_admin") {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  const columns = {
    id: userTable.id,
    name: userTable.name,
    email: userTable.email,
    emailVerified: userTable.emailVerified,
    role: userTable.role,
  };
  const users =
    session.user.role === "super_admin"
      ? await db.select(columns).from(userTable).limit(100)
      : await db
          .select(columns)
          .from(userTable)
          .where(eq(userTable.role, "user"))
          .limit(100);

  return Response.json({
    users: users.filter((user) => canManageUser(session.user.role, user.role)),
  });
}

export async function PATCH(request: Request) {
  const expectedOrigin = process.env.BETTER_AUTH_URL
    ? new URL(process.env.BETTER_AUTH_URL).origin
    : null;
  if (!expectedOrigin || request.headers.get("origin") !== expectedOrigin) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }
  if (session.user.role !== "super_admin") {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("role" in body) ||
    typeof body.role !== "string"
  ) {
    return Response.json({ error: "A valid role is required." }, { status: 400 });
  }

  const roles = ["super_admin", "admin", "user"] as const;
  const requestedRole = roles.find((role) => role === body.role);
  if (
    !requestedRole ||
    !("userId" in body) ||
    typeof body.userId !== "string" ||
    body.userId.length === 0 ||
    body.userId.length > 128
  ) {
    return Response.json({ error: "A valid user and role are required." }, { status: 400 });
  }
  if (!canAssignRole(session.user.role, requestedRole)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }
  if (body.userId === session.user.id) {
    return Response.json({ error: "You cannot change your own role." }, { status: 403 });
  }

  const [target] = await db
    .select({ id: userTable.id, role: userTable.role })
    .from(userTable)
    .where(eq(userTable.id, body.userId))
    .limit(1);

  if (!target) {
    return Response.json({ error: "User not found." }, { status: 404 });
  }
  if (!canManageUser(session.user.role, target.role)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  await db
    .update(userTable)
    .set({ role: requestedRole })
    .where(eq(userTable.id, target.id));

  return Response.json({ success: true });
}
