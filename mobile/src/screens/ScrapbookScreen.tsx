import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";
import { useAppState } from "../state/AppState";
import PageHeader from "../components/PageHeader";
import type { ScrapItem } from "../types";

function ScrapCard({ item }: { item: ScrapItem }) {
  if (item.type === "quote") {
    return (
      <View style={styles.card}>
        <Text style={styles.quoteMark}>"</Text>
        <Text style={styles.quoteText}>{item.text}</Text>
        <Text style={styles.quoteSource}>— {item.source}</Text>
      </View>
    );
  }
  if (item.type === "note") {
    return (
      <View style={styles.card}>
        <Text style={styles.noteText}>{item.text}</Text>
      </View>
    );
  }
  if (item.type === "img") {
    return (
      <View style={[styles.card, styles.imgCard]}>
        <View style={styles.imgPlaceholder} />
        <Text style={styles.imgLabel}>{item.label}</Text>
      </View>
    );
  }
  return null;
}

export default function ScrapbookScreen() {
  const { scrapItems } = useAppState();

  return (
    <View style={styles.wrap}>
      <PageHeader
        label="Collections"
        title="Scrapbook"
        sub={`${scrapItems.length} items`}
      />
      {scrapItems.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing here yet.</Text>
          <Text style={styles.emptyHint}>
            Scrapbook items sync from the website. Open the web app to add quotes,
            notes, and images to your board.
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {scrapItems.map((item) => (
            <ScrapCard key={item.id} item={item} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  grid: {
    paddingTop: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  imgCard: {
    gap: 10,
  },
  imgPlaceholder: {
    height: 140,
    backgroundColor: colors.border,
    borderRadius: 6,
  },
  imgLabel: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
  },
  quoteMark: {
    fontFamily: fonts.serif,
    fontSize: 40,
    lineHeight: 36,
    color: colors.textFaint,
    marginBottom: 4,
  },
  quoteText: {
    fontFamily: fonts.serifRegular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
    fontStyle: "italic",
  },
  quoteSource: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 8,
  },
  noteText: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  empty: {
    marginTop: 60,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptyHint: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textTertiary,
    textAlign: "center",
  },
});
