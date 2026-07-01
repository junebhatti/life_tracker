import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";
import { useAppState } from "../state/AppState";
import type { ScrapItem } from "../types";

function ScrapImage({ item }: { item: Extract<ScrapItem, { type: "img" }> }) {
  return (
    <View style={styles.imgBox}>
      <Text style={styles.imgLabel}>{item.label}</Text>
    </View>
  );
}

function ScrapQuote({ item }: { item: Extract<ScrapItem, { type: "quote" }> }) {
  return (
    <View style={styles.quoteBox}>
      <Text style={styles.quoteText}>{`"${item.text}"`}</Text>
      <Text style={styles.quoteSource}>{item.source}</Text>
    </View>
  );
}

function ScrapNote({ item }: { item: Extract<ScrapItem, { type: "note" }> }) {
  return (
    <View style={styles.noteBox}>
      <Text style={styles.noteText}>{item.text}</Text>
    </View>
  );
}

export default function ScrapbookScreen() {
  const { scrapItems } = useAppState();

  return (
    <View style={styles.wrap}>
      <View style={styles.headerBar}>
        <Text style={styles.lbl}>Collected</Text>
        <Text style={styles.h1}>Scrapbook</Text>
        <Text style={styles.meta}>Things I love</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.grid}>
        {scrapItems.map((item: ScrapItem) => (
          <View key={item.id} style={styles.gridItem}>
            {item.type === "img" ? <ScrapImage item={item} /> : null}
            {item.type === "quote" ? <ScrapQuote item={item} /> : null}
            {item.type === "note" ? <ScrapNote item={item} /> : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  headerBar: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 14,
  },
  lbl: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
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
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: colors.textTertiary,
    marginTop: 4,
  },
  scroll: { flex: 1 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    padding: 20,
    paddingTop: 8,
  },
  gridItem: {
    width: "47%",
  },
  imgBox: {
    backgroundColor: "#ede8e2",
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 100,
  },
  imgLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textTertiary,
    textAlign: "center",
  },
  quoteBox: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 14,
  },
  quoteText: {
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  quoteSource: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    color: colors.textTertiary,
    marginTop: 8,
    textTransform: "uppercase",
  },
  noteBox: {
    backgroundColor: "#fff8d6",
    borderRadius: 4,
    padding: 12,
  },
  noteText: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.textPrimary,
  },
});
