// English Vocabulary word model, shared between the word-list view and the
// English flashcard deck. A word can exist with no definition yet — it was
// captured while reading and is filled in later from the app.

export type PartOfSpeech = "noun" | "verb" | "adjective" | "adverb" | "place" | "phrase";

export const POS_LIST: PartOfSpeech[] = ["noun", "verb", "adjective", "adverb", "place", "phrase"];

export const POS_SHORT: Record<PartOfSpeech, string> = {
  noun: "n",
  verb: "v",
  adjective: "adj",
  adverb: "adv",
  place: "place",
  phrase: "phr",
};

export const POS_COLORS: Record<PartOfSpeech, { bg: string; fg: string }> = {
  noun: { bg: "#ece6df", fg: "#6a6560" },
  verb: { bg: "#dfe7e2", fg: "#3d6b57" },
  adjective: { bg: "#e7e0f0", fg: "#5f4f8a" },
  adverb: { bg: "#f0e6d8", fg: "#8a6a3d" },
  place: { bg: "#dbe4ef", fg: "#3d5f8a" },
  phrase: { bg: "#f0dbe0", fg: "#8a3d5c" },
};

export type VocabWord = {
  id: string;
  word: string;
  definition?: string;
  pos?: PartOfSpeech;
  example?: string;
  synonyms?: string[];
  createdAt: string;
};

/** Alphabetical, case-insensitive — a reference list reads like a dictionary. */
export function sortWordsAlphabetically(words: VocabWord[]): VocabWord[] {
  return [...words].sort((a, b) => a.word.localeCompare(b.word, undefined, { sensitivity: "base" }));
}

/** Only words with a definition can be quizzed as flashcards. */
export function definedWords(words: VocabWord[]): VocabWord[] {
  return words.filter((w) => Boolean(w.definition && w.definition.trim()));
}
