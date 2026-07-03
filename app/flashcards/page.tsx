"use client";

import { useEffect, useMemo, useState } from "react";
import { Newsreader, Noto_Nastaliq_Urdu } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { URDU_CARDS, URDU_CATEGORIES, type UrduCard } from "@/lib/urduCards";

const newsreader = Newsreader({ subsets: ["latin"], weight: ["500"] });
const nastaliq = Noto_Nastaliq_Urdu({ subsets: ["arabic"], weight: ["400"] });

const STORAGE_KEY = "urdu_mastered";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function FlashcardsPage() {
  const [cat, setCat] = useState<string>("All");
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mastered, setMastered] = useState<Set<string>>(new Set());
  const [order, setOrder] = useState<string[] | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMastered(new Set(JSON.parse(raw) as string[]));
    } catch {
      // ignore
    }
  }, []);

  function persist(next: Set<string>) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      // ignore
    }
  }

  const deck = useMemo(() => {
    let cards = URDU_CARDS.filter((c) => cat === "All" || c.cat === cat).filter((c) => !mastered.has(c.id));
    if (order) {
      const pos = new Map(order.map((id, i) => [id, i]));
      cards = [...cards].sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0));
    }
    return cards;
  }, [cat, mastered, order]);

  const total = useMemo(() => URDU_CARDS.filter((c) => cat === "All" || c.cat === cat).length, [cat]);
  const masteredInCat = total - deck.length;
  const safeIndex = deck.length ? Math.min(index, deck.length - 1) : 0;
  const card: UrduCard | undefined = deck[safeIndex];
  const isMastered = card ? mastered.has(card.id) : false;
  const progressPct = total ? Math.round((masteredInCat / total) * 100) : 0;

  const selectCat = (c: string) => { setCat(c); setIndex(0); setFlipped(false); };
  const next = () => { if (deck.length) { setIndex((i) => (i + 1) % deck.length); setFlipped(false); } };
  const prev = () => { if (deck.length) { setIndex((i) => (i - 1 + deck.length) % deck.length); setFlipped(false); } };
  const toggleMastered = () => {
    if (!card) return;
    const nextSet = new Set(mastered);
    if (nextSet.has(card.id)) nextSet.delete(card.id); else nextSet.add(card.id);
    setMastered(nextSet); persist(nextSet); setFlipped(false);
  };
  const doShuffle = () => { setOrder(shuffle(deck.map((c) => c.id))); setIndex(0); setFlipped(false); };
  const doReset = () => { const e = new Set<string>(); setMastered(e); persist(e); setOrder(null); setIndex(0); setFlipped(false); };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto" style={{ background: "#f6f1ed" }}>
        <div className="mx-auto max-w-[480px] px-5 pb-12 pt-8">
          {/* header */}
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#9b9a97]">
            Elementary Urdu II
          </p>
          <h1 className={`${newsreader.className} mt-1 text-[28px] font-medium leading-[1.1] tracking-[-0.01em] text-[#2f2f2f]`}>
            Flashcards
          </h1>
          <p className="mt-2 text-[13px] leading-[1.4] text-[#9b9a97]">
            {masteredInCat} of {total} mastered · {URDU_CARDS.length} cards total
          </p>

          {/* category chips */}
          <div className="mt-5 flex flex-wrap gap-1.5">
            {URDU_CATEGORIES.map((c) => {
              const active = cat === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => selectCat(c)}
                  className={`rounded-md px-[11px] py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.06em] transition-colors ${
                    active ? "bg-[#2f2d2b] text-[#f6f1ed]" : "bg-[#ece6df] text-[#6a6560] hover:bg-[#e3ddd5]"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>

          {/* progress */}
          <div className="mt-5 h-[3px] w-full overflow-hidden rounded-full bg-[#ece6df]">
            <div className="h-full rounded-full bg-[#b23a2e] transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>

          {/* flip card */}
          {card ? (
            <div className="mx-auto mt-6" style={{ perspective: 900, maxWidth: 380, height: 240 }}>
              <button
                type="button"
                onClick={() => setFlipped((f) => !f)}
                className="relative block h-full w-full cursor-pointer text-left"
                style={{
                  transformStyle: "preserve-3d",
                  transition: "transform 0.45s cubic-bezier(0.4,0,0.2,1)",
                  transform: flipped ? "rotateY(180deg)" : "none",
                }}
              >
                {/* front */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center rounded-[18px] border border-[#ece6df] bg-white"
                  style={{ backfaceVisibility: "hidden", boxShadow: "0 8px 30px rgba(0,0,0,0.10)" }}
                >
                  <span className="absolute top-[18px] font-mono text-[10px] font-medium uppercase tracking-[0.10em] text-[#d4cfc9]">
                    {card.cat}
                  </span>
                  <span dir="rtl" className={`${nastaliq.className} px-6 text-center text-[42px] leading-[1.5] text-[#2f2f2f]`}>
                    {card.urdu}
                  </span>
                  <span className="absolute bottom-[18px] font-mono text-[9.5px] uppercase tracking-[0.12em] text-[#c2bfba]">
                    Tap to reveal
                  </span>
                </div>
                {/* back */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center rounded-[18px] bg-[#2f2d2b] px-6 text-center"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", boxShadow: "0 8px 30px rgba(0,0,0,0.10)" }}
                >
                  <span className={`${newsreader.className} text-[30px] leading-tight text-[#f6f1ed]`}>{card.english}</span>
                  <span className="mt-3 font-mono text-[13px] tracking-[0.02em] text-[#b3aaa0]">{card.roman}</span>
                </div>
              </button>
            </div>
          ) : (
            <div className="mx-auto mt-6 flex flex-col items-center justify-center rounded-[18px] border border-[#ece6df] bg-[#fdfbf9]" style={{ maxWidth: 380, height: 240 }}>
              <p className={`${newsreader.className} text-2xl text-[#2f2f2f]`}>All caught up!</p>
              <p className="mt-2 text-[13px] text-[#9b9a97]">Every card in {cat} is mastered.</p>
            </div>
          )}

          {/* position */}
          {card && <p className="mt-4 text-center font-mono text-[11px] text-[#b3aaa0]">{safeIndex + 1} / {deck.length}</p>}

          {/* controls */}
          {card && (
            <div className="mt-4 flex items-center justify-between">
              <button type="button" onClick={prev} className="px-2 py-2 font-mono text-[12px] font-medium text-[#2f2f2f] hover:opacity-70">
                ‹ Prev
              </button>
              <button
                type="button"
                onClick={toggleMastered}
                className={`flex items-center gap-1.5 rounded-full border px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-wide transition-colors ${
                  isMastered ? "border-[#16a34a] bg-[#16a34a] text-white" : "border-[#ece6df] text-[#b3aaa0] hover:text-[#2f2f2f]"
                }`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12l5 5L19 7" stroke={isMastered ? "#fff" : "#b3aaa0"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {isMastered ? "Mastered" : "Master"}
              </button>
              <button type="button" onClick={next} className="px-2 py-2 font-mono text-[12px] font-medium text-[#2f2f2f] hover:opacity-70">
                Next ›
              </button>
            </div>
          )}

          <p className="mt-4 text-center text-[12px] text-[#b3aaa0]">Tap the card to flip · mark cards you know as mastered</p>

          <div className="mt-6 flex justify-center gap-6">
            <button type="button" onClick={doShuffle} className="font-mono text-[11px] font-medium uppercase tracking-wide text-[#9b9a97] hover:text-[#2f2f2f]">
              Shuffle
            </button>
            <button type="button" onClick={doReset} className="font-mono text-[11px] font-medium uppercase tracking-wide text-[#b23a2e] hover:opacity-70">
              Reset progress
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
