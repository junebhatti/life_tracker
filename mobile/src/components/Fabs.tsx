import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, radius, shadow } from "../theme";
import { useAppState } from "../state/AppState";

export default function Fabs({ hidden }: { hidden?: boolean }) {
  const { openCapture } = useAppState();
  if (hidden) return null;

  return (
    <View style={styles.stack}>
      <Pressable style={styles.fab} onPress={() => openCapture()}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 20h9"
            stroke="#fff"
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Path
            d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"
            stroke="#fff"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: "absolute",
    right: 18,
    bottom: 78,
    zIndex: 7,
  },
  fab: {
    width: 50,
    height: 50,
    borderRadius: radius.fab,
    backgroundColor: colors.surfaceDark,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.fab,
  },
});
