"use client";

import { useEffect, useState } from "react";
import SectionHeading from "./SectionHeading";
import { NUTRITION_TARGETS } from "@/lib/nutritionTargets";

type Nutrition = {
  calories?: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
};

type SnapshotResponse = {
  configured: boolean;
  snapshot?: { nutrition?: Nutrition };
  error?: string;
};

function Ring({
  size,
  stroke,
  value,
  target,
  color,
}: {
  size: number;
  stroke: number;
  value: number;
  target: number;
  color: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const offset = circumference * (1 - pct);

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        className="stroke-hover"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        stroke={color}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

function MacroRing({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex items-center justify-center">
        <Ring size={56} stroke={6} value={value} target={target} color={color} />
        <span className="absolute text-xs font-medium text-foreground">{Math.round(value)}g</span>
      </div>
      <span className="text-[10px] uppercase tracking-wide text-muted">{label}</span>
    </div>
  );
}

/** Calorie + macro rings for today, synced in via Google Health (nutrition apps feeding it). */
export default function NutritionSnapshot() {
  const [state, setState] = useState<SnapshotResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    fetch(`/api/health/snapshot?timezone=${encodeURIComponent(timezone)}`)
      .then((res) => res.json())
      .then((data: SnapshotResponse) => {
        if (!cancelled) setState(data);
      })
      .catch(() => {
        if (!cancelled) {
          setState({ configured: true, error: "Couldn't load nutrition data." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state && !state.configured) return null;

  const nutrition = state?.snapshot?.nutrition;
  const calories = nutrition?.calories ?? 0;
  const protein = nutrition?.proteinGrams ?? 0;
  const carbs = nutrition?.carbsGrams ?? 0;
  const fat = nutrition?.fatGrams ?? 0;

  return (
    <section>
      <SectionHeading title="Nutrition" />

      {state === null && (
        <div className="mt-2 flex items-center gap-4 py-2">
          <div className="h-32 w-32 shrink-0 animate-pulse rounded-full bg-hover" />
          <div className="flex flex-1 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 w-14 animate-pulse rounded-full bg-hover" />
            ))}
          </div>
        </div>
      )}

      {state && state.error && (
        <p className="px-2 py-3 text-sm text-muted">{state.error}</p>
      )}

      {state && !state.error && (
        <div className="mt-2 flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center">
            <Ring
              size={128}
              stroke={10}
              value={calories}
              target={NUTRITION_TARGETS.calories}
              color="var(--color-accent, #f97316)"
            />
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-semibold text-foreground">
                {Math.round(calories)}
              </span>
              <span className="text-[11px] text-muted">/ {NUTRITION_TARGETS.calories} kcal</span>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <MacroRing label="Protein" value={protein} target={NUTRITION_TARGETS.proteinGrams} color="#3b82f6" />
            <MacroRing label="Carbs" value={carbs} target={NUTRITION_TARGETS.carbsGrams} color="#22c55e" />
            <MacroRing label="Fat" value={fat} target={NUTRITION_TARGETS.fatGrams} color="#eab308" />
          </div>
        </div>
      )}
    </section>
  );
}
