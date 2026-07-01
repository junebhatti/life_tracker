import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { colors, fonts } from "../theme";

export type TabKey = "Today" | "Tasks" | "Projects" | "Library" | "Scrapbook" | "Search";

const TABS: TabKey[] = ["Today", "Tasks", "Projects", "Library", "Scrapbook", "Search"];

export default function BottomNav({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}) {
  return (
    <View style={styles.wrap}>
      <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.row}>
        {TABS.map((tab) => {
          const isActive = tab === active;
          return (
            <Pressable key={tab} style={styles.item} onPress={() => onChange(tab)}>
              <Text style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}>
                {tab}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    zIndex: 5,
    borderTopWidth: 1,
    borderTopColor: colors.navBorder,
    backgroundColor: Platform.OS === "android" ? colors.navBg : "transparent",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 4,
    paddingTop: 14,
    paddingBottom: 26,
    paddingHorizontal: 18,
  },
  item: {
    flex: 1,
    alignItems: "center",
  },
  label: {
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    textAlign: "center",
  },
  labelActive: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  labelInactive: {
    color: "#aaa7a2",
    fontWeight: "500",
  },
});
