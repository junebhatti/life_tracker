import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, fonts } from "../theme";
import { useAppState } from "../state/AppState";
import PageHeader from "../components/PageHeader";
import TaskRow from "../components/TaskRow";
import FlashcardsScreen from "./FlashcardsScreen";
import type { Project, ProjectGroup, ProjectType } from "../types";

// "Practice" is rendered as its own always-visible section (below), so it's
// deliberately excluded here — the generic groups only show when non-empty.
const GROUP_ORDER: ProjectGroup[] = ["Active", "Retainers", "Areas"];
const PROJECT_COLORS = ["#b91c1c", "#c2410c", "#a16207", "#16a34a", "#0d9488", "#2563eb", "#7c3aed", "#6b7280"];
const TYPE_OPTIONS: { value: ProjectType; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "retainer", label: "Retainer" },
  { value: "area", label: "Area" },
  { value: "practice", label: "Practice" },
];

function groupProjects(projects: Project[]) {
  return GROUP_ORDER.map((group) => ({
    group,
    projects: projects.filter((p) => p.group === group),
  })).filter((g) => g.projects.length > 0);
}

function projectHours(project: Project): number {
  const minutes = project.activity
    .filter((a) => a.kind === "work")
    .reduce((s, a) => s + (a.minutes ?? 0), 0);
  return Math.round((minutes / 60) * 10) / 10;
}

function activityTime(at: string): string {
  return new Date(at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function CheckIcon({ done }: { done: boolean }) {
  return (
    <View style={[styles.checkBox, done && styles.checkBoxDone]}>
      {done ? (
        <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
          <Path d="M5 12l5 5L19 7" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ) : null}
    </View>
  );
}

function AddRow({ placeholder, onSubmit }: { placeholder: string; onSubmit: (text: string) => void }) {
  const [text, setText] = useState("");
  function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setText("");
  }
  return (
    <View style={styles.addRow}>
      <TextInput
        style={styles.addInput}
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        onSubmitEditing={submit}
        returnKeyType="done"
      />
      <Pressable style={styles.addBtn} onPress={submit} hitSlop={8}>
        <Text style={styles.addBtnText}>Add</Text>
      </Pressable>
    </View>
  );
}

// ── activity logger ───────────────────────────────────────────────────────────

function ActivityForm({ onLog }: { onLog: (e: { kind: "work" | "update"; note: string; minutes?: number }) => void }) {
  const [kind, setKind] = useState<"work" | "update">("work");
  const [note, setNote] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");

  function submit() {
    if (!note.trim()) return;
    const mins = kind === "work" ? (Number(hours) || 0) * 60 + (Number(minutes) || 0) : undefined;
    onLog({ kind, note: note.trim(), minutes: mins });
    setNote(""); setHours(""); setMinutes("");
  }

  return (
    <View style={styles.activityForm}>
      <View style={styles.kindToggle}>
        {(["work", "update"] as const).map((k) => (
          <Pressable key={k} style={[styles.kindBtn, kind === k && styles.kindBtnActive]} onPress={() => setKind(k)}>
            <Text style={[styles.kindText, kind === k && styles.kindTextActive]}>{k.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        style={styles.activityInput}
        value={note}
        onChangeText={setNote}
        placeholder={kind === "work" ? "What did you work on?" : "Post an update…"}
        placeholderTextColor={colors.textTertiary}
      />
      <View style={styles.activityBottom}>
        {kind === "work" ? (
          <View style={styles.timeRow}>
            <TextInput style={styles.timeInput} value={hours} onChangeText={setHours} placeholder="0" placeholderTextColor={colors.textTertiary} keyboardType="number-pad" />
            <Text style={styles.timeUnit}>h</Text>
            <TextInput style={styles.timeInput} value={minutes} onChangeText={setMinutes} placeholder="00" placeholderTextColor={colors.textTertiary} keyboardType="number-pad" />
            <Text style={styles.timeUnit}>m</Text>
          </View>
        ) : <View />}
        <Pressable style={styles.addBtn} onPress={submit}>
          <Text style={styles.addBtnText}>Log</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── project detail ────────────────────────────────────────────────────────────

function ProjectDetail({ project, onClose }: { project: Project; onClose: () => void }) {
  const { toggleMilestone, toggleChecklistItem, addMilestone, addChecklistItem, addActivity, addTask, tasks } = useAppState();
  const openTasks = tasks.filter((t) => t.projectId === project.id && !t.done);
  const hours = projectHours(project);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheetWrap}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <View style={[styles.dot, { backgroundColor: project.color }]} />
          <Text style={styles.sheetTitle}>{project.name}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.sheetClose}>✕</Text>
          </Pressable>
        </View>

        {project.meta ? <Text style={styles.sheetMeta}>{project.meta}</Text> : null}

        <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent}>
          <View style={styles.hoursRow}>
            <Text style={styles.hoursValue}>{hours.toFixed(1)}</Text>
            <Text style={styles.hoursLabel}>hours logged</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{`Milestones${project.milestones.length ? ` · ${project.milestones.length}` : ""}`}</Text>
            {project.milestones.map((m) => (
              <Pressable key={m.id} style={styles.itemRow} onPress={() => toggleMilestone(project.id, m.id)}>
                <CheckIcon done={m.done} />
                <Text style={[styles.itemText, m.done && styles.itemDone]}>{m.title}</Text>
              </Pressable>
            ))}
            {project.milestones.length === 0 ? <Text style={styles.empty}>No milestones yet.</Text> : null}
            <AddRow placeholder="+ Add milestone…" onSubmit={(text) => addMilestone(project.id, text)} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{`Open Tasks${openTasks.length ? ` · ${openTasks.length}` : ""}`}</Text>
            {openTasks.map((t) => <TaskRow key={t.id} task={t} />)}
            {openTasks.length === 0 ? (
              <Text style={styles.empty}>No open tasks yet.</Text>
            ) : null}
            <AddRow placeholder="+ Add task…" onSubmit={(text) => addTask(text, { projectId: project.id })} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{`Checklist${project.checklist.length ? ` · ${project.checklist.length}` : ""}`}</Text>
            {project.checklist.map((c) => (
              <Pressable key={c.id} style={styles.itemRow} onPress={() => toggleChecklistItem(project.id, c.id)}>
                <CheckIcon done={c.done} />
                <Text style={[styles.itemText, c.done && styles.itemDone]}>{c.title}</Text>
              </Pressable>
            ))}
            {project.checklist.length === 0 ? <Text style={styles.empty}>No checklist items yet.</Text> : null}
            <AddRow placeholder="+ Add checklist item…" onSubmit={(text) => addChecklistItem(project.id, text)} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{`Activity${project.activity.length ? ` · ${project.activity.length}` : ""}`}</Text>
            <ActivityForm onLog={(e) => addActivity(project.id, e)} />
            {project.activity.map((a) => (
              <View key={a.id} style={styles.activityItem}>
                <Text style={styles.activityNote}>{a.note}</Text>
                <Text style={styles.activityMeta}>
                  {a.kind === "work" && a.minutes ? `${(a.minutes / 60).toFixed(2)}h · ` : ""}
                  {a.kind} · {activityTime(a.at)}
                </Text>
              </View>
            ))}
            {project.activity.length === 0 ? <Text style={styles.empty}>No activity logged yet.</Text> : null}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── new project ───────────────────────────────────────────────────────────────

function NewProjectModal({ onClose }: { onClose: () => void }) {
  const { addProject, openProject } = useAppState();
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [type, setType] = useState<ProjectType>("active");
  const [color, setColor] = useState(PROJECT_COLORS[0]);

  function create() {
    if (!name.trim()) return;
    const id = addProject({ name, client: client || undefined, type, color });
    onClose();
    openProject(id);
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheetWrap}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>New project</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.sheetClose}>✕</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent}>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput style={styles.field} value={name} onChangeText={setName} placeholder="Project name" placeholderTextColor={colors.textTertiary} autoFocus />

          <Text style={styles.fieldLabel}>Client / Area</Text>
          <TextInput style={styles.field} value={client} onChangeText={setClient} placeholder="e.g. Hill Media Group" placeholderTextColor={colors.textTertiary} />

          <Text style={styles.fieldLabel}>Type</Text>
          <View style={styles.typeRow}>
            {TYPE_OPTIONS.map((opt) => (
              <Pressable key={opt.value} style={[styles.typeBtn, type === opt.value && styles.typeBtnActive]} onPress={() => setType(opt.value)}>
                <Text style={[styles.typeText, type === opt.value && styles.typeTextActive]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Color</Text>
          <View style={styles.colorRow}>
            {PROJECT_COLORS.map((c) => (
              <Pressable key={c} onPress={() => setColor(c)} style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchActive]} />
            ))}
          </View>

          <Pressable style={[styles.createBtn, !name.trim() && styles.createBtnDisabled]} onPress={create} disabled={!name.trim()}>
            <Text style={styles.createBtnText}>Create project</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── practice: flashcards ────────────────────────────────────────────────────────
// Flashcards lives inside Projects (under "Practice") instead of its own
// bottom-nav tab — one less tab, and a natural home next to future
// skill-building projects.

function FlashcardsModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheetWrap}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <View style={[styles.dot, { backgroundColor: "#b23a2e" }]} />
          <Text style={styles.sheetTitle}>Urdu Flashcards</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.sheetClose}>✕</Text>
          </Pressable>
        </View>
        <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent}>
          <FlashcardsScreen />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── screen ────────────────────────────────────────────────────────────────────

export default function ProjectsScreen() {
  const { projects, selectedProjectId, openProject } = useAppState();
  const [showNew, setShowNew] = useState(false);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const groups = useMemo(() => groupProjects(projects), [projects]);
  const practiceProjects = useMemo(() => projects.filter((p) => p.group === "Practice"), [projects]);
  const activeCount = projects.filter((p) => p.group === "Active").length;
  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  return (
    <View>
      <PageHeader label="Active Work" title="Projects" sub={`${activeCount} active · ${projects.length} total`} />

      <Pressable style={styles.newBtn} onPress={() => setShowNew(true)}>
        <Text style={styles.newBtnText}>+ New project</Text>
      </Pressable>

      {groups.map((g) => (
        <View key={g.group}>
          <Text style={styles.groupLabel}>{`${g.group} · ${g.projects.length}`}</Text>
          {g.projects.map((p) => (
            <Pressable key={p.id} style={styles.row} onPress={() => openProject(p.id)}>
              <View style={[styles.dot, { backgroundColor: p.color }]} />
              <View style={styles.body}>
                <Text style={styles.name}>{p.name}</Text>
                {p.meta ? <Text style={styles.meta}>{p.meta}</Text> : null}
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>
      ))}

      {/* Practice — always shown (Flashcards lives here), unlike the groups above */}
      <View>
        <Text style={styles.groupLabel}>{`Practice · ${practiceProjects.length + 1}`}</Text>
        <Pressable style={styles.row} onPress={() => setShowFlashcards(true)}>
          <View style={[styles.dot, { backgroundColor: "#b23a2e" }]} />
          <View style={styles.body}>
            <Text style={styles.name}>Urdu Flashcards</Text>
            <Text style={styles.meta}>Elementary Urdu II</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        {practiceProjects.map((p) => (
          <Pressable key={p.id} style={styles.row} onPress={() => openProject(p.id)}>
            <View style={[styles.dot, { backgroundColor: p.color }]} />
            <View style={styles.body}>
              <Text style={styles.name}>{p.name}</Text>
              {p.meta ? <Text style={styles.meta}>{p.meta}</Text> : null}
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>

      {projects.length === 0 ? (
        <Text style={styles.empty}>No projects yet. Tap “+ New project” to create one.</Text>
      ) : null}

      {selectedProject ? <ProjectDetail project={selectedProject} onClose={() => openProject(null)} /> : null}
      {showNew ? <NewProjectModal onClose={() => setShowNew(false)} /> : null}
      {showFlashcards ? <FlashcardsModal onClose={() => setShowFlashcards(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  newBtn: {
    alignSelf: "flex-start",
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.surfaceDark,
  },
  newBtnText: { fontFamily: fonts.sansMedium, fontSize: 13, color: "#fff" },
  groupLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: colors.textSecondary,
    marginTop: 28,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  body: { flex: 1 },
  name: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 19, color: colors.textPrimary },
  meta: { fontFamily: fonts.mono, fontSize: 10.5, color: colors.textTertiary, marginTop: 3 },
  chevron: { fontSize: 20, color: colors.chevron, marginTop: 1 },
  sheetWrap: { flex: 1, backgroundColor: colors.background, paddingTop: 12 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 16 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 18, color: colors.textPrimary },
  sheetClose: { fontFamily: fonts.sans, fontSize: 16, color: colors.textTertiary },
  sheetMeta: { fontFamily: fonts.mono, fontSize: 11, color: colors.textTertiary, paddingHorizontal: 20, paddingTop: 10 },
  sheetScroll: { flex: 1 },
  sheetContent: { paddingHorizontal: 20, paddingBottom: 60 },
  hoursRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 20 },
  hoursValue: { fontFamily: fonts.serif, fontSize: 30, color: colors.textPrimary },
  hoursLabel: { fontFamily: fonts.mono, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, color: colors.textTertiary },
  section: { marginTop: 24 },
  sectionLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: colors.textSecondary,
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  checkBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.chevron,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkBoxDone: { backgroundColor: colors.success, borderColor: colors.success },
  itemText: { flex: 1, fontFamily: fonts.sans, fontSize: 15, lineHeight: 21, color: colors.textPrimary },
  itemDone: { color: colors.textTertiary, textDecorationLine: "line-through" },
  empty: { fontFamily: fonts.sans, fontSize: 14, color: colors.textFaint, fontStyle: "italic", marginTop: 6, marginBottom: 8 },
  addRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  addInput: {
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
  addBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.surfaceDark },
  addBtnText: { fontFamily: fonts.sansMedium, fontSize: 12.5, color: "#fff" },
  // activity
  activityForm: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginBottom: 14 },
  kindToggle: { flexDirection: "row", gap: 6, marginBottom: 10 },
  kindBtn: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  kindBtnActive: { backgroundColor: colors.surfaceDark, borderColor: colors.surfaceDark },
  kindText: { fontFamily: fonts.monoMedium, fontSize: 9.5, letterSpacing: 1, color: colors.textSecondary },
  kindTextActive: { color: "#fff" },
  activityInput: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  activityBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  timeInput: {
    width: 44,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    textAlign: "center",
  },
  timeUnit: { fontFamily: fonts.mono, fontSize: 12, color: colors.textTertiary, marginRight: 6 },
  activityItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  activityNote: { fontFamily: fonts.sans, fontSize: 14, color: colors.textPrimary },
  activityMeta: { fontFamily: fonts.mono, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: colors.textTertiary, marginTop: 3 },
  // new project form
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
  typeRow: { flexDirection: "row", gap: 7 },
  typeBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  typeBtnActive: { backgroundColor: colors.surfaceDark, borderColor: colors.surfaceDark },
  typeText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.textSecondary },
  typeTextActive: { color: "#fff" },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: "transparent" },
  swatchActive: { borderColor: colors.textPrimary },
  createBtn: { marginTop: 28, backgroundColor: colors.surfaceDark, borderRadius: 11, paddingVertical: 14, alignItems: "center" },
  createBtnDisabled: { opacity: 0.4 },
  createBtnText: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: "#fff" },
});
