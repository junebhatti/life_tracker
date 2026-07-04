"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { Ring } from "@/components/NutritionRings";
import { WATER_TARGET_OZ } from "@/lib/nutritionTargets";

/** Start of the local civil day, as an ISO timestamp — water is logged
 *  straight from the app (not sourced from Fitbit), so "today" means the
 *  device's own clock, same as everywhere else health data resets daily. */
function startOfDayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function makeId(): string {
  return `w_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Water intake ring + quick-log buttons for the 9oz/12oz glasses at home,
 *  plus a custom amount. Lives right under the Nutrition rings on the Health
 *  page — same visual language (progress ring, value/target inside). */
export default function WaterTracker() {
  const { user } = useAuth();
  const userId = user?.id;

  const [ounces, setOunces] = useState<number | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from("water_logs")
      .select("amount_oz")
      .eq("user_id", userId)
      .gte("logged_at", startOfDayIso())
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Failed to load water intake", error);
          return;
        }
        setOunces((data ?? []).reduce((sum, row) => sum + Number(row.amount_oz), 0));
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function logWater(oz: number) {
    if (!userId || !(oz > 0)) return;
    const prevOunces = ounces ?? 0;
    setOunces(prevOunces + oz);
    const { error } = await supabase
      .from("water_logs")
      .insert({ id: makeId(), user_id: userId, amount_oz: oz, logged_at: new Date().toISOString() });
    if (error) {
      console.error("Failed to log water", error);
      setOunces(prevOunces);
    }
  }

  function submitCustom() {
    const oz = Number(customValue);
    if (!oz || oz <= 0) return;
    void logWater(oz);
    setCustomValue("");
    setCustomOpen(false);
  }

  return (
    <section className="border-t border-border pt-8">
      <p className="text-[11px] uppercase tracking-wider text-muted">Water · Today</p>
      <div className="mt-5 flex items-center gap-8">
        <div className="relative flex items-center justify-center">
          <Ring size={128} stroke={10} value={ounces ?? 0} target={WATER_TARGET_OZ} color="#0891b2" />
          <div className="absolute flex flex-col items-center">
            <span className="text-2xl font-semibold text-foreground">{Math.round(ounces ?? 0)}</span>
            <span className="text-[11px] text-muted">/ {WATER_TARGET_OZ} oz</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void logWater(9)}
            className="rounded-md border border-border px-4 py-2 text-left text-sm text-foreground transition-colors hover:bg-hover"
          >
            + 9 oz glass
          </button>
          <button
            type="button"
            onClick={() => void logWater(12)}
            className="rounded-md border border-border px-4 py-2 text-left text-sm text-foreground transition-colors hover:bg-hover"
          >
            + 12 oz glass
          </button>
          <button
            type="button"
            onClick={() => setCustomOpen((v) => !v)}
            className="rounded-md border border-border px-4 py-2 text-left text-sm text-foreground transition-colors hover:bg-hover"
          >
            Custom…
          </button>
        </div>
      </div>

      {customOpen && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitCustom()}
            placeholder="oz"
            autoFocus
            className="w-24 rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none"
          />
          <button
            type="button"
            onClick={submitCustom}
            className="rounded-md bg-foreground px-4 py-2 text-sm text-background"
          >
            Log
          </button>
        </div>
      )}
    </section>
  );
}
