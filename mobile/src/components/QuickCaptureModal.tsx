import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fonts } from "../theme";
import { useAppState } from "../state/AppState";

export default function QuickCaptureModal() {
  const { capture, draft, setDraft, closeCapture, submitCapture, categories } = useAppState();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const visible = capture === "text";

  function handleClose() {
    setSelectedCategory(null);
    closeCapture();
  }

  function handleSubmit() {
    submitCapture(selectedCategory ?? undefined);
    setSelectedCategory(null);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.headerLeft}>▶ QUICK CAPTURE</Text>
            <Pressable onPress={handleClose}>
              <Text style={styles.headerRight}>[ESC] CLOSE</Text>
            </Pressable>
          </View>
          <View style={styles.body}>
            <View style={styles.inputRow}>
              <Text style={styles.prefix}>{">"}</Text>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                placeholder="task: quote: journal: note:"
                placeholderTextColor="#9a9a94"
                multiline
                autoFocus
              />
            </View>

            {categories.length > 0 ? (
              <View style={styles.categorySection}>
                <Text style={styles.categoryLabel}>TAG AS FOLDER</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
                  {categories.map((cat) => {
                    const active = selectedCategory === cat;
                    return (
                      <Pressable
                        key={cat}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setSelectedCategory(active ? null : cat)}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {cat}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.footer}>
              <Text style={styles.hint}>PREFIX: task:  quote:  journal:  note:</Text>
              <Pressable style={styles.captureBtn} onPress={handleSubmit}>
                <Text style={styles.captureBtnText}>[CAPTURE]</Text>
              </Pressable>
            </View>
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
  modal: {
    width: "100%",
    backgroundColor: "#f4f4f1",
    borderWidth: 2,
    borderColor: "#1a1a18",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 50,
    elevation: 16,
  },
  header: {
    backgroundColor: "#1a1a18",
    paddingVertical: 10,
    paddingHorizontal: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: { fontFamily: fonts.jetbrainsBold, fontSize: 9, letterSpacing: 2, color: "#f4f4f1" },
  headerRight: { fontFamily: fonts.jetbrains, fontSize: 9, color: "#777" },
  body: { padding: 13 },
  inputRow: {
    flexDirection: "row",
    borderWidth: 1.5,
    borderColor: "#c8c8c3",
  },
  prefix: {
    fontFamily: fonts.jetbrains,
    fontSize: 14,
    color: "#9a9a94",
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRightWidth: 1.5,
    borderRightColor: "#c8c8c3",
  },
  input: {
    flex: 1,
    fontFamily: fonts.jetbrains,
    fontSize: 12,
    lineHeight: 20,
    color: "#1a1a18",
    padding: 11,
    minHeight: 80,
    textAlignVertical: "top",
  },
  categorySection: {
    marginTop: 10,
  },
  categoryLabel: {
    fontFamily: fonts.jetbrains,
    fontSize: 8,
    letterSpacing: 1.5,
    color: "#9a9a94",
    marginBottom: 6,
  },
  chips: {
    flexDirection: "row",
  },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#c8c8c3",
    marginRight: 5,
  },
  chipActive: {
    backgroundColor: "#1a1a18",
    borderColor: "#1a1a18",
  },
  chipText: {
    fontFamily: fonts.jetbrains,
    fontSize: 9,
    color: "#555",
  },
  chipTextActive: {
    color: "#f4f4f1",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  hint: { fontFamily: fonts.jetbrains, fontSize: 8.5, color: "#9a9a94", flex: 1 },
  captureBtn: {
    backgroundColor: "#1a1a18",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  captureBtnText: { fontFamily: fonts.jetbrainsBold, fontSize: 9.5, color: "#f4f4f1" },
});
