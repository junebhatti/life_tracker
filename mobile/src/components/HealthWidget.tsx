import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";
import { useAppState } from "../state/AppState";

function fmt1(n: number | undefined): string {
  return n !== undefined ? n.toFixed(1) : "—";
}
function fmtInt(n: number | undefined): string {
  return n !== undefined ? String(Math.round(n)) : "—";
}

function CollapsedRow({ label, value, unit, faint }: { label: string; value: string; unit: string; faint?: boolean }) {
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

// ── full-screen detail page ───────────────────────────────────────────────────

function HealthDetail({ onClose }: { onClose: () => void }) {
  const { health } = useAppState();

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

  function sleepWindow(): string {
    if (!health?.sleepStart || !health?.sleepEnd) return "";
    const f = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `${f(health.sleepStart)} – ${f(health.sleepEnd)}`;
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheetWrap}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Health · Today</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.sheetClose}>✕</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent}>
          <View style={styles.statGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{fmt1(health?.sleepHours)}</Text>
              <Text style={styles.statUnit}>hours sleep</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{fmtInt(health?.restingHR)}</Text>
              <Text style={styles.statUnit}>resting bpm</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{fmtInt(health?.steps)}</Text>
              <Text style={styles.statUnit}>steps</Text>
            </View>
          </View>

          <Text style={styles.subheader}>{`Sleep · Last Night${sleepWindow() ? ` · ${sleepWindow()}` : ""}`}</Text>
          {stages && stageTotal > 0 ? (
            <>
              <View style={styles.sleepBar}>
                {stages.map((s) => (
                  <View key={s.key} style={{ flex: s.min / stageTotal, backgroundColor: s.color }} />
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
                    <Text style={styles.stagePct}>{stageTotal ? Math.round((s.min / stageTotal) * 100) : 0}%</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.noData}>
              {health?.sleepHours !== undefined ? `${fmt1(health.sleepHours)}h — stage breakdown not available` : "No sleep data"}
            </Text>
          )}

          <Text style={[styles.subheader, { marginTop: 26 }]}>Nutrition · Today</Text>
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
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── card on the Today page ────────────────────────────────────────────────────

export default function HealthWidget() {
  const { health } = useAppState();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.header} onPress={() => setOpen(true)}>
        <Text style={styles.lbl}>Health</Text>
        <Text style={styles.toggle}>view ›</Text>
      </Pressable>

      <Pressable onPress={() => setOpen(true)}>
        <CollapsedRow label="Sleep" value={fmt1(health?.sleepHours)} unit="h" faint={health?.sleepHours === undefined} />
        <CollapsedRow label="Resting HR" value={fmtInt(health?.restingHR)} unit={health?.restingHR !== undefined ? "bpm" : ""} faint={health?.restingHR === undefined} />
        <CollapsedRow label="Steps" value={fmtInt(health?.steps)} unit="" faint={health?.steps === undefined} />
      </Pressable>

      {open ? <HealthDetail onClose={() => setOpen(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 28 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  lbl: { fontFamily: fonts.monoMedium, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: colors.textSecondary },
  toggle: { fontFamily: fonts.mono, fontSize: 9, textTransform: "uppercase", color: colors.textTertiary },
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
  sheetWrap: { flex: 1, backgroundColor: colors.background, paddingTop: 12 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 16 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: { fontFamily: fonts.sansMedium, fontSize: 18, color: colors.textPrimary },
  sheetClose: { fontFamily: fonts.sans, fontSize: 16, color: colors.textTertiary },
  sheetScroll: { flex: 1 },
  sheetContent: { paddingHorizontal: 20, paddingBottom: 50, paddingTop: 18 },
  statGrid: { flexDirection: "row", gap: 12, marginBottom: 26 },
  statBox: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  statValue: { fontFamily: fonts.serif, fontSize: 26, color: colors.textPrimary },
  statUnit: { fontFamily: fonts.mono, fontSize: 8.5, textTransform: "uppercase", letterSpacing: 0.6, color: colors.textTertiary, marginTop: 4 },
  subheader: { fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: 0.7, color: colors.textTertiary, marginBottom: 10 },
  noData: { fontFamily: fonts.sans, fontSize: 13, color: colors.textFaint, fontStyle: "italic" },
  sleepBar: { height: 8, borderRadius: 4, flexDirection: "row", gap: 1, overflow: "hidden" },
  stageRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  stageItem: { flex: 1 },
  stageTop: { flexDirection: "row", alignItems: "center", gap: 5 },
  stageDot: { width: 6, height: 6, borderRadius: 3 },
  stageLabel: { fontFamily: fonts.mono, fontSize: 9.5, color: colors.textSecondary },
  stageHours: { fontFamily: fonts.serif, fontSize: 18, color: colors.textPrimary, marginTop: 4 },
  stagePct: { fontFamily: fonts.mono, fontSize: 9.5, color: colors.textFaint },
  nutritionRow: { flexDirection: "row", alignItems: "center", gap: 18 },
  ring: { width: 76, height: 76, borderRadius: 38, borderWidth: 6, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  ringValue: { fontFamily: fonts.serif, fontSize: 20, color: colors.textPrimary },
  ringUnit: { fontFamily: fonts.mono, fontSize: 7.5, color: colors.textFaint },
  macros: { flex: 1 },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  macroLabel: { fontFamily: fonts.mono, fontSize: 9.5, color: colors.textSecondary },
  macroValue: { fontFamily: fonts.serif, fontSize: 16, color: colors.textPrimary },
});
