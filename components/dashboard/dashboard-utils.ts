import type { Telemetry, Theme, Range } from "./dashboard-types";

export const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Colombo",
  "UTC",
  "Asia/Dubai",
  "Europe/London",
  "America/New_York",
] as const;

export type UploadMode = "manual" | "automatic" | "other";

export function isTheme(value: string): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

export function getUploadMode(message: string): UploadMode {
  const normalizedMessage = message.trim().toLowerCase();
  if (normalizedMessage.startsWith("manual button upload")) return "manual";
  if (normalizedMessage.startsWith("automatic scheduled upload")) return "automatic";
  return "other";
}

export function formatTimestamp(value: string | null, timezone: string): string {
  if (!value) return "No reading timestamp";
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    timeZoneName: "short",
  }).format(new Date(value));
}

export function localDefaultRange(duration: number): Range {
  const end = new Date();
  return {
    start: new Date(end.getTime() - duration).toISOString(),
    end: end.toISOString(),
  };
}

export function validateTelemetryResponse(value: unknown): value is {
  data: Telemetry[];
  pagination: { total: number; totalPages: number };
} {
  if (!value || typeof value !== "object") return false;
  const payload = value as { data?: unknown; pagination?: unknown };
  if (
    !Array.isArray(payload.data) ||
    !payload.pagination ||
    typeof payload.pagination !== "object"
  ) {
    return false;
  }
  const pagination = payload.pagination as {
    total?: unknown;
    totalPages?: unknown;
  };
  return (
    Number.isSafeInteger(pagination.total) &&
    Number.isSafeInteger(pagination.totalPages) &&
    payload.data.every(
      (row) =>
        row &&
        typeof row === "object" &&
        typeof row.id === "string" &&
        typeof row.deviceId === "string" &&
        typeof row.message === "string" &&
        (typeof row.createdAt === "string" || row.createdAt === null) &&
        (typeof row.moisture === "number" || row.moisture === null),
    )
  );
}

export function formatAxisTime(timestamp: number, timezone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}
