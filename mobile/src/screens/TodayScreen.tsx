import React, { useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fonts } from "../theme";
import { useAppState } from "../state/AppState";
import PageHeader from "../components/PageHeader";
import TaskRow from "../components/TaskRow";
import HealthWidget from "../components/HealthWidget";
import TodaySettings from "../components/TodaySettings";
import type { Routine } from "../types";

// Matches lib/routines.ts ROUTINE_PERIODS on web — same four buckets.
const ROUTINE_PERIODS = ["Morning", "Afternoon", "Evening", "Anytime"];

function groupRoutines(routines: Routine[]) {
  return ROUTINE_PERIODS.map((period) => ({
    period,
    routines: routines.filter((r) => r.period === period),
  })).filter((g) => g.routines.length > 0);
}

function todayTitle(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function timezoneLabel(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
}

// Opens the Google Calendar app if installed, else its web page. No API needed.
function openGoogleCalendar() {
  Linking.openURL("comgooglecalendar://").catch(() => {
    Linking.openURL("https://calendar.google.com/calendar/u/0/r").catch(() => {});
  });
}

/** The single "add a top task" slot at the end of the Top 3 list. */
function TopTaskAdder() {
  const { addTask } = useAppState();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");

  function submit() {
    const trimmed = text.trim();
    if (trimmed) addTask(trimmed, { starred: true });
    setText("");
    setEditing(false);
  }

  if (!editing) {
    return (
      <Pressable style={styles.openSpotRow} onPress={() => setEditing(true)}>
        <Text style={styles.openSpotText}>+ add a top task</Text>
      </Pressable>
    );
  }
  return (
    <View style={styles.openSpotRow}>
      <TextInput
        style={styles.topInput}
        value={text}
        onChangeText={setText}
        placeholder="What matters most today?"
        placeholderTextColor={colors.textTertiary}
        onSubmitEditing={submit}
        onBlur={submit}
        autoFocus
        returnKeyType="done"
      />
    </View>
  );
}

export default function TodayScreen() {
  const { tasks, agenda, routines, toggleRoutine } = useAppState();
  const starred = tasks.filter((t) => t.starred && !t.done).slice(0, 3);
  const openTasks = tasks.filter((t) => !t.done);
  const routineGroups = useMemo(() => groupRoutines(routines), [routines]);

  return (
    <View>
      <PageHeader label="Today" title={todayTitle()} sub={timezoneLabel()} />

      <Text style={styles.sectionLabel}>Top 3 for Today</Text>
      {starred.map((t) => (
        <TaskRow key={t.id} task={t} />
      ))}
      {/* One optional slot — no pressure to fill all three. */}
      {starred.length < 3 ? <TopTaskAdder /> : null}

      {/* Calendar — upcoming items, with a jump to the Google Calendar app. */}
      <View style={styles.calHeader}>
        <Text style={styles.sectionLabelNoMargin}>Calendar</Text>
        <Pressable onPress={openGoogleCalendar} hitSlop={8}>
          <Text style={styles.calOpen}>Open Google Calendar ↗</Text>
        </Pressable>
      </View>
      {agenda.length > 0 ? (
        agenda.map((e) => (
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
        ))
      ) : (
        <Text style={styles.calEmpty}>Nothing scheduled in the next few days.</Text>
      )}

      <HealthWidget />

      <Text style={styles.sectionLabel}>{`All Open · ${openTasks.length}`}</Text>
      {openTasks.map((t) => (
        <TaskRow key={t.id} task={t} />
      ))}

      {routines.length > 0 ? (
        <>
          <Text style={styles.sectionLabel}>Routines</Text>
          {routineGroups.map((g) => (
            <View key={g.period}>
              <Text style={styles.routineGroupLabel}>{g.period}</Text>
              {g.routines.map((r) => (
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
            </View>
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
  topInput: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  calHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 8,
  },
  calOpen: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.accentRed,
  },
  calEmpty: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textTertiary,
    fontStyle: "italic",
    paddingVertical: 6,
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
  routineGroupLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: colors.textTertiary,
    marginTop: 14,
    marginBottom: 2,
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
