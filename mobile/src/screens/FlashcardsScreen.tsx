import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { URDU_CARDS, URDU_CATEGORIES, type UrduCard } from "../data/urduCards";

const URDU_FONT = "NotoNastaliqUrdu_400Regular";
const SERIF = "Times New Roman";

const STORAGE_KEY = "urdu_mastered";

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

function loadMastered(): Set<string> {
  try {
    if (typeof localStorage === "undefined") return new Set();
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function persistMastered(next: Set<string>) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    // ignore
  }
}

function buildDeck(cat: string, mastered: Set<string>): UrduCard[] {
  const base = cat === "All" ? URDU_CARDS : URDU_CARDS.filter((c) => c.cat === cat);
  return base.filter((c) => !mastered.has(c.id));
}

export default function FlashcardsScreen() {
  const [cat, setCat] = useState("All");
  const [catMenuOpen, setCatMenuOpen] = useState(false);
  const [mastered, setMastered] = useState<Set<string>>(() => loadMastered());
  const [ds, setDs] = useState<{ deck: UrduCard[]; index: number; flipped: boolean }>(() => ({
    deck: buildDeck("All", loadMastered()),
    index: 0,
    flipped: false,
  }));
  const [sessNoIdea, setSessNoIdea] = useState(0);
  const [sessNeedsWork, setSessNeedsWork] = useState(0);

  const total = ds.deck.length;
  const card = total ? ds.deck[ds.index] : null;
  const progressPct = total === 0 ? 100 : Math.round((ds.index / Math.max(1, total)) * 100);

  function selectCat(c: string) {
    setCat(c);
    setDs({ deck: buildDeck(c, mastered), index: 0, flipped: false });
    setCatMenuOpen(false);
  }

  function flip() {
    setDs((s) => ({ ...s, flipped: !s.flipped }));
  }

  function prev() {
    setDs((s) => {
      if (!s.deck.length) return s;
      const n = Math.max(1, s.deck.length);
      return { ...s, index: (s.index - 1 + n) % n, flipped: false };
    });
  }

  function requeue(gap: number) {
    setDs((s) => {
      const { deck, index } = requeueDeck(s.deck, s.index, gap);
      return { deck, index, flipped: false };
    });
  }

  function noIdea() {
    setSessNoIdea((n) => n + 1);
    requeue(2);
  }

  function needsWork() {
    setSessNeedsWork((n) => n + 1);
    requeue(6);
  }

  function markMastered() {
    if (!ds.deck.length) return;
    const c = ds.deck[ds.index];
    const nextMastered = new Set(mastered);
    nextMastered.add(c.id);
    persistMastered(nextMastered);
    setMastered(nextMastered);
    const deck = buildDeck(cat, nextMastered);
    setDs({ deck, index: Math.min(ds.index, Math.max(0, deck.length - 1)), flipped: false });
  }

  function doShuffle() {
    setDs((s) => ({ deck: shuffle(s.deck), index: 0, flipped: false }));
  }

  function doReset() {
    const empty = new Set<string>();
    persistMastered(empty);
    setMastered(empty);
    setDs({ deck: buildDeck(cat, empty), index: 0, flipped: false });
  }

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.h1}>Urdu</Text>
        <Text style={styles.remaining}>{total} remaining</Text>
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
      <Text style={styles.masteredLabel}>{mastered.size} mastered</Text>

      <Pressable onPress={flip} style={styles.scene}>
        <View
          style={[
            styles.cardInner,
            { transform: [{ perspective: 900 }, { rotateY: ds.flipped ? "180deg" : "0deg" }] },
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

      <Text style={styles.position}>{total ? `${ds.index + 1} / ${total}` : "All mastered!"}</Text>

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
          <Text style={[styles.statNum, { color: "#3d6b57" }]}>{mastered.size}</Text>
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
  catMenu: { position: "absolute", top: 24, left: 0, zIndex: 6, backgroundColor: "#fdfcfa", borderWidth: 1, borderColor: "#e2dbd2", paddingVertical: 10, paddingHorizontal: 16, gap: 10, minWidth: 150 },
  catMenuItem: { fontFamily: SERIF, fontSize: 14, color: "#b3aaa0", paddingVertical: 2 },
  catMenuItemActive: { color: "#2f2f2f", textDecorationLine: "underline" },

  progressTrack: { height: 1, backgroundColor: "#e2dbd2", marginBottom: 4 },
  progressFill: { height: 1, backgroundColor: "#2f2f2f" },
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
    backgroundColor: "#fdfcfa",
    borderWidth: 1,
    borderColor: "#e2dbd2",
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
  statsRow: { flexDirection: "row", justifyContent: "center", gap: 44, marginBottom: 30 },
  statCol: { alignItems: "center" },
  statNum: { fontFamily: SERIF, fontSize: 30 },
  statLabel: { fontFamily: SERIF, fontStyle: "italic", fontSize: 11, color: "#c5bdb5", marginTop: 8 },
});
