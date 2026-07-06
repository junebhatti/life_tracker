"use client";

export type WaterHistoryDay = { date: string; totalMl: number };

const TARGET_ML = 2000;
const DAYS_SHOWN = 30;

function formatShortDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Habit-tracker style bar chart: one bar per day, colored by whether that
 *  day's total crossed the 2L baseline (drawn as a dashed reference line). */
export default function WaterHistoryChart({ days }: { days: WaterHistoryDay[] }) {
  const recent = days.slice(-DAYS_SHOWN);
  if (recent.length === 0) return null;

  const width = 600;
  const height = 140;
  const padding = 8;
  const maxMl = Math.max(TARGET_ML, ...recent.map((d) => d.totalMl)) * 1.1;

  const barSlot = (width - padding * 2) / recent.length;
  const baselineY = height - padding - (TARGET_ML / maxMl) * (height - padding * 2);
  const hitCount = recent.filter((d) => d.totalMl >= TARGET_ML).length;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
        <line
          x1={padding}
          x2={width - padding}
          y1={baselineY}
          y2={baselineY}
          stroke="#94a3b8"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        {recent.map((d, i) => {
          const barHeight = Math.max(2, (d.totalMl / maxMl) * (height - padding * 2));
          const x = padding + i * barSlot;
          const y = height - padding - barHeight;
          const met = d.totalMl >= TARGET_ML;
          return (
            <rect
              key={d.date}
              x={x + barSlot * 0.15}
              y={y}
              width={Math.max(1, barSlot * 0.7)}
              height={barHeight}
              rx={1.5}
              fill={met ? "#0891b2" : "#cbd5e1"}
            >
              <title>{`${formatShortDate(d.date)}: ${(d.totalMl / 1000).toFixed(2)}L`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>{formatShortDate(recent[0].date)}</span>
        <span>
          {hitCount} of {recent.length} days ≥ 2L
        </span>
        <span>{formatShortDate(recent[recent.length - 1].date)}</span>
      </div>
    </div>
  );
}
