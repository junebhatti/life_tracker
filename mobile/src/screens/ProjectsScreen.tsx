import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
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

export default function ProjectsScreen() {
  const { projects } = useAppState();
  const groups = useMemo(() => groupProjects(projects), [projects]);
  const activeCount = projects.filter((p) => p.group === "Active").length;

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
            <View key={p.id} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: p.color }]} />
              <View style={styles.body}>
                <Text style={styles.name}>{p.name}</Text>
                <Text style={styles.meta}>{p.meta}</Text>
              </View>
            </View>
          ))}
        </View>
      ))}
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
    marginTop: 4,
  },
  body: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 19,
    color: colors.textPrimary,
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 0.2,
    textTransform: "none",
    color: colors.textTertiary,
    marginTop: 3,
  },
});
