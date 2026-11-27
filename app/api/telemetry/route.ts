import { and, count, desc, eq, gte, lt, type SQL } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/index";
import { soilTelemetry } from "@/db/schema";
import { auth } from "@/lib/auth";

const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
};
const MAX_PAGE_NUMBER = 10_000;
const MAX_DEVICE_ID_LENGTH = 50;
const MAX_MESSAGE_LENGTH = 2_000;

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: PRIVATE_NO_STORE_HEADERS,
  });
}

function parsePositiveInteger(
  value: string | null,
  defaultValue: number,
  maximum: number,
): number | null {
  if (value === null) return defaultValue;
  if (!/^[1-9]\d*$/.test(value)) return null;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= maximum ? parsed : null;
}

function parseUtcDate(value: string | null): string | null | undefined {
  if (value === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;

  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return undefined;
  }

  return date.toISOString();
}

function serializeTelemetry(row: typeof soilTelemetry.$inferSelect) {
  return {
    ...row,
    id: row.id.toString(),
    createdAt: row.createdAt?.toISOString() ?? null,
  };
}

async function getSession(request: Request) {
  return auth.api.getSession({ headers: request.headers });
}

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }

    const { searchParams } = new URL(request.url);
    const rawDeviceId = searchParams.get("device_id");
    const deviceId = rawDeviceId?.trim() || null;
    const startDate = parseUtcDate(searchParams.get("start_date"));
    const endDate = parseUtcDate(searchParams.get("end_date"));
    const page = parsePositiveInteger(
      searchParams.get("page"),
      1,
      MAX_PAGE_NUMBER,
    );
    const pageSize = parsePositiveInteger(searchParams.get("page_size"), 10, 100);

    if (
      (rawDeviceId !== null &&
        (!deviceId || deviceId.length > MAX_DEVICE_ID_LENGTH)) ||
      startDate === undefined ||
      endDate === undefined ||
      (startDate !== null && endDate !== null && startDate > endDate) ||
      page === null ||
      pageSize === null
    ) {
      return jsonResponse(
        {
          error:
            "Invalid filters. Use a device_id of 1–50 characters, valid YYYY-MM-DD dates in order, page 1–10000, and page_size 1–100.",
        },
        400,
      );
    }

    const conditions: SQL[] = [eq(soilTelemetry.userId, session.user.id)];
    if (deviceId) conditions.push(eq(soilTelemetry.deviceId, deviceId));
    if (startDate) {
      conditions.push(gte(soilTelemetry.createdAt, new Date(startDate)));
    }
    if (endDate) {
      const endDateExclusive = new Date(endDate);
      endDateExclusive.setUTCDate(endDateExclusive.getUTCDate() + 1);
      conditions.push(lt(soilTelemetry.createdAt, endDateExclusive));
    }
    const where = and(...conditions);
    const offset = (page - 1) * pageSize;

    const [rows, [totalResult]] = await Promise.all([
      db
        .select()
        .from(soilTelemetry)
        .where(where)
        .orderBy(desc(soilTelemetry.createdAt), desc(soilTelemetry.id))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: count() })
        .from(soilTelemetry)
        .where(where),
    ]);

    return jsonResponse({
      data: rows.map(serializeTelemetry),
      pagination: {
        page,
        pageSize,
        total: totalResult.total,
        totalPages: Math.ceil(totalResult.total / pageSize),
      },
    });
  } catch (error) {
    console.error("TELEMETRY HISTORY QUERY ERROR:", error);
    return jsonResponse({ error: "Unable to fetch telemetry history" }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return jsonResponse(
        { success: false, error: "Authentication required" },
        401,
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: "Invalid JSON body." }, 400);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonResponse(
        { success: false, error: "Invalid request body." },
        400,
      );
    }

    const { device_id, message, moisture = null } = body as {
      device_id?: unknown;
      message?: unknown;
      moisture?: unknown;
    };
    if (
      typeof device_id !== "string" ||
      typeof message !== "string" ||
      !device_id.trim() ||
      device_id.trim().length > MAX_DEVICE_ID_LENGTH ||
      !message.trim() ||
      message.length > MAX_MESSAGE_LENGTH
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "device_id must be 1–50 characters and message must be 1–2000 characters.",
        },
        400,
      );
    }
    if (
      moisture !== null &&
      (typeof moisture !== "number" || !Number.isFinite(moisture))
    ) {
      return jsonResponse(
        { success: false, error: "moisture must be a finite number or null." },
        400,
      );
    }

    const [row] = await db
      .insert(soilTelemetry)
      .values({
        userId: session.user.id,
        deviceId: device_id.trim(),
        message: message.trim(),
        moisture,
      })
      .returning();

    return jsonResponse(
      {
        success: true,
        message: "Data saved successfully",
        data: serializeTelemetry(row),
      },
      201,
    );
  } catch (error) {
    console.error("TELEMETRY INSERT ERROR:", error);
    return jsonResponse(
      { success: false, error: "Unable to save telemetry data." },
      500,
    );
  }
}
