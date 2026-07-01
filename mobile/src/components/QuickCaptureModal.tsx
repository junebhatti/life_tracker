import React from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fonts } from "../theme";
import { useAppState } from "../state/AppState";

export default function QuickCaptureModal() {
  const { capture, draft, setDraft, closeCapture, submitCapture } = useAppState();
  const visible = capture === "text";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={closeCapture}>
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeCapture} />
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.headerLeft}>▶ QUICK CAPTURE</Text>
            <Pressable onPress={closeCapture}>
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
            <View style={styles.footer}>
              <Text style={styles.hint}>PREFIX: task:  quote:  journal:  note:</Text>
              <Pressable style={styles.captureBtn} onPress={submitCapture}>
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
  headerLeft: {
    fontFamily: fonts.jetbrainsBold,
    fontSize: 9,
    letterSpacing: 2,
    color: "#f4f4f1",
  },
  headerRight: {
    fontFamily: fonts.jetbrains,
    fontSize: 9,
    color: "#777",
  },
  body: {
    padding: 13,
  },
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
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  hint: {
    fontFamily: fonts.jetbrains,
    fontSize: 8.5,
    color: "#9a9a94",
    flex: 1,
  },
  captureBtn: {
    backgroundColor: "#1a1a18",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  captureBtnText: {
    fontFamily: fonts.jetbrainsBold,
    fontSize: 9.5,
    color: "#f4f4f1",
  },
});
