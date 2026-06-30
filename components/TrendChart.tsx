"use client";

type Point = { date: string; value: number };

function formatShortDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Simple SVG line chart with no dependencies — points are assumed sorted by date ascending. */
export default function TrendChart({
  points,
  color,
  unit,
}: {
  points: Point[];
  color: string;
  unit?: string;
}) {
  if (points.length === 0) return null;

  const width = 600;
  const height = 140;
  const padding = 8;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = padding + i * stepX;
    const y = height - padding - ((p.value - min) / range) * (height - padding * 2);
    return { x, y, ...p };
  });

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const last = coords[coords.length - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
        <path d={path} fill="none" stroke={color} strokeWidth={2} />
        <circle cx={last.x} cy={last.y} r={3} fill={color} />
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>{formatShortDate(points[0].date)}</span>
        <span>
          {Math.round(max * 10) / 10}
          {unit} max · {Math.round(min * 10) / 10}
          {unit} min
        </span>
        <span>{formatShortDate(points[points.length - 1].date)}</span>
      </div>
    </div>
  );
}
