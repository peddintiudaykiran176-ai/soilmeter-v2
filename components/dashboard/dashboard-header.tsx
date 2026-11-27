"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { FiFeather, FiGlobe, FiMoon, FiSun } from "react-icons/fi";
import type { Theme } from "./dashboard-types";

type DashboardHeaderProps = {
  userName: string;
  userEmail: string;
  timezone: string;
  theme: Theme;
  timezoneOptions: readonly string[];
  adminLink: ReactNode;
  signOut: ReactNode;
  onTimezoneChange: (value: string) => void;
  onThemeChange: (value: string) => void;
};

export function DashboardHeader({
  userName,
  userEmail,
  timezone,
  theme,
  timezoneOptions,
  adminLink,
  signOut,
  onTimezoneChange,
  onThemeChange,
}: DashboardHeaderProps) {
  const timezonePopoverRef = useRef<HTMLDetailsElement>(null);
  const accountPopoverRef = useRef<HTMLDetailsElement>(null);
  const initial = userName.trim().charAt(0).toUpperCase() || "U";
  const isDarkMode = theme === "dark";
  const themeAction = isDarkMode ? "light" : "dark";

  useEffect(() => {
    function closePopoversOnOutsidePointer(event: PointerEvent) {
      if (!(event.target instanceof Node)) return;
      if (!timezonePopoverRef.current?.contains(event.target)) {
        if (timezonePopoverRef.current) timezonePopoverRef.current.open = false;
      }
      if (!accountPopoverRef.current?.contains(event.target)) {
        if (accountPopoverRef.current) accountPopoverRef.current.open = false;
      }
    }

    document.addEventListener("pointerdown", closePopoversOnOutsidePointer);
    return () => {
      document.removeEventListener("pointerdown", closePopoversOnOutsidePointer);
    };
  }, []);

  return (
    <header className="dashboard-header">
      <Link href="/" className="dashboard-brand">
        <span className="dashboard-brand-mark" aria-hidden="true">
          <FiFeather aria-hidden="true" />
        </span>
        <span className="dashboard-brand-name">
          SoilMeter <span>V1</span>
        </span>
      </Link>
      <div className="dashboard-header-right">
        <details
          ref={timezonePopoverRef}
          className="header-popover timezone-popover"
        >
          <summary
            className="timezone-trigger"
            aria-label={`Timezone: ${timezone}`}
            title={timezone}
          >
            <FiGlobe aria-hidden="true" />
            <span>{timezone}</span>
          </summary>
          <div className="header-popover-panel timezone-popover-panel">
            <label className="header-select-label" htmlFor="dashboard-timezone">
              Time zone
            </label>
            <select
              id="dashboard-timezone"
              value={timezone}
              onChange={(event) => onTimezoneChange(event.target.value)}
            >
              {timezoneOptions.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </div>
        </details>

        <button
          type="button"
          className="theme-toggle-button"
          onClick={() => onThemeChange(themeAction)}
          aria-label={`Switch to ${themeAction} mode`}
          title={`Switch to ${themeAction} mode`}
          aria-pressed={isDarkMode}
        >
          {isDarkMode ? (
            <FiSun aria-hidden="true" />
          ) : (
            <FiMoon aria-hidden="true" />
          )}
        </button>

        <div className="account-controls">
          {adminLink}
          <details
            ref={accountPopoverRef}
            className="header-popover account-popover"
          >
            <summary
              className="account-avatar"
              aria-label="Open profile details"
              title={userName || userEmail}
            >
              {initial}
            </summary>
            <div className="header-popover-panel account-popover-panel">
              <strong>{userName}</strong>
              <span>{userEmail}</span>
              {signOut}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
