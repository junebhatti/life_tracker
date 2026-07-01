import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fonts } from "../theme";
import { useAppState } from "../state/AppState";

const TOOLBAR_BUTTONS: { key: string; label: string; insert: string }[] = [
  { key: "h1", label: "H1", insert: "# " },
  { key: "h2", label: "H2", insert: "## " },
  { key: "h3", label: "H3", insert: "### " },
];

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export default function NoteEditor() {
  const { notes, selectedNoteId, openNote, updateNote } = useAppState();
  const note = notes.find((n) => n.id === selectedNoteId) ?? null;

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (note) {
      setTitle(note.label);
      setBody(note.body);
    }
  }, [note?.id]);

  if (!note) return null;

  const close = () => {
    updateNote(note.id, { label: title, body });
    openNote(null);
  };

  const insertAtCursor = (text: string) => {
    setBody((prev) => prev + (prev.endsWith("\n") || prev.length === 0 ? "" : "\n") + text);
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.topNav}>
        <Pressable onPress={close}>
          <Text style={styles.back}>{"← Library"}</Text>
        </Pressable>
        <Text style={styles.date}>{note.date}</Text>
        <Pressable onPress={close}>
          <Text style={styles.done}>Done</Text>
        </Pressable>
      </View>

      <View style={styles.titleSection}>
        <Text style={styles.category}>{note.category.toUpperCase()}</Text>
        <TextInput style={styles.titleInput} value={title} onChangeText={setTitle} />
        <View style={styles.tagRow}>
          {note.tags.map((tag) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          <View style={styles.addTagChip}>
            <Text style={styles.addTagText}>+ TAG</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.bodyContent}>
        <TextInput
          style={styles.bodyInput}
          value={body}
          onChangeText={setBody}
          placeholder="Start writing…"
          placeholderTextColor={colors.textFaint}
          multiline
        />
      </ScrollView>

      <View style={styles.toolbar}>
        <View style={styles.toolbarRow}>
          {TOOLBAR_BUTTONS.map((btn) => (
            <Pressable key={btn.key} style={styles.toolbarBtn} onPress={() => insertAtCursor(btn.insert)}>
              <Text style={styles.toolbarBtnText}>{btn.label}</Text>
            </Pressable>
          ))}
          <View style={styles.toolbarDivider} />
          <Pressable style={styles.toolbarBtn} onPress={() => insertAtCursor("**bold**")}>
            <Text style={[styles.toolbarBtnText, { fontWeight: "700" }]}>B</Text>
          </Pressable>
          <Pressable style={styles.toolbarBtn} onPress={() => insertAtCursor("_italic_")}>
            <Text style={[styles.toolbarBtnText, { fontStyle: "italic" }]}>I</Text>
          </Pressable>
          <Pressable style={styles.toolbarBtn} onPress={() => insertAtCursor("> ")}>
            <Text style={styles.toolbarBtnText}>{'"'}</Text>
          </Pressable>
          <Pressable style={styles.toolbarBtn} onPress={() => insertAtCursor("\n\n---\n\n")}>
            <Text style={styles.toolbarBtnText}>—</Text>
          </Pressable>
        </View>
        <Text style={styles.wordCount}>{wordCount(body)} words</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    backgroundColor: colors.background,
    flexDirection: "column",
  },
  topNav: {
    paddingTop: 52,
    paddingHorizontal: 18,
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  back: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: "#8a8783",
  },
  date: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textTertiary,
  },
  done: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  titleSection: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  category: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: colors.textTertiary,
  },
  titleInput: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.textPrimary,
    marginTop: 6,
    padding: 0,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  tagChip: {
    backgroundColor: colors.chipBg,
    borderRadius: 5,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  tagText: {
    fontFamily: fonts.monoMedium,
    fontSize: 9.5,
    color: colors.chipText,
  },
  addTagChip: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.chipDashed,
    borderRadius: 5,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  addTagText: {
    fontFamily: fonts.monoMedium,
    fontSize: 9.5,
    color: colors.textTertiary,
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    flexGrow: 1,
  },
  bodyInput: {
    fontFamily: fonts.serifRegular,
    fontSize: 16,
    lineHeight: 28,
    color: colors.textPrimary,
    flex: 1,
    padding: 0,
    textAlignVertical: "top",
  },
  toolbar: {
    backgroundColor: colors.chipBg,
    borderTopWidth: 1,
    borderTopColor: "#e2dbd2",
    paddingTop: 10,
    paddingHorizontal: 12,
    paddingBottom: 30,
  },
  toolbarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  toolbarBtn: {
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 6,
  },
  toolbarBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  toolbarDivider: {
    width: 1,
    height: 16,
    backgroundColor: "#e2dbd2",
    marginHorizontal: 4,
  },
  wordCount: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textFaint,
    textAlign: "right",
    marginTop: 6,
  },
});
