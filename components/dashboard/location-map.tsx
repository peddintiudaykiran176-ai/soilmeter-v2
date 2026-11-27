"use client";

export type DeviceLocation = {
  deviceId: string;
  fieldName: string | null;
  latitude: number | null;
  longitude: number | null;
};

export function LocationMap({
  device,
}: {
  device: DeviceLocation | null;
}) {
  if (!device || device.latitude === null || device.longitude === null) {
    return (
      <div className="map-empty" role="status">
        <span className="map-empty-icon" aria-hidden="true">⌖</span>
        <strong>Location unavailable</strong>
        <span>No GPS coordinates have been recorded for this device.</span>
      </div>
    );
  }

  const coordinates = `${device.latitude},${device.longitude}`;
  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(coordinates)}&z=15&output=embed`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinates)}`;

  return (
    <div className="location-map-wrap">
      <iframe
        title={`Google Map showing ${device.fieldName || device.deviceId}`}
        src={mapUrl}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="location-map"
      />
      <a href={mapsUrl} target="_blank" rel="noreferrer" className="map-open-link">
        Open in Google Maps ↗
      </a>
    </div>
  );
}
