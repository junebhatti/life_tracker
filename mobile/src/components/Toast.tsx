import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";

export default function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.pill}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: 96,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9,
  },
  pill: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 9999,
    paddingVertical: 9,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 6,
  },
  text: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.background,
  },
});
