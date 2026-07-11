import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAppState } from "../state/AppState";
import { POS_LIST, POS_SHORT, sortWordsAlphabetically } from "../lib/vocab";
import type { PartOfSpeech, VocabWord } from "../lib/vocab";

const SERIF = "Times New Roman";

function posLabel(pos?: PartOfSpeech): string {
  return pos ? POS_SHORT[pos] : "";
}

// ── part-of-speech picker (plain text row, active one underlined) ────────────

function PosPicker({ value, onChange }: { value: PartOfSpeech; onChange: (pos: PartOfSpeech) => void }) {
  return (
    <View style={styles.posRow}>
      {POS_LIST.map((p) => (
        <Pressable key={p} onPress={() => onChange(p)} hitSlop={6}>
          <Text style={[styles.posItem, value === p && styles.posItemActive]}>{p}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ── add word sheet ──────────────────────────────────────────────────────────

function AddWordSheet({ onClose }: { onClose: () => void }) {
  const { addVocabWord } = useAppState();
  const [word, setWord] = useState("");
  const [pos, setPos] = useState<PartOfSpeech>("noun");
  const [definition, setDefinition] = useState("");

  function save() {
    if (!word.trim()) return;
    addVocabWord({ word, pos, definition });
    onClose();
  }

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.sheetHeadRow}>
              <Text style={styles.sheetEyebrow}>New Word</Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <Text style={styles.linkPrimary}>Close ×</Text>
              </Pressable>
            </View>
            <View style={styles.hr} />

            <TextInput
              value={word}
              onChangeText={setWord}
              placeholder="Word"
              placeholderTextColor="#b3aaa0"
              autoFocus
              style={styles.wordInput}
            />

            <Text style={styles.fieldLabel}>Part of speech</Text>
            <PosPicker value={pos} onChange={setPos} />

            <Text style={styles.fieldLabel}>Definition</Text>
            <TextInput
              value={definition}
              onChangeText={setDefinition}
              placeholder="Add a definition…"
              placeholderTextColor="#b3aaa0"
              multiline
              numberOfLines={3}
              style={styles.textarea}
            />

            <View style={styles.hrLight} />
            <View style={styles.actionRow}>
              <Pressable onPress={onClose} hitSlop={8}>
                <Text style={styles.linkMuted}>Cancel</Text>
              </Pressable>
              <Pressable onPress={save} hitSlop={8}>
                <Text style={styles.linkPrimary}>Save</Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── word detail / edit bottom sheet ─────────────────────────────────────────

function WordSheet({ word, onClose }: { word: VocabWord; onClose: () => void }) {
  const { updateVocabWord, deleteVocabWord } = useAppState();
  const [editing, setEditing] = useState(false);
  const [wordVal, setWordVal] = useState(word.word);
  const [posVal, setPosVal] = useState<PartOfSpeech>(word.pos ?? "noun");
  const [defVal, setDefVal] = useState(word.definition ?? "");
  const [exVal, setExVal] = useState(word.example ?? "");

  function startEdit() {
    setWordVal(word.word);
    setPosVal(word.pos ?? "noun");
    setDefVal(word.definition ?? "");
    setExVal(word.example ?? "");
    setEditing(true);
  }

  function save() {
    updateVocabWord(word.id, { word: wordVal, pos: posVal, definition: defVal, example: exVal });
    setEditing(false);
  }

  function remove() {
    deleteVocabWord(word.id);
    onClose();
  }

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <ScrollView keyboardShouldPersistTaps="handled">
            {editing ? (
              <>
                <TextInput
                  value={wordVal}
                  onChangeText={setWordVal}
                  autoFocus
                  style={styles.wordInputEdit}
                />
                <Text style={styles.fieldLabel}>Part of speech</Text>
                <PosPicker value={posVal} onChange={setPosVal} />
                <Text style={styles.fieldLabel}>Definition</Text>
                <TextInput
                  value={defVal}
                  onChangeText={setDefVal}
                  placeholder="Add a definition…"
                  placeholderTextColor="#b3aaa0"
                  multiline
                  numberOfLines={3}
                  style={styles.textarea}
                />
                <Text style={styles.fieldLabel}>Example</Text>
                <TextInput
                  value={exVal}
                  onChangeText={setExVal}
                  placeholder="Add an example sentence…"
                  placeholderTextColor="#b3aaa0"
                  multiline
                  numberOfLines={2}
                  style={styles.textareaItalic}
                />
                <View style={styles.hrLight} />
                <View style={styles.actionRow}>
                  <Pressable onPress={() => setEditing(false)} hitSlop={8}>
                    <Text style={styles.linkMuted}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={save} hitSlop={8}>
                    <Text style={styles.linkPrimary}>Save</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <View style={styles.closeRow}>
                  <Pressable onPress={onClose} hitSlop={8}>
                    <Text style={styles.linkPrimary}>Close ×</Text>
                  </Pressable>
                </View>
                <Text style={styles.wordTitle}>{word.word}</Text>
                {word.pos && (
                  <Text style={styles.posLine}>{word.pos.charAt(0).toUpperCase() + word.pos.slice(1)}</Text>
                )}
                {word.definition ? (
                  <Text style={styles.definitionText}>{word.definition}</Text>
                ) : (
                  <Text style={styles.noDefinitionText}>No definition yet.</Text>
                )}
                {word.example && <Text style={styles.exampleText}>{word.example}</Text>}
                {word.synonyms && word.synonyms.length > 0 && (
                  <>
                    <Text style={styles.synonymsLabel}>Synonyms</Text>
                    <Text style={styles.synonymsText}>{word.synonyms.join(" · ")}</Text>
                  </>
                )}
                <View style={styles.hrLight2} />
                <View style={styles.actionRow}>
                  <Pressable onPress={startEdit} hitSlop={8}>
                    <Text style={styles.linkPrimary}>Edit</Text>
                  </Pressable>
                  <Pressable onPress={remove} hitSlop={8}>
                    <Text style={styles.linkDelete}>Delete</Text>
                  </Pressable>
                </View>
              </>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── screen ───────────────────────────────────────────────────────────────────

export default function VocabularyScreen({ onClose }: { onClose: () => void }) {
  const { vocabWords } = useAppState();
  const [adding, setAdding] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [missingOnly, setMissingOnly] = useState(false);

  const missingCount = useMemo(() => vocabWords.filter((w) => !w.definition || !w.definition.trim()).length, [vocabWords]);
  const sorted = useMemo(() => {
    const base = missingOnly ? vocabWords.filter((w) => !w.definition || !w.definition.trim()) : vocabWords;
    return sortWordsAlphabetically(base);
  }, [vocabWords, missingOnly]);
  const active = activeId ? vocabWords.find((w) => w.id === activeId) ?? null : null;

  return (
    <View style={styles.root}>
      <Pressable onPress={onClose} hitSlop={12} style={styles.topBack}>
        <Text style={styles.backLink}>‹ Close</Text>
      </Pressable>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <Text style={styles.h1}>Chasing Articulation</Text>
          <View style={styles.headerRight}>
            <Text style={styles.wordCount}>
              {vocabWords.length} word{vocabWords.length === 1 ? "" : "s"}
            </Text>
            <Pressable onPress={() => setAdding(true)} hitSlop={8} style={styles.addBtn}>
              <Text style={styles.addBtnText}>+</Text>
            </Pressable>
          </View>
        </View>

        {missingCount > 0 && (
          <Pressable onPress={() => setMissingOnly((v) => !v)} hitSlop={6} style={styles.missingFilter}>
            <Text style={[styles.missingFilterText, missingOnly && styles.missingFilterTextActive]}>
              {missingOnly ? "Showing missing definitions" : `${missingCount} missing a definition`}
            </Text>
          </Pressable>
        )}

        {vocabWords.length === 0 ? (
          <Text style={styles.empty}>No words yet — tap + to add one.</Text>
        ) : sorted.length === 0 ? (
          <Text style={styles.empty}>Every word has a definition.</Text>
        ) : (
          <View style={styles.list}>
            {sorted.map((w) => (
              <Pressable key={w.id} onPress={() => setActiveId(w.id)} style={styles.row}>
                <Text style={styles.rowWord}>{w.word}</Text>
                {w.pos && <Text style={styles.rowPos}>{posLabel(w.pos)}</Text>}
                {(!w.definition || !w.definition.trim()) && <Text style={styles.rowMissing}>no definition yet</Text>}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {adding && <AddWordSheet onClose={() => setAdding(false)} />}
      {active && <WordSheet word={active} onClose={() => setActiveId(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#ffffff" },
  topBack: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 4 },
  backLink: { fontFamily: SERIF, fontSize: 13, color: "#a39a90" },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 60 },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, marginBottom: 20 },
  h1: { fontFamily: SERIF, fontSize: 30, lineHeight: 32, color: "#2f2f2f", letterSpacing: -0.3, flexShrink: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  wordCount: { fontFamily: SERIF, fontStyle: "italic", fontSize: 12, color: "#b3aaa0" },
  addBtn: { width: 25, height: 25, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  addBtnText: { fontFamily: SERIF, fontSize: 19, color: "#9b9a97" },

  missingFilter: { marginTop: 8 },
  missingFilterText: { fontFamily: SERIF, fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase", color: "#a39a90" },
  missingFilterTextActive: { color: "#2f2f2f", textDecorationLine: "underline" },

  empty: { fontFamily: SERIF, fontStyle: "italic", fontSize: 15, color: "#b3aaa0", marginTop: 40 },

  list: { marginTop: 24 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 3, flexWrap: "wrap" },
  rowWord: { fontFamily: SERIF, fontSize: 30, lineHeight: 32, color: "#2f2f2f" },
  rowPos: { marginLeft: 10, fontFamily: SERIF, fontSize: 16, color: "#a39a90" },
  rowMissing: { marginLeft: 10, fontFamily: SERIF, fontStyle: "italic", fontSize: 12, color: "#c5bdb5" },

  // word sheets — centered so the definition sits at eye level instead of
  // pinned to the bottom of the phone screen.
  scrim: { flex: 1, backgroundColor: "rgba(30,28,26,0.45)", justifyContent: "center", paddingHorizontal: 18 },
  sheet: { maxHeight: "80%", backgroundColor: "#fdfcfa", borderWidth: 1, borderColor: "#2f2f2f", paddingHorizontal: 24, paddingTop: 26, paddingBottom: 30 },

  sheetHeadRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  sheetEyebrow: { fontFamily: SERIF, fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase", color: "#2f2f2f" },

  hr: { height: 1, backgroundColor: "#2f2f2f", marginTop: 12, marginBottom: 20 },
  hrLight: { height: 1, backgroundColor: "#e2dbd2", marginBottom: 16 },
  hrLight2: { height: 1, backgroundColor: "#e2dbd2", marginTop: 26, marginBottom: 18 },

  wordInput: { fontFamily: SERIF, fontSize: 30, color: "#2f2f2f", paddingVertical: 4, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#d8d1c8", marginBottom: 20 },
  wordInputEdit: { fontFamily: SERIF, fontSize: 26, color: "#2f2f2f", paddingVertical: 4, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#d8d1c8", marginBottom: 16 },

  fieldLabel: { fontFamily: SERIF, fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase", color: "#9b9a97", marginBottom: 8 },

  posRow: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginBottom: 18 },
  posItem: { fontFamily: SERIF, fontSize: 15, color: "#b3aaa0" },
  posItemActive: { color: "#2f2f2f", textDecorationLine: "underline" },

  textarea: { borderWidth: 1, borderColor: "#e2dbd2", padding: 10, fontFamily: SERIF, fontSize: 15, lineHeight: 22, color: "#2f2f2f", textAlignVertical: "top", marginBottom: 24, minHeight: 70 },
  textareaItalic: { borderWidth: 1, borderColor: "#e2dbd2", padding: 10, fontFamily: SERIF, fontStyle: "italic", fontSize: 14, lineHeight: 21, color: "#2f2f2f", textAlignVertical: "top", marginBottom: 20, minHeight: 50 },

  actionRow: { flexDirection: "row", gap: 26 },
  linkPrimary: { fontFamily: SERIF, fontSize: 14, letterSpacing: 0.4, textTransform: "uppercase", color: "#2f2f2f", textDecorationLine: "underline" },
  linkMuted: { fontFamily: SERIF, fontSize: 14, letterSpacing: 0.4, textTransform: "uppercase", color: "#8a8783", textDecorationLine: "underline" },
  linkDelete: { fontFamily: SERIF, fontSize: 14, letterSpacing: 0.4, textTransform: "uppercase", color: "#b23a2e", textDecorationLine: "underline" },

  closeRow: { flexDirection: "row", justifyContent: "flex-end" },
  wordTitle: { fontFamily: SERIF, fontWeight: "700", fontSize: 40, lineHeight: 42, color: "#1a1a1a", marginTop: 14 },
  posLine: { fontFamily: SERIF, fontStyle: "italic", fontSize: 16, color: "#a39a90", marginTop: 14 },
  definitionText: { fontFamily: SERIF, fontSize: 17, lineHeight: 26, color: "#2f2f2f", marginTop: 14 },
  noDefinitionText: { fontFamily: SERIF, fontStyle: "italic", fontSize: 15, lineHeight: 22, color: "#b3aaa0", marginTop: 14 },
  exampleText: { fontFamily: SERIF, fontStyle: "italic", fontSize: 15, lineHeight: 24, color: "#6a6560", marginTop: 16 },
  synonymsLabel: { fontFamily: SERIF, fontStyle: "italic", fontSize: 16, color: "#a39a90", marginTop: 26 },
  synonymsText: { fontFamily: SERIF, fontSize: 16, lineHeight: 22, color: "#a39a90", marginTop: 8 },
});
