"use client";

import {
  CartesianGrid,
  Area,
  AreaChart,
  XAxis,
  YAxis,
} from "recharts";
import type { ReactNode } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { ChartPoint } from "./dashboard-types";
import {
  formatAxisTime,
  formatTimestamp,
  getUploadMode,
} from "./dashboard-utils";

const chartConfig = {
  moisture: { label: "Soil moisture", color: "var(--chart-moisture)" },
} satisfies ChartConfig;

const UPLOAD_COLORS = {
  manual: "var(--chart-manual)",
  automatic: "var(--chart-automatic)",
  other: "var(--dash-muted)",
} as const;

type UploadDotProps = {
  cx?: number;
  cy?: number;
  r?: number | string;
  payload?: { message?: unknown };
};

function renderUploadDot({
  cx,
  cy,
  r,
  payload,
}: UploadDotProps): ReactNode {
  if (typeof cx !== "number" || typeof cy !== "number") return null;
  const mode = getUploadMode(
    payload && typeof payload.message === "string" ? payload.message : "",
  );
  const radius = Math.max(typeof r === "number" ? r : 4, 4);
  const fill = UPLOAD_COLORS[mode];

  if (mode === "manual") {
    return (
      <path
        d={`M ${cx} ${cy - radius} L ${cx + radius} ${cy} L ${cx} ${cy + radius} L ${cx - radius} ${cy} Z`}
        fill={fill}
        stroke="var(--dash-card)"
        strokeWidth={2}
      />
    );
  }

  return (
    <circle
      cx={cx}
      cy={cy}
      r={radius}
      fill={fill}
      stroke="var(--dash-card)"
      strokeWidth={2}
    />
  );
}

type DashboardTelemetryChartProps = {
  apiError: string;
  deviceCount: number;
  loading: boolean;
  points: ChartPoint[];
  totalReadings: number;
  timezone: string;
  minimum: number | null;
  maximum: number | null;
  latestReading: ChartPoint | null;
  onRefresh: () => void;
};

export function DashboardTelemetryChart({
  apiError,
  deviceCount,
  loading,
  points,
  totalReadings,
  timezone,
  minimum,
  maximum,
  latestReading,
  onRefresh,
}: DashboardTelemetryChartProps) {
  return (
    <Card
      className="dashboard-card chart-card"
      role="region"
      aria-label="Soil moisture reading history"
    >
      <div className="card-heading">
        <div>
          <p className="eyebrow">Soil moisture</p>
          <h2>Reading history</h2>
          <p className="muted-copy">
            {timezone} · Last 24 hours
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="chart-refresh-button"
          onClick={onRefresh}
          disabled={loading}
          aria-label={loading ? "Loading latest readings" : "Refresh readings"}
        >
          <span aria-hidden="true">
            <FiRefreshCw />
          </span>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>

      {apiError && <p className="inline-error" role="alert">{apiError}</p>}
      {loading ? (
        <div className="chart-state" role="status">Loading telemetry…</div>
      ) : deviceCount === 0 ? (
        <div className="chart-state">
          <strong>No devices added yet</strong>
          <span>Add a device below to see readings here.</span>
        </div>
      ) : points.length === 0 ? (
        <div className="chart-state">
          <strong>No readings in this period</strong>
          <span>Click Refresh after the next device upload.</span>
        </div>
      ) : (
        <div className="chart-frame">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <AreaChart
              data={points}
              margin={{ top: 16, right: 16, bottom: 8, left: -12 }}
            >
              <defs>
                <linearGradient id="moisture-area-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--chart-moisture)"
                    stopOpacity={0.34}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--chart-moisture)"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="var(--dash-grid)"
                strokeDasharray="4 4"
                vertical={false}
              />
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
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideLabel
                    indicator="line"
                    formatter={(_value, _name, item) => {
                      const point = item.payload as ChartPoint;
                      const uploadMode = getUploadMode(point.message);
                      const uploadLabel =
                        uploadMode === "manual"
                          ? "Manual button upload"
                          : uploadMode === "automatic"
                            ? "Automatic scheduled upload"
                            : point.message || "Other upload";
                      return (
                        <div className="chart-tooltip-details">
                          <strong>
                            {formatTimestamp(point.createdAt, timezone)}
                          </strong>
                          <span>{point.moisture ?? "—"}% moisture</span>
                          <span>{uploadLabel}</span>
                        </div>
                      );
                    }}
                  />
                }
                cursor={{
                  stroke: "var(--dash-muted)",
                  strokeDasharray: "4 4",
                }}
              />
              <Area
                name="Soil moisture"
                type="monotone"
                dataKey="moisture"
                stroke="var(--chart-moisture)"
                strokeWidth={2.5}
                fill="url(#moisture-area-gradient)"
                dot={renderUploadDot}
                activeDot={renderUploadDot}
                connectNulls
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        </div>
      )}

      {points.length > 0 && (
        <div className="chart-upload-legend" aria-label="Reading upload types">
          <span>
            <i className="upload-marker upload-marker-manual" aria-hidden="true" />
            Manual button upload
          </span>
          <span>
            <i className="upload-marker upload-marker-automatic" aria-hidden="true" />
            Automatic scheduled upload
          </span>
        </div>
      )}

      <div className="chart-summary">
        <span><strong>{totalReadings}</strong> readings in period</span>
        <span>Min <strong>{minimum === null ? "—" : `${minimum}%`}</strong></span>
        <span>Max <strong>{maximum === null ? "—" : `${maximum}%`}</strong></span>
        <span>
          Latest{" "}
          <strong>
            {latestReading?.moisture == null
              ? "—"
              : `${latestReading.moisture}%`}
          </strong>
        </span>
      </div>
    </Card>
  );
}
