"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { Ring } from "@/components/NutritionRings";
import { WATER_TARGET_ML } from "@/lib/nutritionTargets";
import { ozToMl, mlToLiters } from "@/lib/water";

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
 *  plus a custom amount (oz or mL). Lives right under the Nutrition rings on
 *  the Health page — same visual language (progress ring, value/target inside). */
export default function WaterTracker() {
  const { user } = useAuth();
  const userId = user?.id;

  const [ml, setMl] = useState<number | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [customUnit, setCustomUnit] = useState<"oz" | "ml">("oz");

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from("water_logs")
      .select("amount_ml")
      .eq("user_id", userId)
      .gte("logged_at", startOfDayIso())
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Failed to load water intake", error);
          return;
        }
        setMl((data ?? []).reduce((sum, row) => sum + Number(row.amount_ml), 0));
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function logWaterMl(amountMl: number) {
    if (!userId || !(amountMl > 0)) return;
    const prevMl = ml ?? 0;
    setMl(prevMl + amountMl);
    const { error } = await supabase
      .from("water_logs")
      .insert({ id: makeId(), user_id: userId, amount_ml: amountMl, logged_at: new Date().toISOString() });
    if (error) {
      console.error("Failed to log water", error);
      setMl(prevMl);
    }
  }

  function submitCustom() {
    const amount = Number(customValue);
    if (!amount || amount <= 0) return;
    void logWaterMl(customUnit === "oz" ? ozToMl(amount) : amount);
    setCustomValue("");
    setCustomOpen(false);
  }

  const liters = mlToLiters(ml ?? 0);
  const targetLiters = mlToLiters(WATER_TARGET_ML);

  return (
    <section className="border-t border-border pt-8">
      <p className="text-[11px] uppercase tracking-wider text-muted">Water · Today</p>
      <div className="mt-5 flex items-center gap-8">
        <div className="relative flex items-center justify-center">
          <Ring size={128} stroke={10} value={ml ?? 0} target={WATER_TARGET_ML} color="#0891b2" />
          <div className="absolute flex flex-col items-center">
            <span className="text-2xl font-semibold text-foreground">{liters.toFixed(2)}</span>
            <span className="text-[11px] text-muted">/ {targetLiters.toFixed(1)} L</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void logWaterMl(ozToMl(9))}
            className="rounded-md border border-border px-4 py-2 text-left text-sm text-foreground transition-colors hover:bg-hover"
          >
            + 9 oz glass
          </button>
          <button
            type="button"
            onClick={() => void logWaterMl(ozToMl(12))}
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
            placeholder="amount"
            autoFocus
            className="w-24 rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none"
          />
          <div className="flex rounded-md border border-border p-0.5">
            {(["oz", "ml"] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setCustomUnit(u)}
                className={`rounded px-3 py-1.5 text-xs font-medium uppercase transition-colors ${
                  customUnit === u ? "bg-neutral-800 text-white" : "text-muted hover:text-foreground"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
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
