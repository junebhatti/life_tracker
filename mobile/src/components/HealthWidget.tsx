import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Circle, Rect } from "react-native-svg";
import { colors, fonts } from "../theme";
import { useAppState } from "../state/AppState";
import { generateHealthInsights } from "../lib/healthInsights";
import { ozToMl, mlToLiters } from "../lib/water";
import type { HealthHistoryDay } from "../types";

const WATER_TARGET_ML = 2000;

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

function DepthStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.depthStat}>
      <Text style={styles.depthValue}>{value}</Text>
      <Text style={styles.depthLabel}>{label}</Text>
    </View>
  );
}

// ── progress ring ─────────────────────────────────────────────────────────────
// Real SVG progress arc (mirrors the web Ring component) — the old version was
// just a fixed gray border that never actually reflected value/target.

function ProgressRing({
  size,
  stroke,
  value,
  target,
  color,
  children,
}: {
  size: number;
  stroke: number;
  value: number;
  target: number;
  color: string;
  children?: React.ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = target > 0 ? Math.min(Math.max(value / target, 0), 1) : 0;
  const offset = circumference * (1 - pct);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.border} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
      {children}
    </View>
  );
}

// ── trends ─────────────────────────────────────────────────────────────────────
// One compact row of small sparklines instead of three full-width chart
// sections — same data, far less visual weight.

function Sparkline({ label, values, color, decimals = 0 }: { label: string; values: (number | null)[]; color: string; decimals?: number }) {
  const width = 88;
  const height = 30;
  const nums = values.filter((v): v is number => v != null);

  if (nums.length < 2) {
    return (
      <View style={styles.sparkCell}>
        <Text style={styles.sparkLabel}>{label}</Text>
        <Text style={styles.sparkNoData}>Not enough data</Text>
      </View>
    );
  }

  const max = Math.max(...nums) * 1.15 || 1;
  const n = values.length;
  const slot = width / n;
  const barW = Math.max(2, slot * 0.5);
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;

  return (
    <View style={styles.sparkCell}>
      <Text style={styles.sparkLabel}>{label}</Text>
      <Svg width={width} height={height}>
        {values.map((v, i) => {
          if (v == null) return null;
          const barH = Math.max(1.5, (v / max) * height);
          const x = i * slot + (slot - barW) / 2;
          return <Rect key={i} x={x} y={height - barH} width={barW} height={barH} rx={1} fill={i >= n - 3 ? color : colors.border} />;
        })}
      </Svg>
      <Text style={styles.sparkValue}>{`${avg.toFixed(decimals)} avg`}</Text>
    </View>
  );
}

// ── water tracker ──────────────────────────────────────────────────────────────
// Logged straight from the app (not sourced from Fitbit) — the 9oz/12oz
// glasses used at home, or a custom amount.

function WaterSection() {
  const { water, logWater } = useAppState();
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [customUnit, setCustomUnit] = useState<"oz" | "ml">("oz");

  function submitCustom() {
    const amount = Number(customValue);
    if (!amount || amount <= 0) return;
    logWater(customUnit === "oz" ? ozToMl(amount) : amount);
    setCustomValue("");
    setCustomOpen(false);
  }

  const liters = mlToLiters(water);
  const targetLiters = mlToLiters(WATER_TARGET_ML);

  return (
    <>
      <Text style={[styles.subheader, { marginTop: 28 }]}>Water · Today</Text>
      <View style={styles.nutritionRow}>
        <ProgressRing size={76} stroke={7} value={water} target={WATER_TARGET_ML} color="#0891b2">
          <Text style={styles.ringValue}>{liters.toFixed(2)}</Text>
          <Text style={styles.ringUnit}>{`/${targetLiters.toFixed(1)} L`}</Text>
        </ProgressRing>
        <View style={styles.waterButtons}>
          <Pressable style={styles.waterBtn} onPress={() => logWater(ozToMl(9))}>
            <Text style={styles.waterBtnText}>+ 9 oz glass</Text>
          </Pressable>
          <Pressable style={styles.waterBtn} onPress={() => logWater(ozToMl(12))}>
            <Text style={styles.waterBtnText}>+ 12 oz glass</Text>
          </Pressable>
          <Pressable style={styles.waterBtn} onPress={() => setCustomOpen((v) => !v)}>
            <Text style={styles.waterBtnText}>Custom…</Text>
          </Pressable>
        </View>
      </View>
      {customOpen ? (
        <View style={styles.customRow}>
          <TextInput
            style={styles.customInput}
            value={customValue}
            onChangeText={setCustomValue}
            placeholder="amount"
            placeholderTextColor={colors.textTertiary}
            keyboardType="number-pad"
            onSubmitEditing={submitCustom}
            returnKeyType="done"
            autoFocus
          />
          <View style={styles.unitToggle}>
            {(["oz", "ml"] as const).map((u) => (
              <Pressable
                key={u}
                style={[styles.unitBtn, customUnit === u && styles.unitBtnActive]}
                onPress={() => setCustomUnit(u)}
              >
                <Text style={[styles.unitBtnText, customUnit === u && styles.unitBtnTextActive]}>
                  {u.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.customBtn} onPress={submitCustom}>
            <Text style={styles.customBtnText}>Log</Text>
          </Pressable>
        </View>
      ) : null}
    </>
  );
}

// ── full-screen detail page ───────────────────────────────────────────────────

function HealthDetail({ onClose }: { onClose: () => void }) {
  const { health, healthHistory } = useAppState();
  const insights = generateHealthInsights(health, healthHistory);

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

  const recent = (sel: (d: HealthHistoryDay) => number | null) => healthHistory.slice(-14).map(sel);

  function sleepWindow(): string {
    if (!health?.sleepStart || !health?.sleepEnd) return "";
    const f = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `${f(health.sleepStart)} – ${f(health.sleepEnd)}`;
  }

  const hasDepth =
    health?.efficiency != null || health?.minutesToFallAsleep != null || health?.minutesAwake != null;

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
          {/* headline stats */}
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

          {/* insights */}
          <Text style={styles.subheader}>Insights</Text>
          <View style={styles.insightCard}>
            {insights.map((line, i) => (
              <View key={i} style={styles.insightRow}>
                <View style={styles.insightDot} />
                <Text style={styles.insightText}>{line}</Text>
              </View>
            ))}
          </View>

          {/* sleep last night */}
          <Text style={[styles.subheader, { marginTop: 26 }]}>{`Sleep · Last Night${sleepWindow() ? ` · ${sleepWindow()}` : ""}`}</Text>
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

          {/* sleep depth */}
          {hasDepth ? (
            <View style={styles.depthRow}>
              <DepthStat label="Efficiency" value={health?.efficiency != null ? `${Math.round(health.efficiency)}%` : "—"} />
              <DepthStat label="Fell asleep in" value={health?.minutesToFallAsleep != null ? `${Math.round(health.minutesToFallAsleep)}m` : "—"} />
              <DepthStat label="Awake" value={health?.minutesAwake != null ? `${Math.round(health.minutesAwake)}m` : "—"} />
            </View>
          ) : null}

          {/* trends — compact, three small sparklines instead of three full charts */}
          <Text style={[styles.subheader, { marginTop: 28 }]}>Trends · Last 2 Weeks</Text>
          <View style={styles.sparkRow}>
            <Sparkline label="Sleep" values={recent((d) => d.sleepHours)} color="#7c3aed" decimals={1} />
            <Sparkline label="Steps" values={recent((d) => d.steps)} color="#0d9488" />
            <Sparkline label="Resting HR" values={recent((d) => d.restingHeartRate)} color="#b91c1c" />
          </View>

          {/* nutrition */}
          <Text style={[styles.subheader, { marginTop: 28 }]}>Nutrition · Today</Text>
          <View style={styles.nutritionRow}>
            <ProgressRing size={76} stroke={7} value={health?.calories ?? 0} target={2100} color="#f97316">
              <Text style={styles.ringValue}>{fmtInt(health?.calories)}</Text>
              <Text style={styles.ringUnit}>/2100 kcal</Text>
            </ProgressRing>
            <View style={styles.macros}>
              <MacroRow label="PROTEIN" value={health?.protein !== undefined ? `${fmtInt(health.protein)}g` : "—"} />
              <MacroRow label="CARBS" value={health?.carbs !== undefined ? `${fmtInt(health.carbs)}g` : "—"} />
              <MacroRow label="FAT" value={health?.fat !== undefined ? `${fmtInt(health.fat)}g` : "—"} />
            </View>
          </View>

          {/* water */}
          <WaterSection />
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
  subheader: { fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: 0.7, textTransform: "uppercase", color: colors.textTertiary, marginBottom: 10 },
  noData: { fontFamily: fonts.sans, fontSize: 13, color: colors.textFaint, fontStyle: "italic" },
  // insights
  insightCard: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 },
  insightRow: { flexDirection: "row", gap: 9, alignItems: "flex-start" },
  insightDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#7c3aed", marginTop: 6 },
  insightText: { flex: 1, fontFamily: fonts.sans, fontSize: 13.5, lineHeight: 19, color: colors.textPrimary },
  // sleep stages
  sleepBar: { height: 8, borderRadius: 4, flexDirection: "row", gap: 1, overflow: "hidden" },
  stageRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  stageItem: { flex: 1 },
  stageTop: { flexDirection: "row", alignItems: "center", gap: 5 },
  stageDot: { width: 6, height: 6, borderRadius: 3 },
  stageLabel: { fontFamily: fonts.mono, fontSize: 9.5, color: colors.textSecondary },
  stageHours: { fontFamily: fonts.serif, fontSize: 18, color: colors.textPrimary, marginTop: 4 },
  stagePct: { fontFamily: fonts.mono, fontSize: 9.5, color: colors.textFaint },
  // depth
  depthRow: { flexDirection: "row", gap: 12, marginTop: 18 },
  depthStat: { flex: 1, alignItems: "center", paddingVertical: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10 },
  depthValue: { fontFamily: fonts.serif, fontSize: 20, color: colors.textPrimary },
  depthLabel: { fontFamily: fonts.mono, fontSize: 8, textTransform: "uppercase", letterSpacing: 0.5, color: colors.textTertiary, marginTop: 3 },
  // trends
  sparkRow: { flexDirection: "row", justifyContent: "space-between" },
  sparkCell: { alignItems: "center", gap: 4 },
  sparkLabel: { fontFamily: fonts.mono, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5, color: colors.textSecondary },
  sparkValue: { fontFamily: fonts.mono, fontSize: 9, color: colors.textFaint },
  sparkNoData: { fontFamily: fonts.sans, fontSize: 10.5, color: colors.textFaint, fontStyle: "italic", maxWidth: 88, textAlign: "center" },
  // nutrition
  nutritionRow: { flexDirection: "row", alignItems: "center", gap: 18 },
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
  // water
  waterButtons: { flex: 1, gap: 8 },
  waterBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  waterBtnText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.textPrimary },
  customRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  customInput: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  customBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: colors.surfaceDark },
  customBtnText: { fontFamily: fonts.sansMedium, fontSize: 12.5, color: "#fff" },
  unitToggle: { flexDirection: "row", borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 2 },
  unitBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  unitBtnActive: { backgroundColor: colors.surfaceDark },
  unitBtnText: { fontFamily: fonts.monoMedium, fontSize: 10.5, color: colors.textSecondary },
  unitBtnTextActive: { color: "#fff" },
});
