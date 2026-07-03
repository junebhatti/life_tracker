// Rule-based "AI-style" insights generated from the current snapshot + recent
// history. No LLM — instant and free. Returns a few short, specific takeaways.

import type { HealthData, HealthHistoryDay } from "../types";

function avg(nums: number[]): number | undefined {
  if (!nums.length) return undefined;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function generateHealthInsights(
  health: HealthData | null,
  history: HealthHistoryDay[],
): string[] {
  const out: string[] = [];
  const days = history.slice(-14);
  const sleepVals = days.map((d) => d.sleepHours).filter((n): n is number => n != null);
  const stepVals = days.map((d) => d.steps).filter((n): n is number => n != null);
  const hrVals = days.map((d) => d.restingHeartRate).filter((n): n is number => n != null);

  // Last night's sleep vs recent average
  if (health?.sleepHours != null && sleepVals.length >= 3) {
    const prior = sleepVals.slice(0, -1);
    const a = avg(prior);
    if (a) {
      const delta = health.sleepHours - a;
      if (Math.abs(delta) >= 0.4) {
        out.push(
          `Slept ${Math.abs(delta).toFixed(1)}h ${delta > 0 ? "more" : "less"} than your ${prior.length}-day average of ${a.toFixed(1)}h.`,
        );
      } else {
        out.push(`Sleep is holding steady around ${a.toFixed(1)}h a night.`);
      }
    }
  }

  // Sleep-stage quality
  const totalMin = (health?.sleepHours ?? 0) * 60;
  if (health?.remMinutes != null && totalMin > 0) {
    const pct = Math.round((health.remMinutes / totalMin) * 100);
    if (pct >= 22) out.push(`Strong REM last night — ${pct}% of sleep (ideal ~20–25%).`);
    else if (pct > 0 && pct < 15) out.push(`Low REM last night — only ${pct}% (aim for ~20–25%).`);
  }
  if (health?.deepMinutes != null && totalMin > 0) {
    const pct = Math.round((health.deepMinutes / totalMin) * 100);
    if (pct > 0 && pct < 12) out.push(`Deep sleep was light at ${pct}% — deep sleep drives physical recovery.`);
  }

  // Efficiency
  if (health?.efficiency != null) {
    if (health.efficiency >= 90) out.push(`High sleep efficiency (${Math.round(health.efficiency)}%) — little time awake in bed.`);
    else if (health.efficiency < 80) out.push(`Sleep efficiency was ${Math.round(health.efficiency)}% — a restless night.`);
  }

  // Steps trend
  if (stepVals.length >= 6) {
    const recent = avg(stepVals.slice(-3))!;
    const prior = avg(stepVals.slice(-7, -3))!;
    if (Math.abs(recent - prior) > 1500) {
      out.push(`Steps trending ${recent > prior ? "up" : "down"} — averaging ${Math.round(recent).toLocaleString()}/day lately.`);
    }
  }

  // Resting HR trend
  if (hrVals.length >= 6) {
    const recent = avg(hrVals.slice(-3))!;
    const prior = avg(hrVals.slice(-7, -3))!;
    const delta = recent - prior;
    if (delta <= -2) out.push(`Resting heart rate down ${Math.abs(delta).toFixed(0)} bpm vs last week — a good recovery sign.`);
    else if (delta >= 3) out.push(`Resting heart rate up ${delta.toFixed(0)} bpm vs last week — could signal fatigue or stress.`);
  }

  if (out.length === 0) {
    out.push("Insights sharpen as more days sync — check back after a few nights.");
  }
  return out.slice(0, 4);
}
