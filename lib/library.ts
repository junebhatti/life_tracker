// Library note model and a small Markdown frontmatter parser, used to sync
// an Obsidian vault (read locally via the browser's folder picker) in as
// Library entries, optionally linked to People.

export type LibraryNote = {
  id: string;
  /** Path relative to the synced folder, e.g. "People/Calls/Jane Doe.md". */
  path: string;
  title: string;
  content: string;
  /** Tags from the note's frontmatter — overwritten on every sync. */
  tags: string[];
  /** Tags added in the app. Sync never touches this, so they survive
   *  re-syncing the same note from Obsidian. */
  manualTags: string[];
  /** The folder the note sits directly inside, used to group the Library
   *  into tabs (e.g. "Quotes/Tony Robbins.md" -> category "Quotes"). */
  category?: string;
  /** Person IDs this note is linked to, resolved at sync time from a
   *  `person`/`people` frontmatter field. */
  personIds: string[];
  /** The source file's last-modified time, if known. */
  sourceModifiedAt?: string;
  syncedAt: string;
  createdAt: string;
};

export type ParsedNote = {
  path: string;
  title: string;
  content: string;
  tags: string[];
  category?: string;
  /** Names this note is linked to, resolved to Person IDs at sync time. */
  personNames: string[];
  sourceModifiedAt: string;
};

/** A folder where every note is about one person, named after them (e.g.
 *  "People/Calls/Jane Doe.md") — matched by folder name anywhere in the
 *  path, case-insensitively, so it works whether the vault, "People", or
 *  "Calls" itself is the folder picked to sync. */
const PEOPLE_FOLDER_NAMES = ["calls"];

/** Parses an Obsidian-style note: YAML frontmatter (title, tags, person/people)
 *  plus body content. Falls back to the filename when there's no title field.
 *  Notes inside a people folder (see PEOPLE_FOLDER_NAMES) are linked to the
 *  person named by the filename, even without frontmatter. */
export function parseMarkdownNote(
  path: string,
  raw: string,
  sourceModifiedAt: string,
): ParsedNote {
  const { data, content } = parseFrontmatter(raw);
  const filenameTitle = titleFromPath(path);
  const title =
    typeof data.title === "string" && data.title.trim()
      ? data.title.trim()
      : filenameTitle;

  const personNames = normalizeStringArray(
    data.person ?? data.people ?? data.persons,
  );
  if (isInPeopleFolder(path) && !personNames.includes(filenameTitle)) {
    personNames.push(filenameTitle);
  }

  return {
    path,
    title,
    content: content.trim(),
    tags: normalizeStringArray(data.tags),
    category: categoryFromPath(path),
    personNames,
    sourceModifiedAt,
  };
}

function titleFromPath(path: string): string {
  const file = path.split("/").pop() ?? path;
  return file.replace(/\.md$/i, "");
}

/** The folder a note sits directly inside, e.g. "Quotes/Tony Robbins.md" ->
 *  "Quotes". Undefined if the note has no parent folder. */
function categoryFromPath(path: string): string | undefined {
  const folders = path.split("/").slice(0, -1);
  return folders.length > 0 ? folders[folders.length - 1] : undefined;
}

function isInPeopleFolder(path: string): boolean {
  const folders = path.split("/").slice(0, -1);
  return folders.some((folder) =>
    PEOPLE_FOLDER_NAMES.includes(folder.toLowerCase()),
  );
}

function normalizeStringArray(value: unknown): string[] {
  if (value == null) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.map((v) => String(v).trim()).filter(Boolean);
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

/** Minimal YAML frontmatter parser covering the subset Obsidian actually
 *  writes: flat `key: value`, inline `key: [a, b]` lists, and block lists
 *  (`key:` followed by indented `- item` lines). Not a general YAML parser. */
function parseFrontmatter(raw: string): {
  data: Record<string, unknown>;
  content: string;
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };

  const [, yaml, content] = match;
  const data: Record<string, unknown> = {};
  let currentKey: string | null = null;

  for (const line of yaml.split(/\r?\n/)) {
    const listItem = line.match(/^\s+-\s*(.+)$/);
    if (listItem && currentKey) {
      (data[currentKey] as string[]).push(stripQuotes(listItem[1].trim()));
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, rawValue] = kv;
    const value = rawValue.trim();
    if (value === "") {
      currentKey = key;
      data[key] = [];
    } else if (value.startsWith("[") && value.endsWith("]")) {
      data[key] = value
        .slice(1, -1)
        .split(",")
        .map((v) => stripQuotes(v.trim()))
        .filter(Boolean);
      currentKey = null;
    } else {
      data[key] = stripQuotes(value);
      currentKey = null;
    }
  }

  return { data, content };
}
