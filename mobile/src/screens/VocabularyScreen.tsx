import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fonts } from "../theme";
import { useAppState } from "../state/AppState";
import { sortWordsAlphabetically } from "../lib/vocab";
import type { VocabWord } from "../types";

// ── definition popup ─────────────────────────────────────────────────────────

function DefinitionModal({ word, onClose }: { word: VocabWord; onClose: () => void }) {
  const { updateVocabWord, deleteVocabWord } = useAppState();
  const [editing, setEditing] = useState(false);
  const [wordText, setWordText] = useState(word.word);
  const [definitionText, setDefinitionText] = useState(word.definition ?? "");

  function save() {
    updateVocabWord(word.id, { word: wordText, definition: definitionText });
    setEditing(false);
  }

  function remove() {
    deleteVocabWord(word.id);
    onClose();
  }

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {editing ? (
            <>
              <TextInput
                style={styles.titleInput}
                value={wordText}
                onChangeText={setWordText}
                autoFocus
              />
              <TextInput
                style={styles.definitionInput}
                value={definitionText}
                onChangeText={setDefinitionText}
                placeholder="Definition…"
                placeholderTextColor={colors.textTertiary}
                multiline
              />
              <View style={styles.editRow}>
                <Pressable style={styles.saveBtn} onPress={save}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </Pressable>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => {
                    setWordText(word.word);
                    setDefinitionText(word.definition ?? "");
                    setEditing(false);
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>{word.word}</Text>
              <Text style={styles.definition}>
                {word.definition || <Text style={styles.noDefinition}>No definition yet.</Text>}
              </Text>
              <View style={styles.actionRow}>
                <Pressable style={styles.editBtn} onPress={() => setEditing(true)}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </Pressable>
                <View style={styles.actionRowRight}>
                  <Pressable onPress={remove} hitSlop={8}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </Pressable>
                  <Pressable onPress={onClose} hitSlop={8}>
                    <Text style={styles.closeText}>Close</Text>
                  </Pressable>
                </View>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── screen ───────────────────────────────────────────────────────────────────

export default function VocabularyScreen({ onClose }: { onClose: () => void }) {
  const { vocabWords, addVocabWord } = useAppState();
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newWord, setNewWord] = useState("");
  const [newDefinition, setNewDefinition] = useState("");

  const sorted = useMemo(() => sortWordsAlphabetically(vocabWords), [vocabWords]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (w) => w.word.toLowerCase().includes(q) || (w.definition ?? "").toLowerCase().includes(q),
    );
  }, [sorted, search]);

  const active = activeId ? vocabWords.find((w) => w.id === activeId) ?? null : null;

  function submitNewWord() {
    if (!newWord.trim()) return;
    addVocabWord(newWord, newDefinition);
    setNewWord("");
    setNewDefinition("");
  }

  return (
    <View style={styles.root}>
      <View style={styles.sheetHandle} />
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>English Vocabulary</Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={styles.sheetClose}>✕</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
        <View style={styles.heroRow}>
          <Text style={styles.hero}>word list</Text>
          <Text style={styles.heroCount}>/{vocabWords.length}</Text>
        </View>
        <Text style={styles.subtitle}>Words collected while reading. Tap a word for its definition.</Text>

        <View style={styles.addRow}>
          <TextInput
            style={styles.addWordInput}
            value={newWord}
            onChangeText={setNewWord}
            placeholder="Add a word…"
            placeholderTextColor={colors.textTertiary}
            onSubmitEditing={submitNewWord}
          />
          <Pressable style={styles.addBtn} onPress={submitNewWord} disabled={!newWord.trim()}>
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        </View>
        <TextInput
          style={styles.addDefInput}
          value={newDefinition}
          onChangeText={setNewDefinition}
          placeholder="Definition (optional)"
          placeholderTextColor={colors.textTertiary}
          onSubmitEditing={submitNewWord}
        />

        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search words or definitions…"
          placeholderTextColor={colors.textTertiary}
        />

        {filtered.length === 0 ? (
          <Text style={styles.empty}>
            {vocabWords.length === 0 ? "No words yet — add one above." : "No words match your search."}
          </Text>
        ) : (
          <View style={{ marginTop: 6 }}>
            {filtered.map((w) => (
              <Pressable key={w.id} style={styles.row} onPress={() => setActiveId(w.id)}>
                <Text style={styles.rowWord}>{w.word}</Text>
                {!w.definition && <Text style={styles.rowNoDef}>no definition</Text>}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {active && <DefinitionModal word={active} onClose={() => setActiveId(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginTop: 12, marginBottom: 16 },
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
  sheetContent: { paddingHorizontal: 20, paddingBottom: 80 },

  heroRow: { flexDirection: "row", alignItems: "baseline", gap: 10, marginTop: 18 },
  hero: { fontFamily: fonts.serifRegular, fontSize: 34, color: colors.textPrimary, letterSpacing: -0.5 },
  heroCount: { fontFamily: fonts.serifRegular, fontSize: 20, color: colors.textTertiary },
  subtitle: { fontFamily: fonts.sans, fontSize: 13, color: colors.textSecondary, marginTop: 6 },

  addRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  addWordInput: {
    width: 130,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  addDefInput: {
    marginTop: 8,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  addBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.surfaceDark },
  addBtnText: { fontFamily: fonts.sansMedium, fontSize: 13, color: "#fff" },

  search: {
    marginTop: 14,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 11,
    backgroundColor: colors.surface,
  },

  empty: { fontFamily: fonts.sans, fontSize: 14, color: colors.textFaint, fontStyle: "italic", marginTop: 26, lineHeight: 20 },

  row: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowWord: { fontFamily: fonts.sans, fontSize: 16, color: colors.textPrimary },
  rowNoDef: { fontFamily: fonts.monoMedium, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: colors.textTertiary },

  // definition popup
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 20 },
  card: { width: "100%", maxWidth: 340, borderRadius: 16, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, padding: 20 },
  title: { fontFamily: fonts.sansSemiBold, fontSize: 22, color: colors.textPrimary },
  definition: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.textPrimary, marginTop: 10 },
  noDefinition: { fontStyle: "italic", color: colors.textTertiary },
  actionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18 },
  actionRowRight: { flexDirection: "row", gap: 16 },
  editBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  editBtnText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.textPrimary },
  deleteText: { fontFamily: fonts.sansMedium, fontSize: 12.5, color: colors.accentRed },
  closeText: { fontFamily: fonts.sansMedium, fontSize: 12.5, color: colors.textSecondary },

  titleInput: { fontFamily: fonts.sansSemiBold, fontSize: 20, color: colors.textPrimary, padding: 0 },
  definitionInput: {
    marginTop: 10,
    minHeight: 90,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    textAlignVertical: "top",
  },
  editRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  saveBtn: { backgroundColor: colors.surfaceDark, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 16 },
  saveBtnText: { fontFamily: fonts.sansMedium, fontSize: 13, color: "#fff" },
  cancelBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 16 },
  cancelBtnText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.textPrimary },
});
