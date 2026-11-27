export type Theme = "light" | "dark" | "system";

export type Telemetry = {
  id: string;
  deviceId: string;
  message: string;
  moisture: number | null;
  latitude: number | null;
  longitude: number | null;
  fieldName: string | null;
  createdAt: string | null;
};

export type Device = {
  deviceId: string;
  fieldName: string | null;
  cropType: string | null;
  latitude: number | null;
  longitude: number | null;
  moisture: number | null;
  message: string;
  createdAt: string | null;
  status: string | null;
};

export type Range = { start: string; end: string };

export type ChartPoint = Telemetry & { timestamp: number };
