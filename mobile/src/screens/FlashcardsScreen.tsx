import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppState } from "../state/AppState";
import { URDU_CARDS, URDU_CATEGORIES, type UrduCard } from "../data/urduCards";
import { cardKeyFor, isDue, SESSION_GAP, type Grade, type ReviewState } from "../lib/srs";

const URDU_FONT = "NotoNastaliqUrdu_400Regular";
const SERIF = "Times New Roman";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Splices the current card out and reinserts it `gap` positions ahead, so it
 *  resurfaces sooner ("no idea") or later ("needs work") without leaving the deck. */
function requeueDeck<T>(deck: T[], index: number, gap: number): { deck: T[]; index: number } {
  if (!deck.length) return { deck, index };
  const card = deck[index];
  const rest = [...deck.slice(0, index), ...deck.slice(index + 1)];
  const insertAt = Math.min(rest.length, index + gap);
  rest.splice(insertAt, 0, card);
  const nextIndex = rest.length ? index % rest.length : 0;
  return { deck: rest, index: nextIndex };
}

function buildDeck(cat: string, reviews: Record<string, ReviewState>): UrduCard[] {
  const base = cat === "All" ? URDU_CARDS : URDU_CARDS.filter((c) => c.cat === cat);
  return base.filter((c) => isDue(reviews[cardKeyFor("urdu", c.id)]));
}

export default function FlashcardsScreen() {
  const { flashcardReviews, flashcardReviewsLoaded, recordFlashcardGrade, resetFlashcardDeck } = useAppState();
  const [cat, setCat] = useState("All");
  const [catMenuOpen, setCatMenuOpen] = useState(false);
  const [ds, setDs] = useState<{ deck: UrduCard[]; index: number; flipped: boolean } | null>(null);

  // Seed the session deck from what's due, once reviews have loaded.
  if (ds === null && flashcardReviewsLoaded) {
    setDs({ deck: buildDeck("All", flashcardReviews), index: 0, flipped: false });
  }

  const [sessNoIdea, setSessNoIdea] = useState(0);
  const [sessNeedsWork, setSessNeedsWork] = useState(0);
  const [sessFeelingGood, setSessFeelingGood] = useState(0);
  const [sessMastered, setSessMastered] = useState(0);

  const total = ds ? ds.deck.length : 0;
  const card = ds && total ? ds.deck[ds.index] : null;
  const progressPct = total === 0 ? 100 : Math.round(((ds?.index ?? 0) / Math.max(1, total)) * 100);

  function selectCat(c: string) {
    setCat(c);
    setDs({ deck: buildDeck(c, flashcardReviews), index: 0, flipped: false });
    setCatMenuOpen(false);
  }

  function flip() {
    setDs((s) => (s ? { ...s, flipped: !s.flipped } : s));
  }

  function prev() {
    setDs((s) => {
      if (!s || !s.deck.length) return s;
      const n = Math.max(1, s.deck.length);
      return { ...s, index: (s.index - 1 + n) % n, flipped: false };
    });
  }

  function grade(g: Grade) {
    if (!ds || !ds.deck.length) return;
    const c = ds.deck[ds.index];
    recordFlashcardGrade("urdu", c.id, g);
    const gap = SESSION_GAP[g];
    setDs((s) => {
      if (!s) return s;
      if (gap === null) {
        const deck = [...s.deck.slice(0, s.index), ...s.deck.slice(s.index + 1)];
        return { deck, index: Math.min(s.index, Math.max(0, deck.length - 1)), flipped: false };
      }
      const { deck, index } = requeueDeck(s.deck, s.index, gap);
      return { deck, index, flipped: false };
    });
  }

  function noIdea() { setSessNoIdea((n) => n + 1); grade("no_idea"); }
  function needsWork() { setSessNeedsWork((n) => n + 1); grade("needs_work"); }
  function feelingGood() { setSessFeelingGood((n) => n + 1); grade("feeling_good"); }
  function markMastered() { setSessMastered((n) => n + 1); grade("mastered"); }

  function doShuffle() {
    setDs((s) => (s ? { deck: shuffle(s.deck), index: 0, flipped: false } : s));
  }

  function doReset() {
    resetFlashcardDeck("urdu");
    setDs({ deck: cat === "All" ? [...URDU_CARDS] : URDU_CARDS.filter((c) => c.cat === cat), index: 0, flipped: false });
  }


  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.h1}>Urdu</Text>
        <Text style={styles.remaining}>{total} due</Text>
      </View>

      <View style={styles.catWrap}>
        <Pressable onPress={() => setCatMenuOpen((v) => !v)} hitSlop={6}>
          <Text style={styles.catLabel}>
            {cat} {catMenuOpen ? "▴" : "▾"}
          </Text>
        </Pressable>
        {catMenuOpen && (
          <View style={styles.catMenu}>
            {URDU_CATEGORIES.map((c) => (
              <Pressable key={c} onPress={() => selectCat(c)} hitSlop={4}>
                <Text style={[styles.catMenuItem, cat === c && styles.catMenuItemActive]}>{c}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>
      <Text style={styles.masteredLabel}>
        {flashcardReviewsLoaded ? (total ? "reviewing what's due" : "nothing due right now") : "Loading…"}
      </Text>

      <Pressable onPress={flip} style={styles.scene}>
        <View
          style={[
            styles.cardInner,
            { transform: [{ perspective: 900 }, { rotateY: ds?.flipped ? "180deg" : "0deg" }] },
            // RN's ViewStyle type doesn't know about transform-style, but this app
            // only ever runs via react-native-web, which passes it straight to CSS —
            // without it, backface-visibility can't hide the reverse face on flip.
            { transformStyle: "preserve-3d" } as object,
          ]}
        >
          <View style={[styles.face, styles.faceFront]}>
            <Text style={styles.urduFront}>{card ? card.urdu : "—"}</Text>
            <Text style={styles.tapReveal}>tap to reveal</Text>
          </View>
          <View style={[styles.face, styles.faceBack, { transform: [{ rotateY: "180deg" }] }]}>
            <Text style={styles.urduBack}>{card ? card.urdu : "—"}</Text>
            <Text style={styles.roman}>{card ? card.roman : ""}</Text>
            <Text style={styles.english}>{card ? card.english : "Done!"}</Text>
          </View>
        </View>
      </Pressable>

      <Text style={styles.position}>{total ? `${(ds?.index ?? 0) + 1} / ${total}` : "All caught up!"}</Text>

      <View style={styles.controls}>
        <Pressable onPress={prev} hitSlop={8}>
          <Text style={styles.prevLink}>‹ Prev</Text>
        </Pressable>
        <Pressable onPress={noIdea} hitSlop={8}>
          <Text style={[styles.gradeLink, { color: "#b23a2e" }]}>No idea</Text>
        </Pressable>
        <Pressable onPress={needsWork} hitSlop={8}>
          <Text style={[styles.gradeLink, { color: "#8a6a3d" }]}>Needs work</Text>
        </Pressable>
        <Pressable onPress={feelingGood} hitSlop={8}>
          <Text style={[styles.gradeLink, { color: "#2d7d7d" }]}>Feeling good</Text>
        </Pressable>
        <Pressable onPress={markMastered} hitSlop={8}>
          <Text style={[styles.gradeLink, { color: "#3d6b57" }]}>Mastered</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>mastered cards are removed from the deck</Text>

      <View style={styles.hr} />
      <View style={styles.footerRow}>
        <Pressable onPress={doShuffle} hitSlop={8}>
          <Text style={styles.footerLink}>SHUFFLE</Text>
        </Pressable>
        <Pressable onPress={doReset} hitSlop={8}>
          <Text style={[styles.footerLink, { color: "#b23a2e" }]}>RESET</Text>
        </Pressable>
      </View>

      <View style={styles.hr2} />
      <Text style={styles.sessionLabel}>This session</Text>
      <View style={styles.statsRow}>
        <View style={styles.statCol}>
          <Text style={[styles.statNum, { color: "#b23a2e" }]}>{sessNoIdea}</Text>
          <Text style={styles.statLabel}>no idea</Text>
        </View>
        <View style={styles.statCol}>
          <Text style={[styles.statNum, { color: "#8a6a3d" }]}>{sessNeedsWork}</Text>
          <Text style={styles.statLabel}>needs work</Text>
        </View>
        <View style={styles.statCol}>
          <Text style={[styles.statNum, { color: "#2d7d7d" }]}>{sessFeelingGood}</Text>
          <Text style={styles.statLabel}>feeling good</Text>
        </View>
        <View style={styles.statCol}>
          <Text style={[styles.statNum, { color: "#3d6b57" }]}>{sessMastered}</Text>
          <Text style={styles.statLabel}>mastered</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  h1: { fontFamily: SERIF, fontSize: 27, color: "#2f2f2f", letterSpacing: -0.3 },
  remaining: { fontFamily: SERIF, fontStyle: "italic", fontSize: 12, color: "#b3aaa0" },

  catWrap: { marginTop: 20, marginBottom: 22 },
  catLabel: { fontFamily: SERIF, fontSize: 14, color: "#2f2f2f", textDecorationLine: "underline" },
  catMenu: { position: "absolute", top: 24, left: 0, zIndex: 6, backgroundColor: "#f7f8fd", borderWidth: 1, borderColor: "#e2dbd2", paddingVertical: 10, paddingHorizontal: 16, gap: 10, minWidth: 150 },
  catMenuItem: { fontFamily: SERIF, fontSize: 14, color: "#b3aaa0", paddingVertical: 2 },
  catMenuItemActive: { color: "#2f2f2f", textDecorationLine: "underline" },

  progressTrack: { height: 1, backgroundColor: "#e2dbd2", marginBottom: 4 },
  progressFill: { height: 1, backgroundColor: "#2323e8" },
  masteredLabel: { fontFamily: SERIF, fontStyle: "italic", fontSize: 12, color: "#b3aaa0", marginTop: 8, marginBottom: 26 },

  scene: { height: 240, alignItems: "center", justifyContent: "center" },
  cardInner: { width: "100%", maxWidth: 380, height: 240 },
  face: {
    position: "absolute",
    width: "100%",
    height: 240,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
    backgroundColor: "#f7f8fd",
    borderWidth: 1,
    borderColor: "#d6daf0",
    backfaceVisibility: "hidden",
  },
  faceFront: {},
  faceBack: {},
  urduFront: { fontFamily: URDU_FONT, fontSize: 42, lineHeight: 58, color: "#2f2f2f", writingDirection: "rtl", textAlign: "center" },
  tapReveal: { position: "absolute", bottom: 18, fontFamily: SERIF, fontStyle: "italic", fontSize: 13, letterSpacing: 0.4, color: "#c5bdb5" },
  urduBack: { fontFamily: URDU_FONT, fontSize: 30, lineHeight: 42, color: "#2f2f2f", writingDirection: "rtl", textAlign: "center" },
  roman: { fontFamily: SERIF, fontStyle: "italic", fontSize: 15, color: "#a39a90", marginTop: 10 },
  english: { fontFamily: SERIF, fontSize: 20, lineHeight: 26, color: "#2f2f2f", marginTop: 18, textAlign: "center" },

  position: { fontFamily: SERIF, fontStyle: "italic", fontSize: 13, color: "#b3aaa0", textAlign: "center", marginTop: 18 },

  controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18, marginTop: 22, flexWrap: "wrap" },
  prevLink: { fontFamily: SERIF, fontSize: 15, letterSpacing: 0.4, color: "#a39a90", textDecorationLine: "underline" },
  gradeLink: { fontFamily: SERIF, fontSize: 16, textDecorationLine: "underline" },
  hint: { fontFamily: SERIF, fontStyle: "italic", fontSize: 11.5, lineHeight: 15, color: "#c5bdb5", textAlign: "center", marginTop: 16 },

  hr: { height: 1, backgroundColor: "#e2dbd2", marginTop: 24, marginBottom: 16 },
  footerRow: { flexDirection: "row", justifyContent: "center", gap: 26 },
  footerLink: { fontFamily: SERIF, fontSize: 13, letterSpacing: 0.4, color: "#8a8783", textDecorationLine: "underline" },

  hr2: { height: 1, backgroundColor: "#e2dbd2", marginTop: 32 },
  sessionLabel: { fontFamily: SERIF, fontStyle: "italic", fontSize: 12, color: "#b3aaa0", textAlign: "center", marginTop: 20, marginBottom: 22 },
  statsRow: { flexDirection: "row", justifyContent: "center", gap: 28, marginBottom: 30, flexWrap: "wrap" },
  statCol: { alignItems: "center" },
  statNum: { fontFamily: SERIF, fontSize: 30 },
  statLabel: { fontFamily: SERIF, fontStyle: "italic", fontSize: 11, color: "#c5bdb5", marginTop: 8 },
});
