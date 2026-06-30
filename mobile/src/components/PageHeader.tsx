import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";

export default function PageHeader({
  label,
  title,
  sub,
}: {
  label: string;
  title: string;
  sub: string;
}) {
  return (
    <View>
      <Text style={styles.lbl}>{label}</Text>
      <Text style={styles.h1}>{title}</Text>
      <Text style={styles.meta}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lbl: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    lineHeight: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: colors.textSecondary,
  },
  h1: {
    fontFamily: fonts.serif,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -0.3,
    color: colors.textPrimary,
    marginTop: 6,
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    lineHeight: 16,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: colors.textTertiary,
    marginTop: 4,
  },
});
