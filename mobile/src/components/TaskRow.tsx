import React, { useEffect, useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";
import type { Task } from "../types";
import { useAppState } from "../state/AppState";
import { thingsAddUrl } from "../lib/things";

export default function TaskRow({ task }: { task: Task }) {
  const { toggleTaskDone, toggleTaskStar, showToast, projects } = useAppState();
  const [pendingDone, setPendingDone] = useState(false);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resolve the tagged project (freshly-captured tasks carry name/color inline;
  // tasks loaded from the DB only carry projectId, so look it up here).
  const project = task.projectId ? projects.find((p) => p.id === task.projectId) : undefined;
  const projectName = task.projectName ?? project?.name;
  const projectColor = task.projectColor ?? project?.color;

  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);

  function sendToThings() {
    Linking.openURL(thingsAddUrl(task)).catch(() =>
      showToast("Couldn't open Things — is it installed?"),
    );
  }

  const visuallyDone = task.done || pendingDone;

  function handleToggle() {
    if (task.done) {
      toggleTaskDone(task.id);
      return;
    }
    if (pendingDone) {
      if (undoTimer.current) clearTimeout(undoTimer.current);
      undoTimer.current = null;
      setPendingDone(false);
      return;
    }
    setPendingDone(true);
    undoTimer.current = setTimeout(() => {
      toggleTaskDone(task.id);
      setPendingDone(false);
      undoTimer.current = null;
    }, 1500);
  }

  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.checkbox, visuallyDone && styles.checkboxDone]}
        onPress={handleToggle}
      >
        {visuallyDone ? <View style={styles.checkboxFill} /> : null}
      </Pressable>
      <View style={styles.body}>
        <Text style={[styles.title, task.done && styles.titleDone]}>{task.title}</Text>
        {projectName ? (
          <View style={styles.metaRow}>
            {projectColor ? (
              <View style={[styles.dot, { backgroundColor: projectColor }]} />
            ) : null}
            <Text style={styles.metaText}>{projectName}</Text>
            {task.dueLabel ? (
              <Text style={[styles.metaText, task.overdue && styles.metaOverdue]}>
                {" · " + task.dueLabel}
              </Text>
            ) : null}
            {task.recurring ? <Text style={styles.metaText}> ↻</Text> : null}
          </View>
        ) : null}
      </View>
      <Pressable onPress={sendToThings} hitSlop={8} style={styles.thingsBtn}>
        <Text style={styles.thingsText}>Things</Text>
      </Pressable>
      <Pressable onPress={() => toggleTaskStar(task.id)} hitSlop={8}>
        <Text style={[styles.star, task.starred ? styles.starFilled : styles.starHollow]}>
          {task.starred ? "★" : "☆"}
        </Text>
      </Pressable>
      {pendingDone ? (
        <Pressable onPress={handleToggle} hitSlop={8} style={styles.undoBtn}>
          <Text style={styles.undoText}>Undo</Text>
        </Pressable>
      ) : null}
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
  thingsBtn: {
    marginTop: 2,
  },
  thingsText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: colors.textTertiary,
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
  undoBtn: {
    marginLeft: 6,
  },
  undoText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textTertiary,
    textDecorationLine: "underline",
  },
});
