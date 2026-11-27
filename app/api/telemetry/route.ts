import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  lt,
  or,
  type SQL,
} from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/index";
import { devices, soilTelemetry } from "@/db/schema";
import { auth } from "@/lib/auth";

const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
};
const MAX_PAGE_NUMBER = 10_000;
const MAX_DEVICE_ID_LENGTH = 128;
const MAX_MESSAGE_LENGTH = 2_000;
const MAX_PAGE_SIZE = 500;

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

function parseInstant(value: string | null): Date | null | undefined {
  if (value === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    return undefined;
  }
  if (parseUtcDate(value.slice(0, 10)) === undefined) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

function isValidLatitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180;
}

function isValidMoisture(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
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

function getTelemetryAccessCondition(userId: string): SQL {
  const registeredDeviceIds = db
    .select({ deviceId: devices.deviceId })
    .from(devices)
    .where(eq(devices.userId, userId));
  const condition = or(
    eq(soilTelemetry.userId, userId),
    and(
      isNull(soilTelemetry.userId),
      inArray(soilTelemetry.deviceId, registeredDeviceIds),
    ),
  );
  if (!condition) {
    throw new Error("Unable to establish telemetry access for this user.");
  }
  return condition;
}

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }
    const telemetryAccess = getTelemetryAccessCondition(session.user.id);

    const { searchParams } = new URL(request.url);
    if (searchParams.get("devices") === "1") {
      const [telemetryDevices, registeredDevices] = await Promise.all([
        db
          .selectDistinctOn([soilTelemetry.deviceId], {
            deviceId: soilTelemetry.deviceId,
            fieldName: soilTelemetry.fieldName,
            latitude: soilTelemetry.latitude,
            longitude: soilTelemetry.longitude,
            moisture: soilTelemetry.moisture,
            message: soilTelemetry.message,
            createdAt: soilTelemetry.createdAt,
          })
          .from(soilTelemetry)
          .where(telemetryAccess)
          .orderBy(
            soilTelemetry.deviceId,
            desc(soilTelemetry.createdAt),
            desc(soilTelemetry.id),
          ),
        db
          .select({
            deviceId: devices.deviceId,
            fieldName: devices.fieldName,
            cropType: devices.cropType,
            latitude: devices.latitude,
            longitude: devices.longitude,
            status: devices.status,
          })
          .from(devices)
          .where(eq(devices.userId, session.user.id)),
      ]);
      const registeredById = new Map(
        registeredDevices.map((device) => [device.deviceId, device]),
      );
      const telemetryDeviceIds = new Set(
        telemetryDevices.map((device) => device.deviceId),
      );
      return jsonResponse({
        devices: [
          ...telemetryDevices.map((device) => ({
            ...device,
            fieldName:
              registeredById.get(device.deviceId)?.fieldName ??
              device.fieldName ??
              null,
            cropType: registeredById.get(device.deviceId)?.cropType ?? null,
            latitude:
              device.latitude ??
              registeredById.get(device.deviceId)?.latitude ??
              null,
            longitude:
              device.longitude ??
              registeredById.get(device.deviceId)?.longitude ??
              null,
            status: registeredById.get(device.deviceId)?.status ?? null,
            createdAt: device.createdAt?.toISOString() ?? null,
          })),
          ...registeredDevices
            .filter((device) => !telemetryDeviceIds.has(device.deviceId))
            .map((device) => ({
              ...device,
              moisture: null,
              message: "",
              createdAt: null,
            })),
        ],
      });
    }

    const rawDeviceId = searchParams.get("device_id");
    const deviceId = rawDeviceId?.trim() || null;
    const startDate = parseUtcDate(searchParams.get("start_date"));
    const endDate = parseUtcDate(searchParams.get("end_date"));
    const startAt = parseInstant(searchParams.get("start_at"));
    const endAt = parseInstant(searchParams.get("end_at"));
    const page = parsePositiveInteger(
      searchParams.get("page"),
      1,
      MAX_PAGE_NUMBER,
    );
    const pageSize = parsePositiveInteger(
      searchParams.get("page_size"),
      10,
      MAX_PAGE_SIZE,
    );

    if (
      (rawDeviceId !== null &&
        (!deviceId || deviceId.length > MAX_DEVICE_ID_LENGTH)) ||
      startDate === undefined ||
      endDate === undefined ||
      startAt === undefined ||
      endAt === undefined ||
      (startAt !== null && startDate !== null) ||
      (endAt !== null && endDate !== null) ||
      (startDate !== null && endDate !== null && startDate > endDate) ||
      (startAt !== null && endAt !== null && startAt > endAt) ||
      page === null ||
      pageSize === null
    ) {
      return jsonResponse(
        {
          error:
            `Invalid filters. Use a device_id of 1–${MAX_DEVICE_ID_LENGTH} characters, valid UTC instants or YYYY-MM-DD dates in order, page 1–10000, and page_size 1–${MAX_PAGE_SIZE}.`,
        },
        400,
      );
    }

    const conditions: SQL[] = [telemetryAccess];
    if (deviceId) conditions.push(eq(soilTelemetry.deviceId, deviceId));
    if (startAt) {
      conditions.push(gte(soilTelemetry.createdAt, startAt));
    } else if (startDate) {
      conditions.push(gte(soilTelemetry.createdAt, new Date(startDate)));
    }
    if (endAt) {
      conditions.push(lte(soilTelemetry.createdAt, endAt));
    } else if (endDate) {
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

    const {
      device_id,
      message,
      moisture = null,
      latitude = null,
      longitude = null,
      field_name = null,
    } = body as {
      device_id?: unknown;
      message?: unknown;
      moisture?: unknown;
      latitude?: unknown;
      longitude?: unknown;
      field_name?: unknown;
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
      !isValidMoisture(moisture)
    ) {
      return jsonResponse(
        { success: false, error: "moisture must be between 0 and 100 or null." },
        400,
      );
    }
    const hasValidCoordinates =
      isValidLatitude(latitude) && isValidLongitude(longitude);
    const hasNoCoordinates = latitude === null && longitude === null;
    if (
      (!hasValidCoordinates && !hasNoCoordinates) ||
      (field_name !== null &&
        (typeof field_name !== "string" ||
          field_name.trim().length === 0 ||
          field_name.trim().length > 100))
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Provide both valid GPS coordinates (latitude -90 to 90, longitude -180 to 180) and an optional field_name up to 100 characters.",
        },
        400,
      );
    }
    const storedLatitude = hasValidCoordinates ? latitude : null;
    const storedLongitude = hasValidCoordinates ? longitude : null;

    const [row] = await db
      .insert(soilTelemetry)
      .values({
        userId: session.user.id,
        deviceId: device_id.trim(),
        message: message.trim(),
        moisture,
        latitude: storedLatitude,
        longitude: storedLongitude,
        fieldName: typeof field_name === "string" ? field_name.trim() : null,
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
