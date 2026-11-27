"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { FiPlus } from "react-icons/fi";
import { Card } from "@/components/ui/card";
import { DashboardHeader } from "./dashboard-header";
import { DashboardTelemetryChart } from "./dashboard-telemetry-chart";
import { DeviceRegistrationDialog } from "./device-registration-dialog";
import { MoistureGauge } from "./moisture-gauge";
import type { ChartPoint, Device, Telemetry, Theme } from "./dashboard-types";
import {
  formatTimestamp,
  isTheme,
  localDefaultRange,
  TIMEZONES,
  validateTelemetryResponse,
} from "./dashboard-utils";

const LocationMap = dynamic(
  () => import("./location-map").then((module) => module.LocationMap),
  { ssr: false, loading: () => <div className="map-loading">Loading Google Maps…</div> },
);

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
  const [deviceFormOpen, setDeviceFormOpen] = useState(false);
  const [deviceFormPending, setDeviceFormPending] = useState(false);
  const [deviceFormError, setDeviceFormError] = useState("");
  const [locationStatus, setLocationStatus] = useState("");
  const [newDeviceId, setNewDeviceId] = useState("");
  const [newFieldName, setNewFieldName] = useState("");
  const [newCropType, setNewCropType] = useState("");
  const [newLatitude, setNewLatitude] = useState("");
  const [newLongitude, setNewLongitude] = useState("");
  const [readings, setReadings] = useState<Telemetry[]>([]);
  const [totalReadings, setTotalReadings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const themeRef = useRef(theme);
  const initialDevicePromptHandledRef = useRef(false);
  const locationRequestStartedRef = useRef(false);
  const locationRequestIdRef = useRef(0);
  const deviceCoordinatesRef = useRef({ latitude: "", longitude: "" });

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

  const requestDeviceLocation = useCallback(() => {
    if (locationRequestStartedRef.current) return;
    locationRequestStartedRef.current = true;

    const { latitude, longitude } = deviceCoordinatesRef.current;
    if (latitude.trim() || longitude.trim()) {
      setLocationStatus("Using the coordinates already entered.");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationStatus("Location detection is unavailable. Enter coordinates or leave both blank.");
      return;
    }

    const requestId = ++locationRequestIdRef.current;
    setLocationStatus("Detecting your location…");
    try {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          if (requestId !== locationRequestIdRef.current) return;
          const nextLatitude = coords.latitude.toFixed(6);
          const nextLongitude = coords.longitude.toFixed(6);
          deviceCoordinatesRef.current = {
            latitude: nextLatitude,
            longitude: nextLongitude,
          };
          setNewLatitude(nextLatitude);
          setNewLongitude(nextLongitude);
          setLocationStatus("Location detected.");
        },
        () => {
          if (requestId === locationRequestIdRef.current) {
            setLocationStatus("Location could not be detected. Enter coordinates or leave both blank.");
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    } catch {
      setLocationStatus("Location could not be detected. Enter coordinates or leave both blank.");
    }
  }, []);

  function closeDeviceForm() {
    if (deviceFormPending) return;
    locationRequestIdRef.current += 1;
    locationRequestStartedRef.current = false;
    setDeviceFormOpen(false);
  }

  function openDeviceForm() {
    setDeviceFormError("");
    setDeviceFormOpen(true);
    requestDeviceLocation();
  }

  function detectDeviceLocation() {
    locationRequestIdRef.current += 1;
    locationRequestStartedRef.current = false;
    deviceCoordinatesRef.current = { latitude: "", longitude: "" };
    setNewLatitude("");
    setNewLongitude("");
    setDeviceFormError("");
    requestDeviceLocation();
  }

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
        if (!initialDevicePromptHandledRef.current) {
          initialDevicePromptHandledRef.current = true;
          if (nextDevices.length === 0) {
            setDeviceFormOpen(true);
            requestDeviceLocation();
          }
        }

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

        const range = localDefaultRange(24 * 60 * 60 * 1000);
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
    [requestDeviceLocation, selectedDeviceId],
  );

  useEffect(() => {
    const controller = new AbortController();
    const initialRefresh = window.setTimeout(
      () => void refresh(controller.signal),
      0,
    );
    return () => {
      window.clearTimeout(initialRefresh);
      controller.abort();
    };
  }, [refresh]);

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
    setTimezone(value);
    void persistPreferences(value, theme);
  }

  function changeTheme(value: string) {
    if (!isTheme(value)) return;
    setTheme(value);
    void persistPreferences(timezone, value);
  }

  async function addDevice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeviceFormError("");
    if (!newLatitude.trim() || !newLongitude.trim()) {
      setDeviceFormError("Latitude and longitude are required.");
      return;
    }
    setDeviceFormPending(true);
    try {
      const response = await fetch("/api/dashboard/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: newDeviceId.trim(),
          fieldName: newFieldName.trim(),
          cropType: newCropType.trim(),
          latitude: newLatitude.trim() ? Number(newLatitude) : null,
          longitude: newLongitude.trim() ? Number(newLongitude) : null,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const errorMessage =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Unable to add this device.";
        throw new Error(errorMessage);
      }
      if (
        !payload ||
        typeof payload !== "object" ||
        !("device" in payload) ||
        !payload.device ||
        typeof payload.device !== "object" ||
        !("deviceId" in payload.device) ||
        typeof payload.device.deviceId !== "string" ||
        !("fieldName" in payload.device) ||
        typeof payload.device.fieldName !== "string" ||
        !("cropType" in payload.device) ||
        typeof payload.device.cropType !== "string" ||
        !("latitude" in payload.device) ||
        (typeof payload.device.latitude !== "number" &&
          payload.device.latitude !== null) ||
        !("longitude" in payload.device) ||
        (typeof payload.device.longitude !== "number" &&
          payload.device.longitude !== null) ||
        !("status" in payload.device) ||
        typeof payload.device.status !== "string"
      ) {
        throw new Error("The device registration returned an unexpected response.");
      }

      const registeredDevice: Device = {
        deviceId: payload.device.deviceId,
        fieldName: payload.device.fieldName,
        cropType: payload.device.cropType,
        latitude: payload.device.latitude,
        longitude: payload.device.longitude,
        moisture: null,
        message: "",
        createdAt: null,
        status: payload.device.status,
      };
      setDevices((current) => [
        registeredDevice,
        ...current.filter(
          (device) => device.deviceId !== registeredDevice.deviceId,
        ),
      ]);
      setSelectedDeviceId(registeredDevice.deviceId);
      setNewDeviceId("");
      setNewFieldName("");
      setNewCropType("");
      setNewLatitude("");
      setNewLongitude("");
      deviceCoordinatesRef.current = { latitude: "", longitude: "" };
      setLocationStatus("");
      locationRequestIdRef.current += 1;
      locationRequestStartedRef.current = false;
      setDeviceFormOpen(false);
    } catch (error) {
      setDeviceFormError(
        error instanceof Error ? error.message : "Unable to add this device.",
      );
    } finally {
      setDeviceFormPending(false);
    }
  }

  return (
    <main className="dashboard-shell" data-theme={theme}>
      <div className="dashboard-container">
        <DashboardHeader
          userName={user.name}
          userEmail={user.email}
          timezone={timezone}
          theme={theme}
          timezoneOptions={timezoneOptions}
          adminLink={adminLink}
          signOut={signOut}
          onTimezoneChange={changeTimezone}
          onThemeChange={changeTheme}
        />

        {preferenceError && <p className="inline-error" role="alert">{preferenceError}</p>}

        <section className="dashboard-top-grid">
          <DashboardTelemetryChart
            apiError={apiError}
            deviceCount={devices.length}
            loading={loading}
            points={points}
            totalReadings={totalReadings}
            timezone={timezone}
            minimum={minimum}
            maximum={maximum}
            latestReading={latestReading}
            onRefresh={() => void refresh()}
          />

          <div className="right-stack">
            <Card className="dashboard-card gauge-card" role="region" aria-label="Current soil moisture">
              <MoistureGauge value={selectedDevice?.moisture ?? null} />
              <p className="muted-copy">
                Last reading: {formatTimestamp(selectedDevice?.createdAt ?? null, timezone)}
              </p>
            </Card>

            <Card className="dashboard-card location-card" role="region" aria-label="Device location">
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
                device={selectedDevice ? {
                  deviceId: selectedDevice.deviceId,
                  fieldName: selectedDevice.fieldName,
                  latitude: selectedDevice.latitude,
                  longitude: selectedDevice.longitude,
                } : null}
              />
              <div className="metadata-row">
                <span>Crop type</span>
                <strong>{selectedDevice?.cropType || "Not specified"}</strong>
              </div>
            </Card>
          </div>

          <section className="device-switcher" aria-label="Your devices">
          <div className="device-tabs">
            {devices.map((device) => (
              <button
                key={device.deviceId}
                type="button"
                className={`device-tab${device.deviceId === selectedDeviceId ? " is-selected" : ""}`}
                aria-pressed={device.deviceId === selectedDeviceId}
                onClick={() => {
                  setSelectedDeviceId(device.deviceId);
                }}
              >
                {device.fieldName || device.deviceId}
              </button>
            ))}
            <button
              type="button"
              className="device-add-button"
              aria-label="Add device"
              onClick={openDeviceForm}
            >
              <span aria-hidden="true"><FiPlus /></span>
              <small>{devices.length} {devices.length === 1 ? "device" : "devices"}</small>
            </button>
          </div>
          </section>
        </section>

        <DeviceRegistrationDialog
          open={deviceFormOpen}
          pending={deviceFormPending}
          error={deviceFormError}
          locationStatus={locationStatus}
          deviceId={newDeviceId}
          fieldName={newFieldName}
          cropType={newCropType}
          latitude={newLatitude}
          longitude={newLongitude}
          onDeviceIdChange={setNewDeviceId}
          onFieldNameChange={setNewFieldName}
          onCropTypeChange={setNewCropType}
          onLatitudeChange={(latitude) => {
            locationRequestIdRef.current += 1;
            locationRequestStartedRef.current = true;
            deviceCoordinatesRef.current.latitude = latitude;
            setNewLatitude(latitude);
            setLocationStatus("Using manually entered coordinates.");
          }}
          onLongitudeChange={(longitude) => {
            locationRequestIdRef.current += 1;
            locationRequestStartedRef.current = true;
            deviceCoordinatesRef.current.longitude = longitude;
            setNewLongitude(longitude);
            setLocationStatus("Using manually entered coordinates.");
          }}
          onDetectLocation={detectDeviceLocation}
          onClose={closeDeviceForm}
          onSubmit={addDevice}
        />

      </div>
    </main>
  );
}
