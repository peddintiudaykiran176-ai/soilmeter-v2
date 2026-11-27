import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/index";
import { dashboardPreferences } from "@/db/schema";
import { getAuth } from "@/lib/auth";

const noStore = { "Cache-Control": "private, no-store" };
const themes = ["light", "dark", "system"] as const;

function isTheme(value: unknown): value is (typeof themes)[number] {
  return typeof value === "string" && themes.some((theme) => theme === value);
}

function isTimezone(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 100) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: noStore });
}

export async function GET(request: Request) {
  try {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session) return response({ error: "Authentication required" }, 401);

    const [preferences] = await db
      .select({
        timezone: dashboardPreferences.timezone,
        theme: dashboardPreferences.theme,
      })
      .from(dashboardPreferences)
      .where(eq(dashboardPreferences.userId, session.user.id))
      .limit(1);

    return response(preferences ?? { timezone: null, theme: "system" });
  } catch (error) {
    console.error("DASHBOARD PREFERENCES QUERY ERROR:", error);
    return response({ error: "Unable to load dashboard preferences." }, 500);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session) return response({ error: "Authentication required" }, 401);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return response({ error: "Invalid JSON body." }, 400);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return response({ error: "Invalid preferences." }, 400);
    }

    const { timezone, theme } = body as {
      timezone?: unknown;
      theme?: unknown;
    };
    if (
      !isTimezone(timezone) ||
      !isTheme(theme)
    ) {
      return response({ error: "Choose a valid IANA timezone and theme." }, 400);
    }

    const [preferences] = await db
      .insert(dashboardPreferences)
      .values({
        userId: session.user.id,
        timezone,
        theme,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: dashboardPreferences.userId,
        set: { timezone, theme, updatedAt: new Date() },
      })
      .returning({
        timezone: dashboardPreferences.timezone,
        theme: dashboardPreferences.theme,
      });

    return response(preferences);
  } catch (error) {
    console.error("DASHBOARD PREFERENCES UPDATE ERROR:", error);
    return response({ error: "Unable to save dashboard preferences." }, 500);
  }
}
