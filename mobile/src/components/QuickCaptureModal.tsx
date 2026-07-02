import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fonts } from "../theme";
import { useAppState } from "../state/AppState";

const BASE_TYPES = ["Task", "Note", "Quote", "Journal"];
// These note kinds already have dedicated chips above, so don't repeat them as
// "folders".
const HIDDEN_FOLDERS = ["Notes", "Quotes", "Journal"];

function placeholderFor(type: string): string {
  if (type === "Task") return "What needs doing?";
  if (type === "Quote") return "Capture a quote…";
  if (type === "Journal") return "Write a journal entry…";
  return "Jot something down…";
}

export default function QuickCaptureModal() {
  const { capture, draft, setDraft, closeCapture, submitCapture, categories, projects } =
    useAppState();
  const [type, setType] = useState("Note");
  const [projectId, setProjectId] = useState<string | null>(null);
  const visible = capture === "text";

  const chips = useMemo(() => {
    const folders = categories.filter((c) => !HIDDEN_FOLDERS.includes(c));
    return [...BASE_TYPES, ...folders];
  }, [categories]);

  function reset() {
    setType("Note");
    setProjectId(null);
  }

  function handleClose() {
    reset();
    closeCapture();
  }

  function handleSubmit() {
    submitCapture({ type, projectId: type === "Task" ? projectId ?? undefined : undefined });
    reset();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Quick Capture</Text>
            <Pressable onPress={handleClose} hitSlop={10}>
              <Text style={styles.headerClose}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.body}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder={placeholderFor(type)}
              placeholderTextColor={colors.textTertiary}
              multiline
              autoFocus
            />

            <Text style={styles.label}>Capture as</Text>
            <View style={styles.chipWrap}>
              {chips.map((c) => {
                const active = type === c;
                return (
                  <Pressable
                    key={c}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setType(c)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>

            {type === "Task" && projects.length > 0 ? (
              <>
                <Text style={styles.label}>Project (optional)</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.projectRow}
                >
                  {projects.map((p) => {
                    const active = projectId === p.id;
                    return (
                      <Pressable
                        key={p.id}
                        style={[styles.projectChip, active && styles.projectChipActive]}
                        onPress={() => setProjectId(active ? null : p.id)}
                      >
                        <View style={[styles.projectDot, { backgroundColor: p.color }]} />
                        <Text style={[styles.projectText, active && styles.projectTextActive]}>
                          {p.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}

            <Pressable
              style={[styles.captureBtn, !draft.trim() && styles.captureBtnDisabled]}
              onPress={handleSubmit}
              disabled={!draft.trim()}
            >
              <Text style={styles.captureBtnText}>
                Add {type === "Task" ? "task" : type.toLowerCase()}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.28,
    shadowRadius: 44,
    elevation: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  headerClose: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.textTertiary,
  },
  body: { paddingHorizontal: 18, paddingBottom: 18 },
  input: {
    fontFamily: fonts.serifRegular,
    fontSize: 17,
    lineHeight: 25,
    color: colors.textPrimary,
    minHeight: 76,
    textAlignVertical: "top",
    paddingVertical: 4,
  },
  label: {
    fontFamily: fonts.monoMedium,
    fontSize: 9.5,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: {
    backgroundColor: colors.surfaceDark,
    borderColor: colors.surfaceDark,
  },
  chipText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  chipTextActive: { color: "#fff" },
  projectRow: { gap: 7, paddingRight: 8 },
  projectChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  projectChipActive: {
    borderColor: colors.surfaceDark,
    backgroundColor: colors.chipBg,
  },
  projectDot: { width: 8, height: 8, borderRadius: 4 },
  projectText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  projectTextActive: { color: colors.textPrimary },
  captureBtn: {
    marginTop: 20,
    backgroundColor: colors.surfaceDark,
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: "center",
  },
  captureBtnDisabled: { opacity: 0.4 },
  captureBtnText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: "#fff",
  },
});
