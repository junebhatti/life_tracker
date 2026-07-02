import React, { useMemo } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, fonts } from "../theme";
import { useAppState } from "../state/AppState";
import PageHeader from "../components/PageHeader";
import type { Project, ProjectGroup } from "../types";

const GROUP_ORDER: ProjectGroup[] = ["Active", "Retainers", "Areas"];

function groupProjects(projects: Project[]) {
  return GROUP_ORDER.map((group) => ({
    group,
    projects: projects.filter((p) => p.group === group),
  })).filter((g) => g.projects.length > 0);
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

function ProjectDetail({ project, onClose }: { project: Project; onClose: () => void }) {
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

        {project.meta ? (
          <Text style={styles.sheetMeta}>{project.meta}</Text>
        ) : null}

        <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent}>
          {project.milestones.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Milestones</Text>
              {project.milestones.map((m) => (
                <View key={m.id} style={styles.itemRow}>
                  <CheckIcon done={m.done} />
                  <Text style={[styles.itemText, m.done && styles.itemDone]}>{m.text}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {project.checklist.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Checklist</Text>
              {project.checklist.map((c) => (
                <View key={c.id} style={styles.itemRow}>
                  <CheckIcon done={c.done} />
                  <Text style={[styles.itemText, c.done && styles.itemDone]}>{c.text}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {project.milestones.length === 0 && project.checklist.length === 0 ? (
            <Text style={styles.empty}>No milestones or checklist items yet.</Text>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function ProjectsScreen() {
  const { projects, selectedProjectId, openProject } = useAppState();
  const groups = useMemo(() => groupProjects(projects), [projects]);
  const activeCount = projects.filter((p) => p.group === "Active").length;
  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  return (
    <View>
      <PageHeader
        label="Active Work"
        title="Projects"
        sub={`${activeCount} active · ${projects.length} total`}
      />
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

      {selectedProject ? (
        <ProjectDetail project={selectedProject} onClose={() => openProject(null)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  body: { flex: 1 },
  name: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 19,
    color: colors.textPrimary,
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textTertiary,
    marginTop: 3,
  },
  chevron: {
    fontSize: 20,
    color: colors.chevron,
    marginTop: 1,
  },
  sheetWrap: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 18,
    color: colors.textPrimary,
  },
  sheetClose: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.textTertiary,
  },
  sheetMeta: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textTertiary,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetScroll: { flex: 1 },
  sheetContent: { paddingHorizontal: 20, paddingBottom: 40 },
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
  checkBoxDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  itemText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  itemDone: {
    color: colors.textTertiary,
    textDecorationLine: "line-through",
  },
  empty: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textFaint,
    fontStyle: "italic",
    marginTop: 32,
    textAlign: "center",
  },
});
