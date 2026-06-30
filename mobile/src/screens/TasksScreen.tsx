import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";
import { useAppState } from "../state/AppState";
import PageHeader from "../components/PageHeader";
import TaskRow from "../components/TaskRow";
import type { Task } from "../types";

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function groupTasks(tasks: Task[]) {
  const now = new Date();
  const TODAY_ISO = isoDate(now);
  const TOMORROW_ISO = isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const groups: { label: string; tasks: Task[] }[] = [
    { label: "Overdue", tasks: [] },
    { label: "Today", tasks: [] },
    { label: "Tomorrow", tasks: [] },
    { label: "Upcoming", tasks: [] },
    { label: "No date", tasks: [] },
  ];
  for (const t of tasks) {
    if (t.overdue) groups[0].tasks.push(t);
    else if (t.dueDate === TODAY_ISO) groups[1].tasks.push(t);
    else if (t.dueDate === TOMORROW_ISO) groups[2].tasks.push(t);
    else if (t.dueDate) groups[3].tasks.push(t);
    else groups[4].tasks.push(t);
  }
  return groups.filter((g) => g.tasks.length > 0);
}

export default function TasksScreen() {
  const { tasks } = useAppState();
  const openTasks = tasks.filter((t) => !t.done);
  const groups = useMemo(() => groupTasks(openTasks), [openTasks]);

  return (
    <View>
      <PageHeader
        label="All Tasks"
        title="Tasks"
        sub={`${openTasks.length} open · ${tasks.length} total`}
      />
      {groups.map((g) => (
        <View key={g.label}>
          <View style={styles.groupHeader}>
            <Text style={styles.groupLabel}>{`${g.label} · ${g.tasks.length}`}</Text>
          </View>
          {g.tasks.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  groupHeader: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 7,
    marginTop: 24,
  },
  groupLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: colors.textSecondary,
  },
});
