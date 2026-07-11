"use client";

type Point = { date: string; value: number };

function formatShortDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Rounds a raw axis step up to a "nice" 1/2/5 × 10ⁿ value so gridlines land on readable numbers. */
function niceStep(rough: number): number {
  if (rough <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const frac = rough / pow;
  const nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return nice * pow;
}

/** Builds a padded domain plus evenly spaced "nice" tick values covering [min, max]. */
function buildScale(min: number, max: number, targetTicks = 4) {
  if (min === max) {
    // Flat series — invent a little breathing room so the line sits mid-chart.
    const pad = Math.abs(min) > 0 ? Math.abs(min) * 0.2 : 1;
    min -= pad;
    max += pad;
  }
  const step = niceStep((max - min) / targetTicks);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step * 0.5; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return { lo, hi, ticks };
}

/**
 * Aesthetic gridded line/area chart — no dependencies. Draws a light horizontal grid with
 * value labels on the y-axis, a soft gradient area under a smooth line, every reading as a
 * faint dot, and explicit min / max / latest markers. `points` are assumed sorted ascending
 * by date. An optional `target` draws a dashed reference line (e.g. a daily goal).
 */
export default function GridChart({
  points,
  color,
  unit = "",
  format = (v) => `${Math.round(v * 10) / 10}`,
  target,
  targetLabel,
}: {
  points: Point[];
  color: string;
  unit?: string;
  /** Formats a value for axis labels / markers (defaults to 1-decimal rounding). */
  format?: (value: number) => string;
  /** Optional reference line value (e.g. a goal), drawn dashed with a label. */
  target?: number;
  targetLabel?: string;
}) {
  if (points.length === 0) return null;

  const W = 680;
  const H = 240;
  const M = { top: 18, right: 16, bottom: 26, left: 48 };
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;

  const values = points.map((p) => p.value);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const { lo, hi, ticks } = buildScale(
    target !== undefined ? Math.min(dataMin, target) : dataMin,
    target !== undefined ? Math.max(dataMax, target) : dataMax,
  );
  const span = hi - lo || 1;

  const x = (i: number) =>
    M.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => M.top + plotH - ((v - lo) / span) * plotH;

  const coords = points.map((p, i) => ({ x: x(i), y: y(p.value), ...p }));
  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const areaPath =
    `M${coords[0].x},${M.top + plotH} ` +
    coords.map((c) => `L${c.x},${c.y}`).join(" ") +
    ` L${coords[coords.length - 1].x},${M.top + plotH} Z`;

  const minIdx = values.indexOf(dataMin);
  const maxIdx = values.indexOf(dataMax);
  const last = coords[coords.length - 1];

  // Show ~4 evenly spaced date labels along the x-axis without crowding.
  const labelEvery = Math.max(1, Math.ceil(points.length / 4));
  const gradId = `grid-fill-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.16} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines + y-axis value labels */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={M.left}
              x2={W - M.right}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--color-border, #e5e7eb)"
              strokeWidth={1}
            />
            <text
              x={M.left - 8}
              y={y(t)}
              textAnchor="end"
              dominantBaseline="central"
              className="fill-muted"
              fontSize={11}
            >
              {format(t)}
            </text>
          </g>
        ))}

        {/* Optional target / goal reference line */}
        {target !== undefined && (
          <>
            <line
              x1={M.left}
              x2={W - M.right}
              y1={y(target)}
              y2={y(target)}
              stroke={color}
              strokeWidth={1}
              strokeDasharray="5 4"
              opacity={0.55}
            />
            {targetLabel && (
              <text
                x={W - M.right}
                y={y(target) - 5}
                textAnchor="end"
                className="fill-muted"
                fontSize={10}
              >
                {targetLabel}
              </text>
            )}
          </>
        )}

        {/* Area + line */}
        <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Faint dot on every reading */}
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={2} fill={color} opacity={0.35}>
            <title>{`${formatShortDate(c.date)}: ${format(c.value)}${unit}`}</title>
          </circle>
        ))}

        {/* Min / max markers */}
        {maxIdx !== minIdx && (
          <g>
            <circle cx={coords[maxIdx].x} cy={coords[maxIdx].y} r={3.5} fill={color} />
            <text
              x={coords[maxIdx].x}
              y={coords[maxIdx].y - 9}
              textAnchor="middle"
              className="fill-foreground"
              fontSize={10}
              fontWeight={600}
            >
              {`${format(dataMax)}${unit}`}
            </text>
            <circle
              cx={coords[minIdx].x}
              cy={coords[minIdx].y}
              r={3.5}
              fill="var(--color-background, #fff)"
              stroke={color}
              strokeWidth={1.5}
            />
            <text
              x={coords[minIdx].x}
              y={coords[minIdx].y + 16}
              textAnchor="middle"
              className="fill-muted"
              fontSize={10}
            >
              {`${format(dataMin)}${unit}`}
            </text>
          </g>
        )}

        {/* Latest reading emphasized */}
        <circle cx={last.x} cy={last.y} r={4} fill={color} stroke="var(--color-background, #fff)" strokeWidth={1.5} />

        {/* X-axis date labels */}
        {coords.map((c, i) =>
          i % labelEvery === 0 || i === coords.length - 1 ? (
            <text
              key={`xl-${i}`}
              x={c.x}
              y={H - 8}
              textAnchor={i === 0 ? "start" : i === coords.length - 1 ? "end" : "middle"}
              className="fill-muted"
              fontSize={10}
            >
              {formatShortDate(c.date)}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}
