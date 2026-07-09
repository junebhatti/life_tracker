// English Vocabulary word model, shared between the word-list view and the
// English flashcard deck. A word can exist with no definition yet — it was
// captured while reading and is filled in later from the app.

export type VocabWord = {
  id: string;
  word: string;
  definition?: string;
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
