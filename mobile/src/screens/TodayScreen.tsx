import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";
import { useAppState } from "../state/AppState";
import PageHeader from "../components/PageHeader";
import TaskRow from "../components/TaskRow";
import HealthWidget from "../components/HealthWidget";

function todayTitle(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export default function TodayScreen() {
  const { tasks, agenda } = useAppState();
  const starred = tasks.filter((t) => t.starred && !t.done).slice(0, 3);
  const openTasks = tasks.filter((t) => !t.done);
  const openSpots = Math.max(0, 3 - starred.length);

  return (
    <View>
      <PageHeader label="Today" title={todayTitle()} sub="America/Denver" />

      <Text style={styles.sectionLabel}>Top 3 for Today</Text>
      {starred.map((t) => (
        <TaskRow key={t.id} task={t} />
      ))}
      {Array.from({ length: openSpots }).map((_, i) => (
        <View key={`spot-${i}`} style={styles.openSpotRow}>
          <Text style={styles.openSpotText}>(open spot)</Text>
        </View>
      ))}
      <Text style={styles.hint}>Star a task below to set it as today's top 3.</Text>

      <View style={styles.upNextHeader}>
        <Text style={styles.sectionLabelNoMargin}>Up Next</Text>
        <Pressable>
          <Text style={styles.viewAll}>View all →</Text>
        </Pressable>
      </View>
      {agenda.map((e) => (
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

      <HealthWidget />

      <Text style={styles.sectionLabel}>{`All Open · ${openTasks.length}`}</Text>
      {openTasks.map((t) => (
        <TaskRow key={t.id} task={t} />
      ))}
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
  viewAll: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textTertiary,
  },
  eventRow: {
    flexDirection: "row",
    gap: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eventTimeCol: {
    width: 62,
  },
  eventMeta: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textTertiary,
  },
  eventBody: {
    flex: 1,
  },
  eventTitle: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textPrimary,
  },
  eventLocation: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textTertiary,
    textTransform: "none",
    marginTop: 2,
  },
});
