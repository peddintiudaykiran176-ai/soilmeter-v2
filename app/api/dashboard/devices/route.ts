import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/index";
import { devices } from "@/db/schema";
import { getAuth } from "@/lib/auth";

const noStore = { "Cache-Control": "private, no-store" };

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: noStore });
}

function parseCoordinate(value: unknown): number | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value;
}

export async function POST(request: Request) {
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
      return response({ error: "Invalid device details." }, 400);
    }

    const { deviceId, fieldName, cropType, latitude, longitude } = body as {
      deviceId?: unknown;
      fieldName?: unknown;
      cropType?: unknown;
      latitude?: unknown;
      longitude?: unknown;
    };
    const normalizedDeviceId =
      typeof deviceId === "string" ? deviceId.trim() : "";
    const normalizedFieldName =
      typeof fieldName === "string" ? fieldName.trim() : "";
    const normalizedCropType =
      typeof cropType === "string" ? cropType.trim() : "";
    const parsedLatitude = parseCoordinate(latitude);
    const parsedLongitude = parseCoordinate(longitude);

    if (
      normalizedDeviceId.length < 2 ||
      normalizedDeviceId.length > 128 ||
      normalizedFieldName.length < 2 ||
      normalizedFieldName.length > 120 ||
      normalizedCropType.length < 1 ||
      normalizedCropType.length > 80
    ) {
      return response(
        { error: "Enter a device ID (2–128 characters), field name (2–120 characters), and crop type (1–80 characters)." },
        400,
      );
    }
    if (
      parsedLatitude === undefined ||
      parsedLongitude === undefined ||
      parsedLatitude === null ||
      parsedLongitude === null ||
      (parsedLatitude !== null &&
        (parsedLatitude < -90 || parsedLatitude > 90)) ||
      (parsedLongitude !== null &&
        (parsedLongitude < -180 || parsedLongitude > 180))
    ) {
      return response(
        { error: "Valid latitude and longitude are required." },
        400,
      );
    }

    const values = {
      userId: session.user.id,
      deviceId: normalizedDeviceId,
      fieldName: normalizedFieldName,
      cropType: normalizedCropType,
      latitude: parsedLatitude,
      longitude: parsedLongitude,
    };
    const [createdDevice] = await db
      .insert(devices)
      .values({
        ...values,
      })
      .onConflictDoNothing({
        target: devices.deviceId,
      })
      .returning();
    if (createdDevice) return response({ device: createdDevice }, 201);

    const [existingDevice] = await db
      .select({ id: devices.id, userId: devices.userId })
      .from(devices)
      .where(eq(devices.deviceId, normalizedDeviceId))
      .limit(1);
    if (!existingDevice) {
      throw new Error("Device conflict was reported but no existing device was found.");
    }
    if (existingDevice.userId !== session.user.id) {
      return response({ error: "This device ID is already registered." }, 409);
    }

    const [updatedDevice] = await db
      .update(devices)
      .set({ ...values, updatedAt: new Date() })
      .where(
        and(eq(devices.id, existingDevice.id), eq(devices.userId, session.user.id)),
      )
      .returning();
    if (!updatedDevice) {
      throw new Error("The existing device could not be updated.");
    }

    return response({ device: updatedDevice });
  } catch (error) {
    console.error("DASHBOARD DEVICE REGISTRATION ERROR:", error);
    return response({ error: "Unable to add this device." }, 500);
  }
}
