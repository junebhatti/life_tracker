"use client";

import { NUTRITION_TARGETS, WATER_TARGET_ML } from "@/lib/nutritionTargets";
import { mlToLiters } from "@/lib/water";

export type Nutrition = {
  calories?: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
};

export function Ring({
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
  unit = "g",
  format,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
  unit?: string;
  /** Override for the center label — used by water, which shows liters (1 decimal) instead of a rounded whole number. */
  format?: (value: number) => string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex items-center justify-center">
        <Ring size={56} stroke={6} value={value} target={target} color={color} />
        <span className="absolute text-xs font-medium text-foreground">
          {format ? format(value) : `${Math.round(value)}${unit}`}
        </span>
      </div>
      <span className="text-[10px] uppercase tracking-wide text-muted">{label}</span>
    </div>
  );
}

/** Calorie ring + protein/carbs/fat macro rings against the daily targets. Presentational only.
 *  `waterMl`, when provided, adds a 4th ring for today's logged water (a separate,
 *  in-app-only data source from the Google Health-sourced nutrition). */
export default function NutritionRings({ nutrition, waterMl }: { nutrition?: Nutrition; waterMl?: number }) {
  const calories = nutrition?.calories ?? 0;
  const protein = nutrition?.proteinGrams ?? 0;
  const carbs = nutrition?.carbsGrams ?? 0;
  const fat = nutrition?.fatGrams ?? 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex items-center justify-center">
        <Ring
          size={128}
          stroke={10}
          value={calories}
          target={NUTRITION_TARGETS.calories}
          color="var(--color-accent, #f97316)"
        />
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-semibold text-foreground">{Math.round(calories)}</span>
          <span className="text-[11px] text-muted">/ {NUTRITION_TARGETS.calories} kcal</span>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <MacroRing label="Protein" value={protein} target={NUTRITION_TARGETS.proteinGrams} color="#3b82f6" />
        <MacroRing label="Carbs" value={carbs} target={NUTRITION_TARGETS.carbsGrams} color="#22c55e" />
        <MacroRing label="Fat" value={fat} target={NUTRITION_TARGETS.fatGrams} color="#eab308" />
        {waterMl !== undefined && (
          <MacroRing
            label="Water"
            value={waterMl}
            target={WATER_TARGET_ML}
            color="#0891b2"
            format={(v) => `${mlToLiters(v).toFixed(1)}L`}
          />
        )}
      </div>
    </div>
  );
}
