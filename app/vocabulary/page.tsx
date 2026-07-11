"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useVocab } from "@/components/VocabStore";
import { POS_LIST, POS_SHORT, sortWordsAlphabetically, type PartOfSpeech, type VocabWord } from "@/lib/vocab";

const SERIF = "'Times New Roman', Times, serif";

function posLabel(pos?: PartOfSpeech): string {
  return pos ? POS_SHORT[pos] : "";
}

// ── part-of-speech picker (plain text row, active one underlined) ────────────

function PosPicker({ value, onChange }: { value: PartOfSpeech; onChange: (pos: PartOfSpeech) => void }) {
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
      {POS_LIST.map((p) => (
        <span
          key={p}
          onClick={() => onChange(p)}
          style={{
            fontFamily: SERIF,
            fontSize: 15,
            cursor: "pointer",
            color: value === p ? "#2f2f2f" : "#b3aaa0",
            textDecoration: value === p ? "underline" : "none",
            textUnderlineOffset: 3,
          }}
        >
          {p}
        </span>
      ))}
    </div>
  );
}

// ── add word sheet ──────────────────────────────────────────────────────────

function AddWordSheet({ onClose }: { onClose: () => void }) {
  const { addWord } = useVocab();
  const [word, setWord] = useState("");
  const [pos, setPos] = useState<PartOfSpeech>("noun");
  const [definition, setDefinition] = useState("");

  function save() {
    if (!word.trim()) return;
    addWord({ word, pos, definition });
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(30,28,26,.45)" }} />
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 0,
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 480,
          background: "#fdfcfa",
          borderTop: "1px solid #2f2f2f",
          padding: "26px 24px 36px",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <p style={{ fontFamily: SERIF, fontSize: 12, letterSpacing: "0.02em", textTransform: "uppercase", color: "#2f2f2f", margin: 0 }}>
            New Word
          </p>
          <span
            onClick={onClose}
            style={{ fontFamily: SERIF, fontSize: 13, letterSpacing: "0.03em", textTransform: "uppercase", color: "#2f2f2f", textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}
          >
            Close ×
          </span>
        </div>
        <div style={{ height: 1, background: "#2f2f2f", margin: "12px 0 20px" }} />

        <input
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="Word"
          autoFocus
          style={{ width: "100%", border: "none", borderBottom: "1px solid #d8d1c8", background: "transparent", padding: "4px 0 10px", fontFamily: SERIF, fontSize: 30, color: "#2f2f2f", outline: "none", marginBottom: 20 }}
        />

        <p style={{ fontFamily: SERIF, fontSize: 11, letterSpacing: "0.02em", textTransform: "uppercase", color: "#9b9a97", margin: "0 0 8px" }}>
          Part of speech
        </p>
        <PosPicker value={pos} onChange={setPos} />

        <p style={{ fontFamily: SERIF, fontSize: 11, letterSpacing: "0.02em", textTransform: "uppercase", color: "#9b9a97", margin: "0 0 6px" }}>
          Definition
        </p>
        <textarea
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          rows={3}
          placeholder="Add a definition…"
          style={{ width: "100%", border: "1px solid #e2dbd2", background: "transparent", padding: "9px 10px", fontFamily: SERIF, fontSize: 15, lineHeight: 1.5, color: "#2f2f2f", outline: "none", resize: "none", marginBottom: 24 }}
        />

        <div style={{ height: 1, background: "#e2dbd2", marginBottom: 16 }} />
        <div style={{ display: "flex", gap: 26 }}>
          <span onClick={onClose} style={{ fontFamily: SERIF, fontSize: 14, letterSpacing: "0.03em", textTransform: "uppercase", color: "#8a8783", textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}>
            Cancel
          </span>
          <span onClick={save} style={{ fontFamily: SERIF, fontSize: 14, letterSpacing: "0.03em", textTransform: "uppercase", color: "#2f2f2f", textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}>
            Save
          </span>
        </div>
      </div>
    </div>
  );
}

// ── word detail / edit bottom sheet ─────────────────────────────────────────

function WordSheet({ word, onClose }: { word: VocabWord; onClose: () => void }) {
  const { updateWord, deleteWord } = useVocab();
  const [editing, setEditing] = useState(false);
  const [wordVal, setWordVal] = useState(word.word);
  const [posVal, setPosVal] = useState<PartOfSpeech>(word.pos ?? "noun");
  const [defVal, setDefVal] = useState(word.definition ?? "");
  const [exVal, setExVal] = useState(word.example ?? "");

  function startEdit() {
    setWordVal(word.word);
    setPosVal(word.pos ?? "noun");
    setDefVal(word.definition ?? "");
    setExVal(word.example ?? "");
    setEditing(true);
  }

  function save() {
    updateWord(word.id, { word: wordVal, pos: posVal, definition: defVal, example: exVal });
    setEditing(false);
  }

  function remove() {
    deleteWord(word.id);
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(30,28,26,.45)" }} />
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 0,
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 480,
          background: "#fdfcfa",
          borderTop: "1px solid #2f2f2f",
          padding: "26px 24px 36px",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
      >
        {editing ? (
          <>
            <input
              value={wordVal}
              onChange={(e) => setWordVal(e.target.value)}
              autoFocus
              style={{ width: "100%", border: "none", borderBottom: "1px solid #d8d1c8", background: "transparent", padding: "4px 0 10px", fontFamily: SERIF, fontSize: 26, color: "#2f2f2f", outline: "none", marginBottom: 16 }}
            />
            <p style={{ fontFamily: SERIF, fontSize: 11, letterSpacing: "0.02em", textTransform: "uppercase", color: "#9b9a97", margin: "0 0 8px" }}>
              Part of speech
            </p>
            <PosPicker value={posVal} onChange={setPosVal} />
            <p style={{ fontFamily: SERIF, fontSize: 11, letterSpacing: "0.02em", textTransform: "uppercase", color: "#9b9a97", margin: "0 0 6px" }}>
              Definition
            </p>
            <textarea
              value={defVal}
              onChange={(e) => setDefVal(e.target.value)}
              rows={3}
              placeholder="Add a definition…"
              style={{ width: "100%", border: "1px solid #e2dbd2", background: "transparent", padding: "9px 10px", fontFamily: SERIF, fontSize: 15, lineHeight: 1.5, color: "#2f2f2f", outline: "none", resize: "none", marginBottom: 14 }}
            />
            <p style={{ fontFamily: SERIF, fontSize: 11, letterSpacing: "0.02em", textTransform: "uppercase", color: "#9b9a97", margin: "0 0 6px" }}>
              Example
            </p>
            <textarea
              value={exVal}
              onChange={(e) => setExVal(e.target.value)}
              rows={2}
              placeholder="Add an example sentence…"
              style={{ width: "100%", border: "1px solid #e2dbd2", background: "transparent", padding: "9px 10px", fontFamily: SERIF, fontStyle: "italic", fontSize: 14, lineHeight: 1.5, color: "#2f2f2f", outline: "none", resize: "none", marginBottom: 20 }}
            />
            <div style={{ height: 1, background: "#e2dbd2", marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 26 }}>
              <span onClick={() => setEditing(false)} style={{ fontFamily: SERIF, fontSize: 14, letterSpacing: "0.03em", textTransform: "uppercase", color: "#8a8783", textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}>
                Cancel
              </span>
              <span onClick={save} style={{ fontFamily: SERIF, fontSize: 14, letterSpacing: "0.03em", textTransform: "uppercase", color: "#2f2f2f", textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}>
                Save
              </span>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "flex-end" }}>
              <span onClick={onClose} style={{ fontFamily: SERIF, fontSize: 13, letterSpacing: "0.03em", textTransform: "uppercase", color: "#2f2f2f", textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}>
                Close ×
              </span>
            </div>
            <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 44, lineHeight: 1.05, color: "#1a1a1a", margin: "14px 0 0" }}>{word.word}</h2>
            {word.pos && (
              <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 16, color: "#a39a90", margin: "14px 0 0" }}>
                {word.pos.charAt(0).toUpperCase() + word.pos.slice(1)}
              </p>
            )}
            {word.definition ? (
              <p style={{ fontFamily: SERIF, fontSize: 17, lineHeight: 1.6, color: "#2f2f2f", margin: "14px 0 0" }}>{word.definition}</p>
            ) : (
              <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 15, lineHeight: 1.5, color: "#b3aaa0", margin: "14px 0 0" }}>No definition yet.</p>
            )}
            {word.example && (
              <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 15, lineHeight: 1.7, color: "#6a6560", margin: "16px 0 0" }}>{word.example}</p>
            )}
            {word.synonyms && word.synonyms.length > 0 && (
              <>
                <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 16, color: "#a39a90", margin: "26px 0 0" }}>Synonyms</p>
                <p style={{ fontFamily: SERIF, fontSize: 16, lineHeight: 1.5, color: "#a39a90", margin: "8px 0 0" }}>{word.synonyms.join(" · ")}</p>
              </>
            )}
            <div style={{ height: 1, background: "#e2dbd2", margin: "26px 0 18px" }} />
            <div style={{ display: "flex", gap: 26 }}>
              <span onClick={startEdit} style={{ fontFamily: SERIF, fontSize: 14, letterSpacing: "0.03em", textTransform: "uppercase", color: "#2f2f2f", textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}>
                Edit
              </span>
              <span onClick={remove} style={{ fontFamily: SERIF, fontSize: 14, letterSpacing: "0.03em", textTransform: "uppercase", color: "#b23a2e", textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}>
                Delete
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function VocabularyPage() {
  const { words, hydrated } = useVocab();
  const [adding, setAdding] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [missingOnly, setMissingOnly] = useState(false);

  const missingCount = useMemo(() => words.filter((w) => !w.definition || !w.definition.trim()).length, [words]);
  const sorted = useMemo(() => {
    const base = missingOnly ? words.filter((w) => !w.definition || !w.definition.trim()) : words;
    return sortWordsAlphabetically(base);
  }, [words, missingOnly]);
  const active = activeId ? words.find((w) => w.id === activeId) ?? null : null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto" style={{ background: "#ffffff" }}>
        <div className="mx-auto max-w-2xl px-5 pb-16 pt-11">
          <Link
            href="/projects"
            style={{ fontFamily: SERIF, fontSize: 13, color: "#a39a90" }}
            className="transition-colors hover:opacity-70"
          >
            ‹ Projects
          </Link>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 9, minWidth: 0 }}>
              <h1 style={{ fontFamily: SERIF, fontSize: 34, lineHeight: 1, color: "#2f2f2f", margin: 0, letterSpacing: "-0.01em" }}>
                Chasing Articulation
              </h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, flex: "none" }}>
              <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 12, color: "#b3aaa0", whiteSpace: "nowrap" }}>
                {words.length} word{words.length === 1 ? "" : "s"}
              </span>
              <span
                onClick={() => setAdding(true)}
                style={{
                  width: 25,
                  height: 25,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "none",
                  color: "#9b9a97",
                  fontFamily: SERIF,
                  fontSize: 19,
                  cursor: "pointer",
                }}
              >
                +
              </span>
            </div>
          </div>

          {missingCount > 0 && (
            <div style={{ marginTop: -12, marginBottom: 20 }}>
              <span
                onClick={() => setMissingOnly((v) => !v)}
                style={{
                  fontFamily: SERIF,
                  fontSize: 12,
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                  color: missingOnly ? "#2f2f2f" : "#a39a90",
                  textDecoration: missingOnly ? "underline" : "none",
                  textUnderlineOffset: 3,
                  cursor: "pointer",
                }}
              >
                {missingOnly ? "Showing missing definitions" : `${missingCount} missing a definition`}
              </span>
            </div>
          )}

          {!hydrated && (
            <div className="mt-6 flex flex-col gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-8 w-full animate-pulse rounded bg-hover" />
              ))}
            </div>
          )}

          {hydrated && words.length === 0 && (
            <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 15, color: "#b3aaa0", marginTop: 40 }}>
              No words yet — tap + to add one.
            </p>
          )}

          {hydrated && words.length > 0 && sorted.length === 0 && (
            <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 15, color: "#b3aaa0", marginTop: 40 }}>
              Every word has a definition.
            </p>
          )}

          {hydrated && sorted.length > 0 && (
            <div style={{ marginTop: 44 }}>
              {sorted.map((w) => (
                <div
                  key={w.id}
                  onClick={() => setActiveId(w.id)}
                  style={{ display: "flex", alignItems: "center", cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", padding: "3px 0" }}
                >
                  <span style={{ fontFamily: SERIF, fontSize: 34, lineHeight: 1.08, color: "#2f2f2f" }}>{w.word}</span>
                  {w.pos && (
                    <span style={{ margin: "0 0 0 10px", fontFamily: SERIF, fontSize: 17, color: "#a39a90" }}>{posLabel(w.pos)}</span>
                  )}
                  {(!w.definition || !w.definition.trim()) && (
                    <span style={{ margin: "0 0 0 10px", fontFamily: SERIF, fontStyle: "italic", fontSize: 13, color: "#c5bdb5" }}>no definition yet</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {adding && <AddWordSheet onClose={() => setAdding(false)} />}
      {active && <WordSheet word={active} onClose={() => setActiveId(null)} />}
    </div>
  );
}
