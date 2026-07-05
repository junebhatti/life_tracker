import React, { useEffect, useRef, useState } from "react";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fonts } from "../theme";
import type { Task } from "../types";
import { useAppState } from "../state/AppState";
import { thingsAddUrl } from "../lib/things";

// ── edit modal ───────────────────────────────────────────────────────────────

function TaskEditModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const { projects, updateTask, deleteTask } = useAppState();
  const [title, setTitle] = useState(task.title);
  const [projectId, setProjectId] = useState(task.projectId ?? "");
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [recurrence, setRecurrence] = useState(task.recurrence ?? "");
  const [starred, setStarred] = useState(task.starred);

  function save() {
    const trimmed = title.trim();
    if (!trimmed) return;
    updateTask(task.id, {
      title: trimmed,
      projectId: projectId || null,
      dueDate: dueDate.trim() || null,
      recurrence: recurrence.trim() || null,
      starred,
    });
    onClose();
  }

  function remove() {
    deleteTask(task.id);
    onClose();
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheetWrap}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Edit task</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.sheetClose}>✕</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent}>
          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput style={styles.field} value={title} onChangeText={setTitle} placeholder="Task name" placeholderTextColor={colors.textTertiary} autoFocus />

          <Text style={styles.fieldLabel}>Project</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <Pressable style={[styles.chip, !projectId && styles.chipActive]} onPress={() => setProjectId("")}>
              <Text style={[styles.chipText, !projectId && styles.chipTextActive]}>No project</Text>
            </Pressable>
            {projects.map((p) => (
              <Pressable key={p.id} style={[styles.chip, projectId === p.id && styles.chipActive]} onPress={() => setProjectId(p.id)}>
                <Text style={[styles.chipText, projectId === p.id && styles.chipTextActive]}>{p.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.fieldLabel}>Due date</Text>
          <TextInput
            style={styles.field}
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="YYYY-MM-DD (blank for none)"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
          />

          <Text style={styles.fieldLabel}>Repeat (optional)</Text>
          <TextInput
            style={styles.field}
            value={recurrence}
            onChangeText={setRecurrence}
            placeholder="e.g. Weekly"
            placeholderTextColor={colors.textTertiary}
          />

          <Pressable style={styles.starRow} onPress={() => setStarred((v) => !v)}>
            <View style={[styles.starCheckbox, starred && styles.starCheckboxActive]}>
              {starred ? <Text style={styles.starCheckboxMark}>✓</Text> : null}
            </View>
            <Text style={styles.starRowText}>Star as a Top 3 for today</Text>
          </Pressable>

          <View style={styles.actionsRow}>
            <Pressable style={styles.deleteBtn} onPress={remove}>
              <Text style={styles.deleteBtnText}>Delete</Text>
            </Pressable>
            <Pressable style={[styles.saveBtn, !title.trim() && styles.saveBtnDisabled]} onPress={save} disabled={!title.trim()}>
              <Text style={styles.saveBtnText}>Save</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── row ──────────────────────────────────────────────────────────────────────

export default function TaskRow({ task }: { task: Task }) {
  const { toggleTaskDone, toggleTaskStar, showToast, projects } = useAppState();
  const [pendingDone, setPendingDone] = useState(false);
  const [editing, setEditing] = useState(false);
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
    <>
    <View style={styles.row}>
      <Pressable
        style={[styles.checkbox, visuallyDone && styles.checkboxDone]}
        onPress={handleToggle}
      >
        {visuallyDone ? <View style={styles.checkboxFill} /> : null}
      </Pressable>
      <Pressable style={styles.body} onPress={() => setEditing(true)}>
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
      </Pressable>
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
    {editing ? <TaskEditModal task={task} onClose={() => setEditing(false)} /> : null}
    </>
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
  // edit modal
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
  fieldLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    color: colors.textSecondary,
    marginTop: 18,
    marginBottom: 7,
  },
  field: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
  },
  chipRow: { flexDirection: "row", gap: 7 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.surfaceDark, borderColor: colors.surfaceDark },
  chipText: { fontFamily: fonts.sansMedium, fontSize: 12.5, color: colors.textSecondary },
  chipTextActive: { color: "#fff" },
  starRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 22 },
  starCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.chevron,
    alignItems: "center",
    justifyContent: "center",
  },
  starCheckboxActive: { backgroundColor: colors.success, borderColor: colors.success },
  starCheckboxMark: { fontSize: 12, color: "#fff", fontWeight: "600" },
  starRowText: { fontFamily: fonts.sans, fontSize: 14.5, color: colors.textPrimary },
  actionsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 32 },
  deleteBtn: { paddingVertical: 12, paddingHorizontal: 10 },
  deleteBtnText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.accentRed },
  saveBtn: { backgroundColor: colors.surfaceDark, borderRadius: 11, paddingVertical: 12, paddingHorizontal: 28 },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: "#fff" },
});
