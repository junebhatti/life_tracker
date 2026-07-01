import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";
import { useAppState } from "../state/AppState";

function fmt1(n: number | undefined): string {
  return n !== undefined ? n.toFixed(1) : "—";
}
function fmtInt(n: number | undefined): string {
  return n !== undefined ? String(Math.round(n)) : "—";
}

function CollapsedRow({
  label, value, unit, faint,
}: { label: string; value: string; unit: string; faint?: boolean }) {
  return (
    <View style={styles.collapsedRow}>
      <Text style={styles.collapsedLabel}>{label}</Text>
      <View style={styles.collapsedValueRow}>
        <Text style={[styles.collapsedValue, faint && styles.collapsedValueFaint]}>{value}</Text>
        {unit ? <Text style={styles.collapsedUnit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

function MacroRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.macroRow}>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>{value}</Text>
    </View>
  );
}

export default function HealthWidget() {
  const { healthExpanded, toggleHealthExpanded, health } = useAppState();

  const sleepH = health?.sleepHours;
  const hr = health?.restingHR;
  const steps = health?.steps;

  const totalSleepMin = sleepH ? sleepH * 60 : 0;
  const deep = health?.deepMinutes;
  const rem = health?.remMinutes;
  const light = health?.lightMinutes;
  const awake = health?.awakeMinutes;

  const stages =
    deep !== undefined || rem !== undefined || light !== undefined
      ? [
          { key: "Deep", min: deep ?? 0, color: "#4c1d95" },
          { key: "REM", min: rem ?? 0, color: "#7c3aed" },
          { key: "Light", min: light ?? 0, color: "#c4b5fd" },
          { key: "Awake", min: awake ?? 0, color: "#d1d5db" },
        ]
      : null;

  const stageTotal = stages ? stages.reduce((s, x) => s + x.min, 0) : 0;

  function formatSleepWindow(): string {
    if (!health?.sleepStart || !health?.sleepEnd) return "";
    const fmt = (iso: string) =>
      new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `${fmt(health.sleepStart)} – ${fmt(health.sleepEnd)}`;
  }

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.header} onPress={toggleHealthExpanded}>
        <Text style={styles.lbl}>Health</Text>
        <Text style={styles.toggle}>{healthExpanded ? "collapse ↑" : "expand ↓"}</Text>
      </Pressable>

      <CollapsedRow label="Sleep" value={sleepH !== undefined ? fmt1(sleepH) : "—"} unit="h" faint={sleepH === undefined} />
      <CollapsedRow label="Resting HR" value={hr !== undefined ? fmtInt(hr) : "—"} unit={hr !== undefined ? "bpm" : ""} faint={hr === undefined} />
      <CollapsedRow label="Steps" value={steps !== undefined ? fmtInt(steps) : "—"} unit="" faint={steps === undefined} />

      {healthExpanded ? (
        <View style={styles.expanded}>
          <Text style={styles.subheader}>
            {`Sleep · Last Night${formatSleepWindow() ? ` · ${formatSleepWindow()}` : ""}`}
          </Text>

          {stages && stageTotal > 0 ? (
            <>
              <View style={styles.sleepBar}>
                {stages.map((s) => (
                  <View
                    key={s.key}
                    style={{ flex: s.min / stageTotal, backgroundColor: s.color }}
                  />
                ))}
              </View>
              <View style={styles.stageRow}>
                {stages.map((s) => (
                  <View key={s.key} style={styles.stageItem}>
                    <View style={styles.stageTop}>
                      <View style={[styles.stageDot, { backgroundColor: s.color }]} />
                      <Text style={styles.stageLabel}>{s.key}</Text>
                    </View>
                    <Text style={styles.stageHours}>{fmt1(s.min / 60)}h</Text>
                    <Text style={styles.stagePct}>
                      {stageTotal ? Math.round((s.min / stageTotal) * 100) : 0}%
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.noData}>{sleepH !== undefined ? `${fmt1(sleepH)}h — stage breakdown not available` : "No sleep data"}</Text>
          )}

          <Text style={[styles.subheader, { marginTop: 20 }]}>Nutrition · Today</Text>
          <View style={styles.nutritionRow}>
            <View style={styles.ring}>
              <Text style={styles.ringValue}>{fmtInt(health?.calories)}</Text>
              <Text style={styles.ringUnit}>/2100 kcal</Text>
            </View>
            <View style={styles.macros}>
              <MacroRow label="PROTEIN" value={health?.protein !== undefined ? `${fmtInt(health.protein)}g` : "—"} />
              <MacroRow label="CARBS" value={health?.carbs !== undefined ? `${fmtInt(health.carbs)}g` : "—"} />
              <MacroRow label="FAT" value={health?.fat !== undefined ? `${fmtInt(health.fat)}g` : "—"} />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 28 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  lbl: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: colors.textSecondary,
  },
  toggle: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: "uppercase",
    color: colors.textTertiary,
  },
  collapsedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  collapsedLabel: { fontFamily: fonts.sans, fontSize: 15, color: colors.textPrimary },
  collapsedValueRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  collapsedValue: { fontFamily: fonts.serif, fontSize: 22, color: colors.textPrimary },
  collapsedValueFaint: { color: colors.textFaint },
  collapsedUnit: { fontFamily: fonts.mono, fontSize: 11, color: colors.textSecondary },
  expanded: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  subheader: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 0.7,
    color: colors.textTertiary,
    marginBottom: 8,
  },
  noData: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textFaint,
    fontStyle: "italic",
    marginBottom: 8,
  },
  sleepBar: {
    height: 7,
    borderRadius: 4,
    flexDirection: "row",
    gap: 1,
    overflow: "hidden",
  },
  stageRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  stageItem: { flex: 1 },
  stageTop: { flexDirection: "row", alignItems: "center", gap: 5 },
  stageDot: { width: 6, height: 6, borderRadius: 3 },
  stageLabel: { fontFamily: fonts.mono, fontSize: 9.5, color: colors.textSecondary },
  stageHours: { fontFamily: fonts.serif, fontSize: 17, color: colors.textPrimary, marginTop: 4 },
  stagePct: { fontFamily: fonts.mono, fontSize: 9.5, color: colors.textFaint },
  nutritionRow: { flexDirection: "row", alignItems: "center", gap: 18 },
  ring: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  ringValue: { fontFamily: fonts.serif, fontSize: 19, color: colors.textPrimary },
  ringUnit: { fontFamily: fonts.mono, fontSize: 7.5, color: colors.textFaint },
  macros: { flex: 1 },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  macroLabel: { fontFamily: fonts.mono, fontSize: 9.5, color: colors.textSecondary },
  macroValue: { fontFamily: fonts.serif, fontSize: 15, color: colors.textPrimary },
});
