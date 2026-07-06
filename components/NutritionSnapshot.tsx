"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SectionHeading from "./SectionHeading";
import NutritionRings, { type Nutrition } from "./NutritionRings";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

type SnapshotResponse = {
  configured: boolean;
  snapshot?: { nutrition?: Nutrition };
  error?: string;
};

function startOfDayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Calorie + macro rings for today, synced in via Google Health (nutrition apps feeding it),
 *  plus a 4th ring for today's logged water — a separate in-app-only data source.
 *  Logging happens on /health; this is just a glance-and-go preview. */
export default function NutritionSnapshot() {
  const { user } = useAuth();
  const [state, setState] = useState<SnapshotResponse | null>(null);
  const [waterMl, setWaterMl] = useState<number | undefined>(undefined);

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

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    supabase
      .from("water_logs")
      .select("amount_ml")
      .eq("user_id", user.id)
      .gte("logged_at", startOfDayIso())
      .then(({ data, error }) => {
        if (cancelled || error) return;
        setWaterMl((data ?? []).reduce((sum, row) => sum + Number(row.amount_ml), 0));
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

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
          <NutritionRings nutrition={state?.snapshot?.nutrition} waterMl={waterMl} />
        </Link>
      )}
    </section>
  );
}
