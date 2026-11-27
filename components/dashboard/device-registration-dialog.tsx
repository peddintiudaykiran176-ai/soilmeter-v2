"use client";

import { useEffect, useRef, type FormEventHandler } from "react";
import { FiMapPin, FiX } from "react-icons/fi";

type DeviceRegistrationDialogProps = {
  open: boolean;
  pending: boolean;
  error: string;
  locationStatus: string;
  deviceId: string;
  fieldName: string;
  cropType: string;
  latitude: string;
  longitude: string;
  onDeviceIdChange: (value: string) => void;
  onFieldNameChange: (value: string) => void;
  onCropTypeChange: (value: string) => void;
  onLatitudeChange: (value: string) => void;
  onLongitudeChange: (value: string) => void;
  onDetectLocation: () => void;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export function DeviceRegistrationDialog({
  open,
  pending,
  error,
  locationStatus,
  deviceId,
  fieldName,
  cropType,
  latitude,
  longitude,
  onDeviceIdChange,
  onFieldNameChange,
  onCropTypeChange,
  onLatitudeChange,
  onLongitudeChange,
  onDetectLocation,
  onClose,
  onSubmit,
}: DeviceRegistrationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
  }, [open]);

  if (!open) return null;

  const hasCoordinates = Boolean(latitude.trim()) && Boolean(longitude.trim());
  const mapUrl = hasCoordinates
    ? `https://maps.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}&z=15&output=embed`
    : null;

  return (
    <dialog
      ref={dialogRef}
      className="device-registration-dialog"
      aria-labelledby="device-registration-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="device-dialog-heading">
        <div>
          <p className="eyebrow">New device</p>
          <h2 id="device-registration-title">Add a device</h2>
        </div>
        <button
          type="button"
          className="device-modal-close"
          aria-label="Close add device form"
          onClick={onClose}
          disabled={pending}
          autoFocus
        >
          <FiX aria-hidden="true" />
        </button>
      </div>
      <p className="muted-copy">
        Add your device details and required location. We’ll detect your current
        coordinates or let you enter them.
      </p>
      <form className="device-registration-form" onSubmit={onSubmit}>
        <label>
          Device ID
          <input
            type="text"
            name="deviceId"
            value={deviceId}
            onChange={(event) => onDeviceIdChange(event.target.value)}
            minLength={2}
            maxLength={128}
            required
            placeholder="e.g. 868651062610002"
          />
        </label>
        <label>
          Field name
          <input
            type="text"
            name="fieldName"
            value={fieldName}
            onChange={(event) => onFieldNameChange(event.target.value)}
            maxLength={120}
            minLength={2}
            required
            placeholder="e.g. Greenhouse"
          />
        </label>
        <label>
          Crop type
          <input
            type="text"
            name="cropType"
            value={cropType}
            onChange={(event) => onCropTypeChange(event.target.value)}
            maxLength={80}
            required
            placeholder="e.g. Tomato"
          />
        </label>
        <label>
          Latitude
          <input
            type="number"
            name="latitude"
            value={latitude}
            onChange={(event) => onLatitudeChange(event.target.value)}
            min={-90}
            max={90}
            step="any"
            required
            placeholder="e.g. 6.9271"
          />
        </label>
        <label>
          Longitude
          <input
            type="number"
            name="longitude"
            value={longitude}
            onChange={(event) => onLongitudeChange(event.target.value)}
            min={-180}
            max={180}
            step="any"
            required
            placeholder="e.g. 79.8612"
          />
        </label>
        <div className="device-location-heading">
          <p className="device-location-status" role="status">{locationStatus}</p>
          <button
            type="button"
            className="secondary-button"
            onClick={onDetectLocation}
            disabled={locationStatus === "Detecting your location…"}
          >
            <FiMapPin aria-hidden="true" />
            {locationStatus === "Detecting your location…"
              ? "Detecting…"
              : "Use my location"}
          </button>
        </div>
        <div className="device-registration-map-preview">
          {mapUrl ? (
            <>
              <iframe
                title={`Google Map centered on ${latitude}, ${longitude}`}
                src={mapUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <span>
                Google Maps · {Number(latitude).toFixed(4)}°,{" "}
                {Number(longitude).toFixed(4)}°
              </span>
            </>
          ) : (
            <div className="device-map-placeholder">
              <span aria-hidden="true"><FiMapPin /></span>
              <strong>Location preview</strong>
              <small>Allow location access or enter the required coordinates.</small>
            </div>
          )}
        </div>
        <p className="device-map-note">
          Google Maps receives these coordinates to display the preview.
        </p>
        <div className="device-form-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="primary-button"
            disabled={pending}
          >
            {pending ? "Adding…" : "Add device"}
          </button>
        </div>
        {error && <p className="inline-error" role="alert">{error}</p>}
      </form>
    </dialog>
  );
}
