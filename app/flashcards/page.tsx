"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Noto_Nastaliq_Urdu } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/components/AuthProvider";
import { useVocab } from "@/components/VocabStore";
import { supabase } from "@/lib/supabase";
import { definedWords, sortWordsAlphabetically } from "@/lib/vocab";
import { URDU_CARDS, URDU_CATEGORIES, type UrduCard } from "@/lib/urduCards";
import { cardKeyFor, isDue, nextReview, SESSION_GAP, type Grade, type ReviewState } from "@/lib/srs";

const nastaliq = Noto_Nastaliq_Urdu({ subsets: ["arabic"], weight: ["400"] });

const SERIF = "'Times New Roman', Times, serif";

function shuffleArr<T>(arr: T[]): T[] {
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

type Deck = "english" | "urdu" | null;

export default function FlashcardsPage() {
  const [deck, setDeck] = useState<Deck>(null);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto" style={{ background: "#ffffff" }}>
        <div className="mx-auto max-w-[480px] px-5 pb-12 pt-8">
          {deck === null && <DeckChooser onChoose={setDeck} />}
          {deck === "english" && <EnglishDeck onBack={() => setDeck(null)} />}
          {deck === "urdu" && <UrduDeck onBack={() => setDeck(null)} />}
        </div>
      </main>
    </div>
  );
}

// ── chooser ──────────────────────────────────────────────────────────────────

function DeckChooser({ onChoose }: { onChoose: (deck: Deck) => void }) {
  return (
    <>
      <Link href="/projects" style={{ fontFamily: SERIF, fontSize: 13, color: "#a39a90" }}>
        ‹ Projects
      </Link>
      <h1 style={{ fontFamily: SERIF, fontSize: 34, lineHeight: 1, color: "#2f2f2f", margin: "20px 0 0", letterSpacing: "-0.01em" }}>
        Flashcards
      </h1>
      <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13, color: "#9b9a97", margin: "10px 0 0" }}>
        Choose a deck to study.
      </p>

      <div style={{ marginTop: 28 }}>
        <ChooserRow title="English Vocabulary" subtitle="Words collected from reading" onPress={() => onChoose("english")} />
        <ChooserRow title="Urdu Flashcards" subtitle="Elementary Urdu II" onPress={() => onChoose("urdu")} />
      </div>
    </>
  );
}

function ChooserRow({ title, subtitle, onPress }: { title: string; subtitle: string; onPress: () => void }) {
  return (
    <div
      onClick={onPress}
      style={{ display: "flex", alignItems: "baseline", gap: 10, cursor: "pointer", padding: "12px 0", borderBottom: "1px solid #e2dbd2" }}
    >
      <span style={{ fontFamily: SERIF, fontSize: 15, color: "#b3aaa0" }}>›</span>
      <span>
        <span style={{ display: "block", fontFamily: SERIF, fontSize: 22, color: "#2f2f2f" }}>{title}</span>
        <span style={{ display: "block", fontFamily: SERIF, fontStyle: "italic", fontSize: 13, color: "#9b9a97", marginTop: 2 }}>{subtitle}</span>
      </span>
    </div>
  );
}

function BackLink({ onBack }: { onBack: () => void }) {
  return (
    <span onClick={onBack} style={{ fontFamily: SERIF, fontSize: 13, color: "#a39a90", cursor: "pointer" }}>
      ‹ Decks
    </span>
  );
}

// ── shared bits ──────────────────────────────────────────────────────────────

const linkStyle = (color: string): React.CSSProperties => ({
  fontFamily: SERIF,
  fontSize: 16,
  color,
  textDecoration: "underline",
  textUnderlineOffset: 3,
  cursor: "pointer",
});

function GradingControls({
  onPrev,
  onNoIdea,
  onNeedsWork,
  onFeelingGood,
  onMastered,
}: {
  onPrev: () => void;
  onNoIdea: () => void;
  onNeedsWork: () => void;
  onFeelingGood: () => void;
  onMastered: () => void;
}) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginTop: 22, flexWrap: "wrap" }}>
        <span onClick={onPrev} style={{ fontFamily: SERIF, fontSize: 15, letterSpacing: "0.02em", color: "#a39a90", textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer", flex: "none" }}>
          ‹ Prev
        </span>
        <span onClick={onNoIdea} style={linkStyle("#b23a2e")}>No idea</span>
        <span onClick={onNeedsWork} style={linkStyle("#8a6a3d")}>Needs work</span>
        <span onClick={onFeelingGood} style={linkStyle("#2d7d7d")}>Feeling good</span>
        <span onClick={onMastered} style={linkStyle("#3d6b57")}>Mastered</span>
      </div>
      <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 11.5, lineHeight: 1.4, color: "#c5bdb5", textAlign: "center", margin: "16px 0 0" }}>
        mastered cards are removed from the deck
      </p>
    </>
  );
}

function ShuffleReset({ onShuffle, onReset }: { onShuffle: () => void; onReset: () => void }) {
  return (
    <>
      <div style={{ height: 1, background: "#e2dbd2", margin: "24px 0 16px" }} />
      <div style={{ display: "flex", gap: 26, justifyContent: "center" }}>
        <span onClick={onShuffle} style={{ fontFamily: SERIF, fontSize: 13, letterSpacing: "0.02em", textTransform: "uppercase", color: "#8a8783", textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}>
          Shuffle
        </span>
        <span onClick={onReset} style={{ fontFamily: SERIF, fontSize: 13, letterSpacing: "0.02em", textTransform: "uppercase", color: "#b23a2e", textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}>
          Reset
        </span>
      </div>
    </>
  );
}

function SessionStats({
  noIdea,
  needsWork,
  feelingGood,
  mastered,
}: {
  noIdea: number;
  needsWork: number;
  feelingGood: number;
  mastered: number;
}) {
  return (
    <>
      <div style={{ height: 1, background: "#e2dbd2", margin: "32px 0 0" }} />
      <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 12, color: "#b3aaa0", textAlign: "center", margin: "20px 0 22px" }}>
        This session
      </p>
      <div style={{ display: "flex", justifyContent: "center", gap: 34, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontFamily: SERIF, fontSize: 30, color: "#b23a2e", margin: 0 }}>{noIdea}</p>
          <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 11, color: "#c5bdb5", margin: "8px 0 0" }}>no idea</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontFamily: SERIF, fontSize: 30, color: "#8a6a3d", margin: 0 }}>{needsWork}</p>
          <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 11, color: "#c5bdb5", margin: "8px 0 0" }}>needs work</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontFamily: SERIF, fontSize: 30, color: "#2d7d7d", margin: 0 }}>{feelingGood}</p>
          <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 11, color: "#c5bdb5", margin: "8px 0 0" }}>feeling good</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontFamily: SERIF, fontSize: 30, color: "#3d6b57", margin: 0 }}>{mastered}</p>
          <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 11, color: "#c5bdb5", margin: "8px 0 0" }}>mastered</p>
        </div>
      </div>
    </>
  );
}

const cardScene: React.CSSProperties = { perspective: 900, width: "100%", maxWidth: 380, height: 240, margin: "0 auto", cursor: "pointer" };
const cardFace: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  backfaceVisibility: "hidden",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "30px 26px",
  // A whisper of the site's blue so the cards feel part of the identity.
  background: "#f7f8fd",
  border: "1px solid #d6daf0",
};

// ── review store (spaced repetition, persisted to Supabase) ──────────────────

type ReviewMap = Map<string, ReviewState>;

/** Loads this deck's review schedule once, and persists grades/resets. Because
 *  each deck component mounts fresh when chosen, the session deck is a snapshot
 *  of what's due at that moment. */
function useFlashcardReviews(deck: "english" | "urdu") {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewMap>(new Map());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReviews(new Map());
      setHydrated(true);
      return;
    }
    let active = true;
    setHydrated(false);
    supabase
      .from("flashcard_reviews")
      .select("card_key, interval_days, due_at, reps")
      .eq("user_id", user.id)
      .eq("deck", deck)
      .then(({ data }) => {
        if (!active) return;
        const map: ReviewMap = new Map();
        for (const r of (data ?? []) as { card_key: string; interval_days: number; due_at: string; reps: number }[]) {
          map.set(r.card_key, { intervalDays: Number(r.interval_days), dueAt: r.due_at, reps: r.reps });
        }
        setReviews(map);
        setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, [user, deck]);

  const recordGrade = useCallback(
    (cardId: string, grade: Grade) => {
      const key = cardKeyFor(deck, cardId);
      // Compute the next schedule from the current map here, not inside the
      // setState updater — React may run the updater later, after we'd already
      // need the value to persist.
      const nextState = nextReview(reviews.get(key), grade);
      setReviews((prev) => {
        const map = new Map(prev);
        map.set(key, nextState);
        return map;
      });
      if (user) {
        supabase
          .from("flashcard_reviews")
          .upsert(
            {
              user_id: user.id,
              deck,
              card_key: key,
              interval_days: nextState.intervalDays,
              due_at: nextState.dueAt,
              last_grade: grade,
              reps: nextState.reps,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,card_key" },
          )
          .then(({ error }) => {
            if (error) console.error("Failed to save flashcard review", error);
          });
      }
    },
    [user, deck, reviews],
  );

  const resetDeck = useCallback(() => {
    setReviews(new Map());
    if (user) {
      supabase
        .from("flashcard_reviews")
        .delete()
        .eq("user_id", user.id)
        .eq("deck", deck)
        .then(({ error }) => {
          if (error) console.error("Failed to reset flashcard schedule", error);
        });
    }
  }, [user, deck]);

  return { reviews, hydrated, recordGrade, resetDeck };
}

// ── Urdu deck ─────────────────────────────────────────────────────────────────

function buildUrduDeck(cat: string, reviews: ReviewMap): UrduCard[] {
  const base = cat === "All" ? URDU_CARDS : URDU_CARDS.filter((c) => c.cat === cat);
  return base.filter((c) => isDue(reviews.get(cardKeyFor("urdu", c.id))));
}

function UrduDeck({ onBack }: { onBack: () => void }) {
  const { reviews, hydrated, recordGrade, resetDeck } = useFlashcardReviews("urdu");
  const [cat, setCat] = useState("All");
  const [catMenuOpen, setCatMenuOpen] = useState(false);
  const [ds, setDs] = useState<{ deck: UrduCard[]; index: number; flipped: boolean } | null>(null);

  // Seed the session deck from what's due the first time reviews have loaded.
  if (ds === null && hydrated) {
    setDs({ deck: buildUrduDeck("All", reviews), index: 0, flipped: false });
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
    setDs({ deck: buildUrduDeck(c, reviews), index: 0, flipped: false });
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
    recordGrade(c.id, g);
    const gap = SESSION_GAP[g];
    setDs((s) => {
      if (!s) return s;
      if (gap === null) {
        // leaves the session — splice it out and clamp the index
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
    setDs((s) => (s ? { deck: shuffleArr(s.deck), index: 0, flipped: false } : s));
  }

  function doReset() {
    resetDeck();
    setDs({ deck: cat === "All" ? [...URDU_CARDS] : URDU_CARDS.filter((c) => c.cat === cat), index: 0, flipped: false });
  }

  return (
    <>
      <BackLink onBack={onBack} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "16px 0 0" }}>
        <h1 style={{ fontFamily: SERIF, fontSize: 27, lineHeight: 1, color: "#2f2f2f", margin: 0, letterSpacing: "-0.01em" }}>Urdu</h1>
        <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 12, color: "#b3aaa0", flex: "none" }}>{total} due</span>
      </div>

      <div style={{ marginTop: 20, marginBottom: 22, position: "relative" }}>
        <span onClick={() => setCatMenuOpen((v) => !v)} style={{ fontFamily: SERIF, fontSize: 14, color: "#2f2f2f", textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}>
          {cat} {catMenuOpen ? "▴" : "▾"}
        </span>
        {catMenuOpen && (
          <div style={{ position: "absolute", top: 26, left: 0, zIndex: 6, background: "#fdfcfa", border: "1px solid #e2dbd2", padding: "10px 16px", display: "flex", flexDirection: "column", gap: 10, minWidth: 150, boxShadow: "0 8px 20px rgba(0,0,0,.08)" }}>
            {URDU_CATEGORIES.map((c) => (
              <span
                key={c}
                onClick={() => selectCat(c)}
                style={{ fontFamily: SERIF, fontSize: 14, color: cat === c ? "#2f2f2f" : "#b3aaa0", textDecoration: cat === c ? "underline" : "none", textUnderlineOffset: 3, cursor: "pointer" }}
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: 1, background: "#e2dbd2", marginBottom: 4 }}>
        <div style={{ height: 1, background: "#2323e8", width: `${progressPct}%`, transition: "width .3s ease" }} />
      </div>
      <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 12, color: "#b3aaa0", margin: "8px 0 26px" }}>
        {hydrated ? (total ? "reviewing what's due" : "nothing due right now") : "Loading…"}
      </p>

      <div style={cardScene} onClick={flip}>
        <div style={{ width: "100%", height: "100%", position: "relative", transformStyle: "preserve-3d", transition: "transform .45s cubic-bezier(.4,0,.2,1)", transform: ds?.flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
          <div style={cardFace}>
            <p className={nastaliq.className} dir="rtl" style={{ fontSize: 42, lineHeight: 1.4, color: "#2f2f2f", margin: 0, textAlign: "center", fontWeight: 400 }}>
              {card ? card.urdu : "—"}
            </p>
            <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13, letterSpacing: "0.02em", color: "#c5bdb5", margin: "22px 0 0" }}>tap to reveal</p>
          </div>
          <div style={{ ...cardFace, transform: "rotateY(180deg)" }}>
            <p className={nastaliq.className} dir="rtl" style={{ fontSize: 30, lineHeight: 1.3, color: "#2f2f2f", margin: 0, textAlign: "center", fontWeight: 400 }}>
              {card ? card.urdu : "—"}
            </p>
            <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 15, color: "#a39a90", margin: "10px 0 0" }}>{card ? card.roman : ""}</p>
            <p style={{ fontFamily: SERIF, fontSize: 20, lineHeight: 1.4, color: "#2f2f2f", margin: "18px 0 0", textAlign: "center" }}>{card ? card.english : "Done!"}</p>
          </div>
        </div>
      </div>

      <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13, color: "#b3aaa0", textAlign: "center", margin: "18px 0 0" }}>
        {total ? `${(ds?.index ?? 0) + 1} / ${total}` : hydrated ? "All caught up!" : ""}
      </p>

      <GradingControls onPrev={prev} onNoIdea={noIdea} onNeedsWork={needsWork} onFeelingGood={feelingGood} onMastered={markMastered} />
      <ShuffleReset onShuffle={doShuffle} onReset={doReset} />
      <SessionStats noIdea={sessNoIdea} needsWork={sessNeedsWork} feelingGood={sessFeelingGood} mastered={sessMastered} />
    </>
  );
}

// ── English vocabulary deck ────────────────────────────────────────────────────

function EnglishDeck({ onBack }: { onBack: () => void }) {
  const { words, hydrated: vocabHydrated } = useVocab();
  const { reviews, hydrated: reviewsHydrated, recordGrade, resetDeck } = useFlashcardReviews("english");
  const quizzable = sortWordsAlphabetically(definedWords(words));
  const ready = vocabHydrated && reviewsHydrated;

  const [ds, setDs] = useState<{ deck: typeof quizzable; index: number; flipped: boolean } | null>(null);

  // Seed the session deck from words that are due, once both vocab and the
  // review schedule have loaded.
  if (ds === null && ready) {
    setDs({ deck: quizzable.filter((w) => isDue(reviews.get(cardKeyFor("english", w.id)))), index: 0, flipped: false });
  }

  const [sessNoIdea, setSessNoIdea] = useState(0);
  const [sessNeedsWork, setSessNeedsWork] = useState(0);
  const [sessFeelingGood, setSessFeelingGood] = useState(0);
  const [sessMastered, setSessMastered] = useState(0);

  const total = ds ? ds.deck.length : 0;
  const card = ds && total ? ds.deck[ds.index] : null;
  const progressPct = total === 0 ? 100 : Math.round(((ds?.index ?? 0) / Math.max(1, total)) * 100);
  const undefinedCount = words.length - quizzable.length;

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
    const w = ds.deck[ds.index];
    recordGrade(w.id, g);
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
    setDs((s) => (s ? { deck: shuffleArr(s.deck), index: 0, flipped: false } : s));
  }

  function doReset() {
    resetDeck();
    setDs({ deck: quizzable, index: 0, flipped: false });
  }

  return (
    <>
      <BackLink onBack={onBack} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "16px 0 0" }}>
        <h1 style={{ fontFamily: SERIF, fontSize: 27, lineHeight: 1, color: "#2f2f2f", margin: 0, letterSpacing: "-0.01em" }}>English</h1>
        <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 12, color: "#b3aaa0", flex: "none" }}>{total} due</span>
      </div>

      <div style={{ height: 1, background: "#e2dbd2", marginTop: 20, marginBottom: 4 }}>
        <div style={{ height: 1, background: "#2323e8", width: `${progressPct}%`, transition: "width .3s ease" }} />
      </div>
      <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 12, color: "#b3aaa0", margin: "8px 0 26px" }}>
        {ready ? (total ? "reviewing what's due" : "nothing due right now") : "Loading…"}
        {undefinedCount > 0 && ` · ${undefinedCount} words need a definition first`}
      </p>

      <div style={cardScene} onClick={flip}>
        <div style={{ width: "100%", height: "100%", position: "relative", transformStyle: "preserve-3d", transition: "transform .45s cubic-bezier(.4,0,.2,1)", transform: ds?.flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
          <div style={cardFace}>
            <p style={{ fontFamily: SERIF, fontSize: 40, lineHeight: 1.1, color: "#2f2f2f", margin: 0, textAlign: "center" }}>{card ? card.word : "Done!"}</p>
            <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13, letterSpacing: "0.02em", color: "#c5bdb5", margin: "22px 0 0" }}>tap to reveal</p>
          </div>
          <div style={{ ...cardFace, transform: "rotateY(180deg)" }}>
            <p style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1.1, color: "#2f2f2f", margin: 0, textAlign: "center" }}>{card ? card.word : "Done!"}</p>
            {card?.pos && (
              <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 15, color: "#a39a90", margin: "10px 0 0" }}>{card.pos}</p>
            )}
            <p style={{ fontFamily: SERIF, fontSize: 18, lineHeight: 1.5, color: "#2f2f2f", margin: "18px 0 0", textAlign: "center" }}>{card ? card.definition : ""}</p>
          </div>
        </div>
      </div>

      <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13, color: "#b3aaa0", textAlign: "center", margin: "18px 0 0" }}>
        {total ? `${(ds?.index ?? 0) + 1} / ${total}` : quizzable.length === 0 ? "No words to study yet" : "All caught up!"}
      </p>

      <GradingControls onPrev={prev} onNoIdea={noIdea} onNeedsWork={needsWork} onFeelingGood={feelingGood} onMastered={markMastered} />
      <ShuffleReset onShuffle={doShuffle} onReset={doReset} />
      <SessionStats noIdea={sessNoIdea} needsWork={sessNeedsWork} feelingGood={sessFeelingGood} mastered={sessMastered} />
    </>
  );
}
