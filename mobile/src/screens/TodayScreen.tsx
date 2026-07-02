import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";
import { useAppState } from "../state/AppState";
import PageHeader from "../components/PageHeader";
import TaskRow from "../components/TaskRow";
import HealthWidget from "../components/HealthWidget";
import TodaySettings from "../components/TodaySettings";

function todayTitle(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function timezoneLabel(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
}

export default function TodayScreen() {
  const { tasks, agenda, routines, toggleRoutine } = useAppState();
  const starred = tasks.filter((t) => t.starred && !t.done).slice(0, 3);
  const openTasks = tasks.filter((t) => !t.done);
  const openSpots = Math.max(0, 3 - starred.length);

  const todayAgenda = agenda.filter((e) => e.day === "Today" || e.day === "Tomorrow");

  return (
    <View>
      <PageHeader label="Today" title={todayTitle()} sub={timezoneLabel()} />

      <Text style={styles.sectionLabel}>Top 3 for Today</Text>
      {starred.map((t) => (
        <TaskRow key={t.id} task={t} />
      ))}
      {Array.from({ length: openSpots }).map((_, i) => (
        <View key={`spot-${i}`} style={styles.openSpotRow}>
          <Text style={styles.openSpotText}>(open spot)</Text>
        </View>
      ))}
      <Text style={styles.hint}>Star a task below to set it as today&apos;s top 3.</Text>

      {todayAgenda.length > 0 ? (
        <>
          <View style={styles.upNextHeader}>
            <Text style={styles.sectionLabelNoMargin}>Up Next</Text>
          </View>
          {todayAgenda.map((e) => (
            <View key={e.id} style={styles.eventRow}>
              <View style={styles.eventTimeCol}>
                {e.day ? <Text style={styles.eventMeta}>{e.day}</Text> : null}
                <Text style={styles.eventMeta}>{e.time}</Text>
              </View>
              <View style={styles.eventBody}>
                <Text style={styles.eventTitle}>{e.title}</Text>
                {e.location ? <Text style={styles.eventLocation}>{e.location}</Text> : null}
              </View>
            </View>
          ))}
        </>
      ) : null}

      <HealthWidget />

      <Text style={styles.sectionLabel}>{`All Open · ${openTasks.length}`}</Text>
      {openTasks.map((t) => (
        <TaskRow key={t.id} task={t} />
      ))}

      {routines.length > 0 ? (
        <>
          <Text style={styles.sectionLabel}>Routines</Text>
          {routines.map((r) => (
            <Pressable key={r.id} style={styles.routineRow} onPress={() => toggleRoutine(r.id)}>
              <View style={[styles.routineCheck, r.doneToday && styles.routineCheckDone]}>
                {r.doneToday ? <Text style={styles.routineCheckMark}>✓</Text> : null}
              </View>
              <View style={styles.routineBody}>
                <Text style={[styles.routineTitle, r.doneToday && styles.routineDone]}>
                  {r.title}
                </Text>
                {r.description ? (
                  <Text style={styles.routineMeta}>{r.description}</Text>
                ) : null}
              </View>
              <View style={styles.routineStreak}>
                <Text style={styles.routineStreakNum}>{r.streak}</Text>
                <Text style={styles.routineStreakLabel}>streak</Text>
              </View>
            </Pressable>
          ))}
        </>
      ) : null}

      <TodaySettings />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: colors.textSecondary,
    marginTop: 30,
    marginBottom: 6,
  },
  sectionLabelNoMargin: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: colors.textSecondary,
  },
  openSpotRow: {
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  openSpotText: {
    fontFamily: fonts.serifRegular,
    fontStyle: "italic",
    fontSize: 15,
    color: colors.textTertiary,
  },
  hint: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 8,
  },
  upNextHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 6,
  },
  eventRow: {
    flexDirection: "row",
    gap: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eventTimeCol: { width: 62 },
  eventMeta: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textTertiary,
  },
  eventBody: { flex: 1 },
  eventTitle: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textPrimary,
  },
  eventLocation: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textTertiary,
    marginTop: 2,
  },
  routineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  routineCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.chevron,
    alignItems: "center",
    justifyContent: "center",
  },
  routineCheckDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  routineCheckMark: {
    color: "#fff",
    fontSize: 12,
    lineHeight: 14,
  },
  routineBody: { flex: 1 },
  routineTitle: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textPrimary,
  },
  routineDone: {
    color: colors.textTertiary,
    textDecorationLine: "line-through",
  },
  routineMeta: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textTertiary,
    marginTop: 2,
  },
  routineStreak: {
    alignItems: "center",
  },
  routineStreakNum: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.textPrimary,
  },
  routineStreakLabel: {
    fontFamily: fonts.mono,
    fontSize: 8.5,
    color: colors.textFaint,
    textTransform: "uppercase",
  },
});
