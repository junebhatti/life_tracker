import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Path } from "react-native-svg";
import { colors, fonts } from "../theme";
import PageHeader from "../components/PageHeader";
import { useAppState } from "../state/AppState";
import { definedWords, sortWordsAlphabetically } from "../lib/vocab";
import type { VocabWord } from "../types";

const STORAGE_KEY = "english_vocab_mastered";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function EnglishFlashcardsScreen() {
  const { vocabWords } = useAppState();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mastered, setMastered] = useState<Set<string>>(new Set());
  const [order, setOrder] = useState<string[] | null>(null);

  const flipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setMastered(new Set(JSON.parse(raw) as string[]));
      })
      .catch(() => {});
  }, []);

  function persist(next: Set<string>) {
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  }

  const quizzable = useMemo(() => sortWordsAlphabetically(definedWords(vocabWords)), [vocabWords]);

  const deck = useMemo(() => {
    let cards = quizzable.filter((w) => !mastered.has(w.id));
    if (order) {
      const pos = new Map(order.map((id, i) => [id, i]));
      cards = [...cards].sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0));
    }
    return cards;
  }, [quizzable, mastered, order]);

  const total = quizzable.length;
  const masteredCount = total - deck.length;
  const undefinedCount = vocabWords.length - quizzable.length;

  const safeIndex = deck.length ? Math.min(index, deck.length - 1) : 0;
  const card: VocabWord | undefined = deck[safeIndex];

  function resetFlip() {
    flipAnim.setValue(0);
    setFlipped(false);
  }

  function doFlip() {
    Animated.timing(flipAnim, {
      toValue: flipped ? 0 : 1,
      duration: 450,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start();
    setFlipped((f) => !f);
  }

  function next() {
    if (!deck.length) return;
    setIndex((i) => (i + 1) % deck.length);
    resetFlip();
  }
  function prev() {
    if (!deck.length) return;
    setIndex((i) => (i - 1 + deck.length) % deck.length);
    resetFlip();
  }
  function toggleMastered() {
    if (!card) return;
    const nextSet = new Set(mastered);
    if (nextSet.has(card.id)) nextSet.delete(card.id);
    else nextSet.add(card.id);
    setMastered(nextSet);
    persist(nextSet);
    resetFlip();
  }
  function doShuffle() {
    setOrder(shuffle(deck.map((w) => w.id)));
    setIndex(0);
    resetFlip();
  }
  function doReset() {
    const empty = new Set<string>();
    setMastered(empty);
    persist(empty);
    setOrder(null);
    setIndex(0);
    resetFlip();
  }

  const frontRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const backRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });

  const isMastered = card ? mastered.has(card.id) : false;
  const progressPct = total ? Math.round((masteredCount / total) * 100) : 0;

  return (
    <View>
      <PageHeader
        label="From your reading"
        title="English Vocabulary"
        sub={`${masteredCount} of ${total} mastered${undefinedCount > 0 ? ` · ${undefinedCount} need a definition` : ""}`}
      />

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>

      {card ? (
        <Pressable onPress={doFlip} style={styles.scene}>
          <Animated.View style={[styles.face, styles.front, { transform: [{ perspective: 900 }, { rotateY: frontRotate }] }]}>
            <Text style={styles.word}>{card.word}</Text>
            <Text style={styles.reveal}>Tap to reveal</Text>
          </Animated.View>
          <Animated.View style={[styles.face, styles.back, { transform: [{ perspective: 900 }, { rotateY: backRotate }] }]}>
            <Text style={styles.definition}>{card.definition}</Text>
          </Animated.View>
        </Pressable>
      ) : (
        <View style={styles.doneCard}>
          <Text style={styles.doneText}>{total === 0 ? "No words to study yet" : "All caught up!"}</Text>
          <Text style={styles.doneSub}>
            {total === 0 ? "Add definitions to your vocabulary list to start quizzing." : "Every defined word is mastered."}
          </Text>
        </View>
      )}

      {card ? <Text style={styles.position}>{`${safeIndex + 1} / ${deck.length}`}</Text> : null}

      {card ? (
        <View style={styles.controls}>
          <Pressable style={styles.ctrlBtn} onPress={prev} hitSlop={8}>
            <Text style={styles.ctrlText}>‹ Prev</Text>
          </Pressable>
          <Pressable style={[styles.masterBtn, isMastered && styles.masterBtnActive]} onPress={toggleMastered}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path d="M5 12l5 5L19 7" stroke={isMastered ? "#fff" : colors.textTertiary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={[styles.masterText, isMastered && styles.masterTextActive]}>
              {isMastered ? "Mastered" : "Master"}
            </Text>
          </Pressable>
          <Pressable style={styles.ctrlBtn} onPress={next} hitSlop={8}>
            <Text style={styles.ctrlText}>Next ›</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.hint}>Tap the card to flip · mark words you know as mastered</Text>

      <View style={styles.footerRow}>
        <Pressable style={styles.footerBtn} onPress={doShuffle}>
          <Text style={styles.footerText}>Shuffle</Text>
        </Pressable>
        <Pressable style={styles.footerBtn} onPress={doReset}>
          <Text style={[styles.footerText, { color: colors.accentRed }]}>Reset progress</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressTrack: { height: 3, borderRadius: 2, backgroundColor: colors.border, marginTop: 16, overflow: "hidden" },
  progressFill: { height: 3, borderRadius: 2, backgroundColor: colors.accentRed },
  scene: { height: 240, marginTop: 22, alignItems: "center", justifyContent: "center" },
  face: {
    position: "absolute",
    width: "100%",
    maxWidth: 380,
    height: 240,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backfaceVisibility: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 6,
  },
  front: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: colors.border },
  back: { backgroundColor: "#2f2d2b" },
  word: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 40, color: colors.textPrimary, textAlign: "center", paddingHorizontal: 24 },
  reveal: {
    position: "absolute",
    bottom: 18,
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.textFaint,
  },
  definition: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 28, color: "#f6f1ed", textAlign: "center", paddingHorizontal: 24 },
  doneCard: {
    height: 240,
    marginTop: 22,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  doneText: { fontFamily: fonts.serif, fontSize: 24, color: colors.textPrimary },
  doneSub: { fontFamily: fonts.sans, fontSize: 13, color: colors.textSecondary, marginTop: 6, textAlign: "center" },
  position: { fontFamily: fonts.mono, fontSize: 11, color: colors.textTertiary, textAlign: "center", marginTop: 16 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
  ctrlBtn: { paddingVertical: 10, paddingHorizontal: 8 },
  ctrlText: { fontFamily: fonts.monoMedium, fontSize: 12, color: colors.textPrimary },
  masterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  masterBtnActive: { backgroundColor: colors.success, borderColor: colors.success },
  masterText: { fontFamily: fonts.monoMedium, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", color: colors.textTertiary },
  masterTextActive: { color: "#fff" },
  hint: { fontFamily: fonts.sans, fontSize: 12, color: colors.textTertiary, textAlign: "center", marginTop: 16 },
  footerRow: { flexDirection: "row", justifyContent: "center", gap: 24, marginTop: 20 },
  footerBtn: { paddingVertical: 8, paddingHorizontal: 8 },
  footerText: { fontFamily: fonts.monoMedium, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", color: colors.textSecondary },
});
