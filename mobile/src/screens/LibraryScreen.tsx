import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, fonts, radius } from "../theme";
import { useAppState } from "../state/AppState";
import PageHeader from "../components/PageHeader";
import NoteEditor from "../components/NoteEditor";
import type { LibraryFilter, LibraryNote } from "../types";

const FILTERS: LibraryFilter[] = ["All", "Notes", "Quotes", "Journal", "Books", "Inventory", "Podcasts", "People"];

function Chevron() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={colors.chevron} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TrashIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.textTertiary} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function LibraryScreen() {
  const { notes, people, libFilter, setLibFilter, openNote, deleteNote } = useAppState();

  function confirmDelete(note: LibraryNote) {
    Alert.alert(
      "Delete entry",
      `Delete "${note.label}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteNote(note.id) },
      ],
    );
  }

  const filteredNotes =
    libFilter === "All" || libFilter === "People" ? notes : notes.filter((n) => n.category === libFilter);

  const headerSub =
    libFilter === "People" ? `${people.length} contacts` : `${notes.length} entries`;

  return (
    <View>
      <PageHeader label="Archive" title="Library" sub={headerSub} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {FILTERS.map((f) => {
          const active = f === libFilter;
          return (
            <Pressable
              key={f}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setLibFilter(f)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {libFilter === "People" ? (
        <>
          <View style={styles.addPersonBar}>
            <TextInput
              style={styles.addPersonInput}
              placeholder="Add a person…"
              placeholderTextColor={colors.textTertiary}
            />
            <Pressable>
              <Text style={styles.addBtn}>ADD</Text>
            </Pressable>
          </View>
          {people.map((p) => (
            <View key={p.id} style={styles.personRow}>
              <View style={styles.personBody}>
                <Text style={styles.personName}>{p.name}</Text>
                <Text style={styles.personMeta}>
                  {[p.org, `${p.noteCount} ${p.noteCount === 1 ? "note" : "notes"}`]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </View>
              <Chevron />
            </View>
          ))}
        </>
      ) : (
        filteredNotes.map((n) => (
          <Pressable key={n.id} style={styles.noteRow} onPress={() => openNote(n.id)}>
            <View style={styles.noteHeader}>
              <View style={styles.noteHeaderLeft}>
                <Text style={styles.noteLabel}>{n.label}</Text>
                {n.sub ? <Text style={styles.noteSub}>{` · ${n.sub}`}</Text> : null}
              </View>
              <View style={styles.noteHeaderRight}>
                <Text style={styles.noteDate}>{n.date}</Text>
                <Pressable
                  onPress={(e) => { e.stopPropagation(); confirmDelete(n); }}
                  hitSlop={8}
                  style={styles.deleteBtn}
                >
                  <TrashIcon />
                </Pressable>
                <Text style={styles.noteChevron}>›</Text>
              </View>
            </View>
            <Text style={styles.noteBody} numberOfLines={3}>
              {n.body}
            </Text>
          </Pressable>
        ))
      )}

      <NoteEditor />
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    marginTop: 16,
    marginBottom: 4,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: radius.chip,
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: colors.surfaceDark,
  },
  chipText: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 10.5,
    textTransform: "uppercase",
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.background,
  },
  addPersonBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.input,
    paddingVertical: 11,
    paddingHorizontal: 13,
    marginTop: 16,
  },
  addPersonInput: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
    padding: 0,
  },
  addBtn: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.textPrimary,
  },
  personRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  personBody: {
    flex: 1,
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  noteHeaderLeft: {
    flexDirection: "row",
    flexShrink: 1,
  },
  noteLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 10.5,
    letterSpacing: 0.4,
    color: colors.textPrimary,
  },
  noteSub: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textFaint,
  },
  noteHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deleteBtn: {
    padding: 2,
  },
  noteDate: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textTertiary,
  },
  noteChevron: {
    fontSize: 16,
    color: colors.chevron,
  },
  noteBody: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
    marginTop: 6,
  },
});
