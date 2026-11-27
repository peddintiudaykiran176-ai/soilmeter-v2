"use client";

import dynamic from "next/dynamic";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { fromLocalDateTime, toLocalDateTime } from "@/lib/dashboard-time";

const LocationMap = dynamic(
  () => import("./location-map").then((module) => module.LocationMap),
  { ssr: false, loading: () => <div className="map-loading">Loading Google Maps…</div> },
);

const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Colombo",
  "UTC",
  "Asia/Dubai",
  "Europe/London",
  "America/New_York",
] as const;
const QUICK_RANGES = [
  { label: "1 hour", milliseconds: 60 * 60 * 1000 },
  { label: "6 hours", milliseconds: 6 * 60 * 60 * 1000 },
  { label: "12 hours", milliseconds: 12 * 60 * 60 * 1000 },
  { label: "24 hours", milliseconds: 24 * 60 * 60 * 1000 },
  { label: "7 days", milliseconds: 7 * 24 * 60 * 60 * 1000 },
  { label: "30 days", milliseconds: 30 * 24 * 60 * 60 * 1000 },
] as const;

type Theme = "light" | "dark" | "system";
type Telemetry = {
  id: string;
  deviceId: string;
  message: string;
  moisture: number | null;
  latitude: number | null;
  longitude: number | null;
  fieldName: string | null;
  createdAt: string | null;
};
type Device = {
  deviceId: string;
  fieldName: string | null;
  latitude: number | null;
  longitude: number | null;
  moisture: number | null;
  message: string;
  createdAt: string | null;
};
type Range = { start: string; end: string };
type ChartPoint = Telemetry & { timestamp: number };

function isTheme(value: string): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function formatTimestamp(value: string | null, timezone: string): string {
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

function localDefaultRange(duration: number): Range {
  const end = new Date();
  return {
    start: new Date(end.getTime() - duration).toISOString(),
    end: end.toISOString(),
  };
}

function validateTelemetryResponse(value: unknown): value is {
  data: Telemetry[];
  pagination: { total: number; totalPages: number };
} {
  if (!value || typeof value !== "object") return false;
  const payload = value as { data?: unknown; pagination?: unknown };
  if (!Array.isArray(payload.data) || !payload.pagination || typeof payload.pagination !== "object") {
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
      (typeof row.createdAt === "string" || row.createdAt === null) &&
      (typeof row.moisture === "number" || row.moisture === null) &&
      (typeof row.latitude === "number" || row.latitude === null) &&
      (typeof row.longitude === "number" || row.longitude === null) &&
      (typeof row.fieldName === "string" || row.fieldName === null),
    )
  );
}

function formatAxisTime(timestamp: number, timezone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function ChartTooltip({
  active,
  payload,
  timezone,
}: {
  active?: boolean;
  payload?: Array<{ payload?: ChartPoint }>;
  timezone: string;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="chart-tooltip">
      <strong>{formatTimestamp(point.createdAt, timezone)}</strong>
      <span>{point.moisture ?? "—"}% moisture</span>
      <span>Reading #{point.id}</span>
    </div>
  );
}

function DateTimeInputs({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [date = "", time = ""] = value.split("T");
  return (
    <fieldset className="range-field">
      <legend>{label}</legend>
      <label>
        <span>Date</span>
        <input
          type="date"
          value={date}
          onChange={(event) => onChange(`${event.target.value}T${time || "00:00"}`)}
        />
      </label>
      <label>
        <span>Time</span>
        <input
          type="time"
          value={time}
          onChange={(event) => onChange(`${date}T${event.target.value}`)}
        />
      </label>
    </fieldset>
  );
}

export function DashboardClient({
  user,
  initialPreferences,
  adminLink,
  signOut,
}: {
  user: { id: string; name: string; email: string; role: string };
  initialPreferences: { timezone: string | null; theme: string };
  adminLink: ReactNode;
  signOut: ReactNode;
}) {
  const [timezone, setTimezone] = useState(initialPreferences.timezone ?? "UTC");
  const [theme, setTheme] = useState<Theme>(
    isTheme(initialPreferences.theme) ? initialPreferences.theme : "system",
  );
  const [preferenceError, setPreferenceError] = useState("");
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [readings, setReadings] = useState<Telemetry[]>([]);
  const [totalReadings, setTotalReadings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [automatic, setAutomatic] = useState(true);
  const [selectedRange, setSelectedRange] = useState<Range>(() =>
    localDefaultRange(24 * 60 * 60 * 1000),
  );
  const [draftStart, setDraftStart] = useState("");
  const [draftEnd, setDraftEnd] = useState("");
  const themeRef = useRef(theme);

  const persistPreferences = useCallback(
    async (nextTimezone: string, nextTheme: Theme) => {
      setPreferenceError("");
      try {
        const response = await fetch("/api/dashboard/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timezone: nextTimezone, theme: nextTheme }),
        });
        if (!response.ok) throw new Error("Unable to save dashboard preferences.");
      } catch {
        setPreferenceError("Your preference could not be saved. Try again.");
      }
    },
    [],
  );

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    if (!initialPreferences.timezone) {
      const timeout = window.setTimeout(() => {
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        setTimezone(detected);
        void persistPreferences(detected, themeRef.current);
      }, 0);
      return () => window.clearTimeout(timeout);
    }
  }, [initialPreferences.timezone, persistPreferences]);

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>(".dashboard-shell");
    if (shell) shell.dataset.theme = theme;
  }, [theme]);

  const timezoneOptions = useMemo(() => {
    if (TIMEZONES.includes(timezone as (typeof TIMEZONES)[number])) return TIMEZONES;
    return [timezone, ...TIMEZONES];
  }, [timezone]);

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setApiError("");
      try {
        const devicesResponse = await fetch("/api/telemetry?devices=1", {
          cache: "no-store",
          signal,
        });
        if (!devicesResponse.ok) {
          throw new Error(
            devicesResponse.status === 401
              ? "Your session expired. Sign in again to view telemetry."
              : "Unable to load devices.",
          );
        }
        const devicesPayload: unknown = await devicesResponse.json();
        if (
          !devicesPayload ||
          typeof devicesPayload !== "object" ||
          !Array.isArray((devicesPayload as { devices?: unknown }).devices)
        ) {
          throw new Error("The device list returned an unexpected response.");
        }
        const nextDevices = (devicesPayload as { devices: Device[] }).devices;
        setDevices(nextDevices);

        const resolvedDeviceId = nextDevices.some((device) => device.deviceId === selectedDeviceId)
          ? selectedDeviceId
          : nextDevices[0]?.deviceId ?? "";
        if (resolvedDeviceId !== selectedDeviceId) {
          setSelectedDeviceId(resolvedDeviceId);
        }
        if (!resolvedDeviceId) {
          setReadings([]);
          setTotalReadings(0);
          setLoading(false);
          return;
        }

        const range = automatic
          ? localDefaultRange(24 * 60 * 60 * 1000)
          : selectedRange;
        const params = new URLSearchParams({
          device_id: resolvedDeviceId,
          start_at: range.start,
          end_at: range.end,
          page: "1",
          page_size: "500",
        });
        const firstResponse = await fetch(`/api/telemetry?${params}`, {
          cache: "no-store",
          signal,
        });
        if (!firstResponse.ok) {
          throw new Error(
            firstResponse.status === 401
              ? "Your session expired. Sign in again to view telemetry."
              : "Unable to load telemetry readings.",
          );
        }
        const firstPayload: unknown = await firstResponse.json();
        if (!validateTelemetryResponse(firstPayload)) {
          throw new Error("Telemetry returned an unexpected response.");
        }

        const allReadings = [...firstPayload.data];
        const totalPages = firstPayload.pagination.totalPages;
        for (let page = 2; page <= totalPages; page += 1) {
          const nextParams = new URLSearchParams(params);
          nextParams.set("page", String(page));
          const pageResponse = await fetch(`/api/telemetry?${nextParams}`, {
            cache: "no-store",
            signal,
          });
          if (!pageResponse.ok) throw new Error("Unable to load all readings.");
          const pagePayload: unknown = await pageResponse.json();
          if (!validateTelemetryResponse(pagePayload)) {
            throw new Error("Telemetry returned an unexpected response.");
          }
          allReadings.push(...pagePayload.data);
        }

        allReadings.sort((left, right) => {
          const leftTime = left.createdAt ? Date.parse(left.createdAt) : 0;
          const rightTime = right.createdAt ? Date.parse(right.createdAt) : 0;
          return leftTime - rightTime || left.id.localeCompare(right.id);
        });
        setReadings(allReadings);
        setTotalReadings(firstPayload.pagination.total);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setApiError(error instanceof Error ? error.message : "Unable to load telemetry.");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [automatic, selectedDeviceId, selectedRange],
  );

  useEffect(() => {
    const controller = new AbortController();
    const initialRefresh = window.setTimeout(
      () => void refresh(controller.signal),
      0,
    );
    if (automatic) {
      const interval = window.setInterval(() => {
        void refresh();
      }, 20_000);
      return () => {
        window.clearTimeout(initialRefresh);
        controller.abort();
        window.clearInterval(interval);
      };
    }
    return () => {
      window.clearTimeout(initialRefresh);
      controller.abort();
    };
  }, [automatic, refresh]);

  const selectedDevice =
    devices.find((device) => device.deviceId === selectedDeviceId) ?? null;
  const points = useMemo<ChartPoint[]>(
    () =>
      readings.flatMap((reading) =>
        reading.createdAt && typeof reading.moisture === "number"
          ? [{ ...reading, timestamp: Date.parse(reading.createdAt) }]
          : [],
      ),
    [readings],
  );
  const moistureValues = points.map((point) => point.moisture as number);
  const latestReading = points.at(-1) ?? null;
  const minimum = moistureValues.length ? Math.min(...moistureValues) : null;
  const maximum = moistureValues.length ? Math.max(...moistureValues) : null;

  function changeTimezone(value: string) {
    if (!automatic) {
      const start = fromLocalDateTime(draftStart, timezone);
      const end = fromLocalDateTime(draftEnd, timezone);
      if (start) setDraftStart(toLocalDateTime(new Date(start), value));
      if (end) setDraftEnd(toLocalDateTime(new Date(end), value));
    }
    setTimezone(value);
    void persistPreferences(value, theme);
  }

  function changeTheme(value: string) {
    if (!isTheme(value)) return;
    setTheme(value);
    void persistPreferences(timezone, value);
  }

  function startManualMode() {
    const range = localDefaultRange(60 * 60 * 1000);
    setSelectedRange(range);
    setDraftStart(toLocalDateTime(new Date(range.start), timezone));
    setDraftEnd(toLocalDateTime(new Date(range.end), timezone));
    setAutomatic(false);
  }

  function setQuickRange(milliseconds: number) {
    const range = localDefaultRange(milliseconds);
    setSelectedRange(range);
    setDraftStart(toLocalDateTime(new Date(range.start), timezone));
    setDraftEnd(toLocalDateTime(new Date(range.end), timezone));
    setAutomatic(false);
  }

  function applyManualRange() {
    const start = fromLocalDateTime(draftStart, timezone);
    const end = fromLocalDateTime(draftEnd, timezone);
    if (!start || !end || start > end) {
      setApiError("Choose a valid date and time range in the selected timezone.");
      return;
    }
    setApiError("");
    setSelectedRange({ start, end });
  }

  function resetRange() {
    setAutomatic(true);
    setApiError("");
  }

  const chartColor = "var(--dash-accent)";

  return (
    <main className="dashboard-shell" data-theme={theme}>
      <div className="dashboard-container">
        <header className="dashboard-header">
          <Link href="/" className="dashboard-brand">
            SoilMeter <span>M1</span>
          </Link>
          <div className="dashboard-header-right">
            <div className="desktop-settings">
              <label className="header-select-label">
                Timezone
                <select value={timezone} onChange={(event) => changeTimezone(event.target.value)}>
                  {timezoneOptions.map((zone) => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                </select>
              </label>
              <label className="header-select-label">
                Theme
                <select value={theme} onChange={(event) => changeTheme(event.target.value)}>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </label>
            </div>
            <details className="mobile-settings">
              <summary>Settings</summary>
              <div className="mobile-settings-menu">
                <label className="header-select-label">
                  Timezone
                  <select value={timezone} onChange={(event) => changeTimezone(event.target.value)}>
                    {timezoneOptions.map((zone) => (
                      <option key={zone} value={zone}>{zone}</option>
                    ))}
                  </select>
                </label>
                <label className="header-select-label">
                  Theme
                  <select value={theme} onChange={(event) => changeTheme(event.target.value)}>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </label>
              </div>
            </details>
            <div className="account-controls">
              <span className="account-name">{user.name}</span>
              {signOut}
            </div>
          </div>
        </header>

        {preferenceError && <p className="inline-error" role="alert">{preferenceError}</p>}

        <section className="dashboard-welcome">
          <div>
            <p className="eyebrow">Your workspace</p>
            <h1>Welcome, {user.name}</h1>
            <p>{user.email} · {user.role.replace("_", " ")}</p>
          </div>
          {adminLink}
        </section>

        <section className="dashboard-top-grid">
          <article className="dashboard-card chart-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">Soil moisture</p>
                <h2>Reading history</h2>
                <p className="muted-copy">Individual readings · {timezone}</p>
              </div>
              <label className="device-select-label">
                Device
                <select
                  value={selectedDeviceId}
                  onChange={(event) => {
                    setSelectedDeviceId(event.target.value);
                    setAutomatic(true);
                  }}
                  disabled={!devices.length}
                >
                  {!devices.length && <option value="">No devices</option>}
                  {devices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>{device.deviceId}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="time-controls">
              <div className="mode-buttons" role="group" aria-label="Graph time mode">
                <button type="button" className={automatic ? "is-selected" : ""} onClick={resetRange}>
                  Automatic
                </button>
                <button type="button" className={!automatic ? "is-selected" : ""} onClick={startManualMode}>
                  Manual range
                </button>
              </div>
              {!automatic && (
                <div className="manual-controls">
                  <div className="quick-ranges">
                    {QUICK_RANGES.map((range) => (
                      <button key={range.label} type="button" onClick={() => setQuickRange(range.milliseconds)}>
                        Last {range.label}
                      </button>
                    ))}
                  </div>
                  <div className="range-inputs">
                    <DateTimeInputs label="Start" value={draftStart} onChange={setDraftStart} />
                    <DateTimeInputs label="End" value={draftEnd} onChange={setDraftEnd} />
                    <div className="range-actions">
                      <button type="button" className="primary-button" onClick={applyManualRange}>Apply</button>
                      <button type="button" className="secondary-button" onClick={resetRange}>Reset</button>
                    </div>
                  </div>
                </div>
              )}
              {automatic && <p className="refresh-note">Showing the last 24 hours · refreshes every 20 seconds</p>}
            </div>

            {apiError && <p className="inline-error" role="alert">{apiError}</p>}
            {loading ? (
              <div className="chart-state" role="status">Loading telemetry…</div>
            ) : devices.length === 0 ? (
              <div className="chart-state">
                <strong>No device readings yet</strong>
                <span>Authenticated device uploads will appear here.</span>
              </div>
            ) : points.length === 0 ? (
              <div className="chart-state">
                <strong>No readings in this period</strong>
                <span>Try a wider time range or check again after the next device upload.</span>
              </div>
            ) : (
              <div className="chart-frame">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 16, right: 16, bottom: 8, left: -12 }}>
                    <CartesianGrid stroke="var(--dash-grid)" strokeDasharray="4 4" />
                    <XAxis
                      type="number"
                      dataKey="timestamp"
                      domain={["dataMin", "dataMax"]}
                      tickFormatter={(value: number) => formatAxisTime(value, timezone)}
                      tick={{ fill: "var(--dash-muted)", fontSize: 11 }}
                      axisLine={{ stroke: "var(--dash-border)" }}
                      tickLine={false}
                      minTickGap={32}
                    />
                    <YAxis
                      type="number"
                      dataKey="moisture"
                      domain={[0, 100]}
                      tickFormatter={(value: number) => `${value}%`}
                      tick={{ fill: "var(--dash-muted)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={<ChartTooltip timezone={timezone} />}
                      cursor={{ stroke: "var(--dash-muted)", strokeDasharray: "4 4" }}
                    />
                    <Scatter
                      name="Actual readings"
                      data={points}
                      fill={chartColor}
                      shape="circle"
                      isAnimationActive={false}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="chart-summary">
              <span><strong>{totalReadings}</strong> readings in period</span>
              <span>Min <strong>{minimum === null ? "—" : `${minimum}%`}</strong></span>
              <span>Max <strong>{maximum === null ? "—" : `${maximum}%`}</strong></span>
              <span>Latest <strong>{latestReading?.moisture == null ? "—" : `${latestReading.moisture}%`}</strong></span>
            </div>
          </article>

          <div className="right-stack">
            <article className="dashboard-card gauge-card">
              <div>
                <p className="eyebrow">Current moisture</p>
                <h2>{selectedDevice?.deviceId ?? "No device selected"}</h2>
              </div>
              {selectedDevice?.moisture == null ? (
                <div className="gauge-empty">No moisture reading available</div>
              ) : (
                <div
                  className="moisture-gauge"
                  style={{
                    background: `conic-gradient(var(--dash-accent) 0 ${Math.max(0, Math.min(100, selectedDevice.moisture))}%, var(--dash-border) ${Math.max(0, Math.min(100, selectedDevice.moisture))}% 100%)`,
                  }}
                  aria-label={`Current moisture ${selectedDevice.moisture}%`}
                >
                  <div>
                    <strong>{selectedDevice.moisture}</strong>
                    <span>% moisture</span>
                  </div>
                </div>
              )}
              <p className="muted-copy">
                Last reading: {formatTimestamp(selectedDevice?.createdAt ?? null, timezone)}
              </p>
            </article>

            <article className="dashboard-card location-card">
              <div className="card-heading compact-heading">
                <div>
                  <p className="eyebrow">Device location</p>
                  <h2>{selectedDevice?.fieldName || "Field details"}</h2>
                </div>
                {selectedDevice && (
                  <span className="device-pill">{selectedDevice.deviceId}</span>
                )}
              </div>
              <LocationMap
                theme={theme}
                device={selectedDevice ? {
                  deviceId: selectedDevice.deviceId,
                  fieldName: selectedDevice.fieldName,
                  latitude: selectedDevice.latitude,
                  longitude: selectedDevice.longitude,
                } : null}
              />
              <div className="metadata-row">
                <span>Crop information</span>
                <strong>Not provided by telemetry</strong>
              </div>
            </article>
          </div>
        </section>

        <section className="dashboard-bottom-grid">
          <article className="dashboard-card activity-card">
            <div className="card-heading compact-heading">
              <div>
                <p className="eyebrow">Recent activity</p>
                <h2>Latest uploads</h2>
              </div>
              <span className="device-pill">{totalReadings} in range</span>
            </div>
            {latestReading ? (
              <div className="activity-reading">
                <span className="activity-dot" aria-hidden="true" />
                <div>
                  <strong>{latestReading.deviceId}</strong>
                  <p>{latestReading.message}</p>
                </div>
                <time dateTime={latestReading.createdAt ?? undefined}>
                  {formatTimestamp(latestReading.createdAt, timezone)}
                </time>
              </div>
            ) : (
              <p className="muted-copy">No activity for the selected device and period.</p>
            )}
            <p className="source-note">
              Upload source is not stored in the telemetry schema, so automatic and manual uploads cannot be distinguished.
            </p>
          </article>
          <article className="dashboard-card account-card">
            <p className="eyebrow">Account</p>
            <h2>{user.name}</h2>
            <p className="muted-copy">{user.email}</p>
            <div className="account-detail">
              <span>Access role</span>
              <strong>{user.role.replace("_", " ")}</strong>
            </div>
            <div className="account-detail">
              <span>Display timezone</span>
              <strong>{timezone}</strong>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
