import React, { useMemo } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { colors, fonts, radius } from "../theme";
import { useAppState } from "../state/AppState";
import PageHeader from "../components/PageHeader";
import TaskRow from "../components/TaskRow";

function SearchIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={7} stroke={colors.textTertiary} strokeWidth={2} />
      <Line x1={21} y1={21} x2={16.65} y2={16.65} stroke={colors.textTertiary} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export default function SearchScreen() {
  const { tasks, people, notes, query, setQuery } = useAppState();

  const q = query.trim().toLowerCase();

  const taskResults = useMemo(
    () => (q ? tasks.filter((t) => t.title.toLowerCase().includes(q)) : []),
    [tasks, q],
  );
  const peopleResults = useMemo(
    () => (q ? people.filter((p) => p.name.toLowerCase().includes(q)) : []),
    [people, q],
  );
  const noteResults = useMemo(
    () =>
      q
        ? notes.filter(
            (n) => n.body.toLowerCase().includes(q) || n.label.toLowerCase().includes(q),
          )
        : [],
    [notes, q],
  );

  const hasResults = taskResults.length + peopleResults.length + noteResults.length > 0;

  return (
    <View>
      <PageHeader label="Find" title="Search" sub="" />

      <View style={styles.searchBar}>
        <SearchIcon />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search tasks, people, notes…"
          placeholderTextColor={colors.textTertiary}
        />
      </View>

      {!q ? (
        <Text style={styles.empty}>Search across every task, note, journal and contact.</Text>
      ) : !hasResults ? (
        <Text style={styles.empty}>No results found.</Text>
      ) : (
        <>
          {taskResults.length > 0 ? (
            <View>
              <Text style={styles.groupLabel}>{`Tasks · ${taskResults.length}`}</Text>
              {taskResults.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </View>
          ) : null}

          {peopleResults.length > 0 ? (
            <View>
              <Text style={styles.groupLabel}>{`People · ${peopleResults.length}`}</Text>
              {peopleResults.map((p) => (
                <View key={p.id} style={styles.personRow}>
                  <Text style={styles.personName}>{p.name}</Text>
                  <Text style={styles.personMeta}>
                    {[p.org, `${p.noteCount} notes`].filter(Boolean).join(" · ")}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {noteResults.length > 0 ? (
            <View>
              <Text style={styles.groupLabel}>{`Notes · ${noteResults.length}`}</Text>
              {noteResults.map((n) => (
                <View key={n.id} style={styles.noteRow}>
                  <Text style={styles.noteLabel}>{n.label}</Text>
                  <Text style={styles.noteBody} numberOfLines={2}>
                    {n.body}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.input,
    paddingVertical: 11,
    paddingHorizontal: 13,
    marginTop: 16,
  },
  input: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
    padding: 0,
  },
  empty: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textTertiary,
    marginTop: 40,
    textAlign: "center",
  },
  groupLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: colors.textSecondary,
    marginTop: 24,
    marginBottom: 6,
  },
  personRow: {
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  personName: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.textPrimary,
  },
  personMeta: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textTertiary,
    marginTop: 3,
  },
  noteRow: {
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  noteLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 10.5,
    color: colors.textPrimary,
  },
  noteBody: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
