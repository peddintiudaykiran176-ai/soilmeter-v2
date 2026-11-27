type MoistureGaugeProps = {
  value: number | null;
};

const CENTER_X = 120;
const CENTER_Y = 112;
const OUTER_RADIUS = 100;
const INNER_RADIUS = 57;
const SCORE_COLORS = ["#e7473d",  "#f39818", "#e7d926", "#138a35"] as const;

function pointAt(radius: number, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: CENTER_X + Math.cos(radians) * radius,
    y: CENTER_Y + Math.sin(radians) * radius,
  };
}

function segmentPath(startAngle: number, endAngle: number) {
  const outerStart = pointAt(OUTER_RADIUS, startAngle);
  const outerEnd = pointAt(OUTER_RADIUS, endAngle);
  const innerEnd = pointAt(INNER_RADIUS, endAngle);
  const innerStart = pointAt(INNER_RADIUS, startAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 0 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${INNER_RADIUS} ${INNER_RADIUS} 0 0 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

export function MoistureGauge({ value }: MoistureGaugeProps) {
  const hasReading = typeof value === "number" && Number.isFinite(value);
  const score = hasReading ? Math.max(0, Math.min(100, value)) : null;
  const displayValue =
    score === null
      ? "—"
      : Number.isInteger(score)
        ? score.toFixed(0)
        : score.toFixed(1);
  const needleAngle = score === null ? null : 180 + score * 1.8;
  const needleTip = needleAngle === null ? null : pointAt(80, needleAngle);
  const needleNormal =
    needleAngle === null
      ? null
      : {
          x: -Math.sin((needleAngle * Math.PI) / 180) * 3,
          y: Math.cos((needleAngle * Math.PI) / 180) * 3,
        };

  return (
    <div
      className="moisture-score"
      role="img"
      aria-label={
        score === null
          ? "No soil moisture reading available"
          : `Soil moisture ${displayValue} percent out of 100`
      }
    >
      <svg
        className="moisture-score-scale"
        viewBox="0 0 240 126"
        aria-hidden="true"
      >
        {SCORE_COLORS.map((color, index) => {
          const startAngle = 180 + index * 45;
          const endAngle = startAngle + 45;

          return (
            <path
              key={color}
              d={segmentPath(startAngle, endAngle)}
              fill={color}
            />
          );
        })}
        {needleTip && needleNormal && (
          <path
            className="moisture-score-needle"
            d={[
              `M ${needleTip.x} ${needleTip.y}`,
              `L ${CENTER_X + needleNormal.x} ${CENTER_Y + needleNormal.y}`,
              `L ${CENTER_X - needleNormal.x} ${CENTER_Y - needleNormal.y}`,
              "Z",
            ].join(" ")}
          />
        )}
        <circle
          className="moisture-score-hub"
          cx={CENTER_X}
          cy={CENTER_Y}
          r="7"
        />
        <text className="moisture-score-endpoint" x="18" y="123">
          0
        </text>
        <text
          className="moisture-score-endpoint"
          x="222"
          y="123"
          textAnchor="end"
        >
          100
        </text>
      </svg>
      <div className="moisture-score-value" aria-hidden="true">
        <strong>{score === null ? "No reading" : `moisture: ${displayValue}%`}</strong>
      </div>
    </div>
  );
}
