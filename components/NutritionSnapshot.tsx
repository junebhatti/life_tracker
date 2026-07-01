"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SectionHeading from "./SectionHeading";
import NutritionRings, { type Nutrition } from "./NutritionRings";

type SnapshotResponse = {
  configured: boolean;
  snapshot?: { nutrition?: Nutrition };
  error?: string;
};

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

  return (
    <section>
      <SectionHeading
        title="Nutrition"
        action={
          <Link href="/health" className="transition-colors hover:text-foreground">
            Details →
          </Link>
        }
      />

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
        <Link href="/health" className="mt-2 block">
          <NutritionRings nutrition={state?.snapshot?.nutrition} />
        </Link>
      )}
    </section>
  );
}
