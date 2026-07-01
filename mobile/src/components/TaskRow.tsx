import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";
import type { Task } from "../types";
import { useAppState } from "../state/AppState";

export default function TaskRow({ task }: { task: Task }) {
  const { toggleTaskDone, toggleTaskStar } = useAppState();
  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.checkbox, task.done && styles.checkboxDone]}
        onPress={() => toggleTaskDone(task.id)}
      >
        {task.done ? <View style={styles.checkboxFill} /> : null}
      </Pressable>
      <View style={styles.body}>
        <Text style={[styles.title, task.done && styles.titleDone]}>{task.title}</Text>
        {task.projectName ? (
          <View style={styles.metaRow}>
            {task.projectColor ? (
              <View style={[styles.dot, { backgroundColor: task.projectColor }]} />
            ) : null}
            <Text style={styles.metaText}>{task.projectName}</Text>
            {task.dueLabel ? (
              <Text style={[styles.metaText, task.overdue && styles.metaOverdue]}>
                {" · " + task.dueLabel}
              </Text>
            ) : null}
            {task.recurring ? <Text style={styles.metaText}> ↻</Text> : null}
          </View>
        ) : null}
      </View>
      <Pressable onPress={() => toggleTaskStar(task.id)} hitSlop={8}>
        <Text style={[styles.star, task.starred ? styles.starFilled : styles.starHollow]}>
          {task.starred ? "★" : "☆"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  checkbox: {
    width: 17,
    height: 17,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.chevron,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkboxFill: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: "#fff",
  },
  body: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  titleDone: {
    color: colors.textTertiary,
    textDecorationLine: "line-through",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  metaText: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textTertiary,
  },
  metaOverdue: {
    color: colors.overdueRed,
  },
  star: {
    fontSize: 17,
    marginTop: 1,
  },
  starFilled: {
    color: colors.accentRed,
  },
  starHollow: {
    color: "#d3cabf",
  },
});
