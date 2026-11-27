"use client";

import { APIProvider, InfoWindow, Map, Marker } from "@vis.gl/react-google-maps";
import { useState } from "react";

export type DeviceLocation = {
  deviceId: string;
  fieldName: string | null;
  latitude: number | null;
  longitude: number | null;
};

export function LocationMap({
  device,
  theme,
}: {
  device: DeviceLocation | null;
  theme: "light" | "dark" | "system";
}) {
  const [infoOpen, setInfoOpen] = useState(true);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!device || device.latitude === null || device.longitude === null) {
    return (
      <div className="map-empty" role="status">
        <span className="map-empty-icon" aria-hidden="true">⌖</span>
        <strong>Location unavailable</strong>
        <span>No GPS coordinates have been recorded for this device.</span>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="map-empty" role="status">
        <strong>Google Maps is not configured</strong>
        <span>Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to display this location.</span>
      </div>
    );
  }

  const position = { lat: device.latitude, lng: device.longitude };
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${position.lat},${position.lng}`)}`;

  return (
    <div className="location-map-wrap">
      <APIProvider apiKey={apiKey}>
        <Map
          key={device.deviceId}
          center={position}
          zoom={15}
          colorScheme={theme === "dark" ? "DARK" : theme === "light" ? "LIGHT" : "FOLLOW_SYSTEM"}
          mapTypeControl
          zoomControl
          streetViewControl={false}
          fullscreenControl={false}
          mapTypeId="roadmap"
          className="location-map"
          aria-label={`Map showing device ${device.deviceId}`}
        >
          <Marker
            position={position}
            title={device.fieldName || device.deviceId}
            onClick={() => setInfoOpen(true)}
          />
          {infoOpen && (
            <InfoWindow
              position={position}
              onClose={() => setInfoOpen(false)}
              pixelOffset={[0, -36]}
            >
              <div className="map-info">
                <strong>{device.fieldName || "Field name not provided"}</strong>
                <span>Latitude: {position.lat.toFixed(6)}</span>
                <span>Longitude: {position.lng.toFixed(6)}</span>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
      <a href={mapsUrl} target="_blank" rel="noreferrer" className="map-open-link">
        Open in Google Maps ↗
      </a>
    </div>
  );
}
