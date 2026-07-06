import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors, fonts } from "../theme";
import { useAppState } from "../state/AppState";
import { supabase } from "../lib/supabase";
import {
  extractUrl,
  normalizeContentUrl,
  sourceLabel,
  episodeToMarkdown,
  formatPlaybackTimestamp,
  type PodcastMeta,
} from "../lib/podcast";
import type { LibraryNote } from "../types";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

type FetchedMeta = {
  title: string;
  show: string;
  host: string;
  coverUrl: string;
  sourceUrl: string;
  sourceLabel: string;
};

type SpotifyNowPlaying =
  | { isEpisode: true; isPlaying: boolean; title: string; show?: string; host?: string; coverUrl?: string; sourceUrl: string; progressMs?: number }
  | { isEpisode: false; isPlaying: boolean };

type SpotifyNowPlayingResponse = { configured: boolean; nowPlaying?: SpotifyNowPlaying | null; error?: string };

async function fetchMetadata(url: string): Promise<FetchedMeta | null> {
  if (!API_URL && Platform.OS !== "web") return null;
  try {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    const res = await fetch(`${API_URL}/api/podcasts/metadata?url=${encodeURIComponent(url)}&t=${Date.now()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as FetchedMeta;
  } catch {
    return null;
  }
}

async function fetchNowPlaying(): Promise<SpotifyNowPlayingResponse | null> {
  if (!API_URL && Platform.OS !== "web") return null;
  try {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    const res = await fetch(`${API_URL}/api/podcasts/spotify/now-playing?t=${Date.now()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
    });
    return (await res.json()) as SpotifyNowPlayingResponse;
  } catch {
    return null;
  }
}

/** Fire-and-forget check for whether Spotify is connected — gates the
 *  "Import current episode" / "Insert timestamp" buttons. */
function useSpotifyConfigured(): boolean {
  const [configured, setConfigured] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetchNowPlaying().then((data) => {
      if (!cancelled && data) setConfigured(Boolean(data.configured));
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return configured;
}

async function readClipboard(): Promise<string> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
      return (await navigator.clipboard.readText()).trim();
    }
  } catch {
    /* clipboard blocked */
  }
  return "";
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* clipboard blocked */
  }
  return false;
}

function parseTags(entry: string): string[] {
  return [
    ...new Set(
      entry
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => (t.startsWith("#") ? t.slice(1) : t)),
    ),
  ];
}

/** User-facing tags, hiding the "PODCASTS" placeholder an untagged episode gets. */
function displayTags(tags: string[]): string[] {
  return tags.filter((t) => t.toUpperCase() !== "PODCASTS");
}

// ── artwork ─────────────────────────────────────────────────────────────────────

function Artwork({ url, size }: { url?: string; size: number }) {
  const [failed, setFailed] = useState(false);
  const radius = Math.round(size * 0.14);
  if (!url || failed) {
    return (
      <View style={[styles.artFallback, { width: size, height: size, borderRadius: radius }]}>
        <Text style={[styles.artFallbackText, { fontSize: size * 0.4 }]}>♪</Text>
      </View>
    );
  }
  return (
    // eslint-disable-next-line jsx-a11y/alt-text -- react-native Image has no alt prop
    <Image
      source={{ uri: url }}
      accessibilityLabel="Episode cover art"
      style={{ width: size, height: size, borderRadius: radius, backgroundColor: colors.border }}
      onError={() => setFailed(true)}
    />
  );
}

// ── import sheet ─────────────────────────────────────────────────────────────────

function ImportModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { addPodcastEpisode, showToast } = useAppState();
  const spotifyReady = useSpotifyConfigured();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [show, setShow] = useState("");
  const [host, setHost] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function doPaste() {
    const text = await readClipboard();
    if (text) {
      setUrl(extractUrl(text) ?? text);
      setStatus("Pulled link from clipboard.");
    } else {
      setStatus("Clipboard is empty or blocked.");
    }
  }

  async function doFetch() {
    const raw = url.trim();
    if (!raw) {
      setStatus("Paste a Spotify or YouTube link first.");
      return;
    }
    if (!normalizeContentUrl(raw)) {
      setStatus("That doesn't look like a Spotify episode or YouTube link.");
      return;
    }
    setBusy(true);
    setStatus("Fetching…");
    const meta = await fetchMetadata(raw);
    setBusy(false);
    if (!meta) {
      setStatus("Couldn't auto-import. Fill the fields in manually.");
      return;
    }
    setTitle(meta.title);
    setShow(meta.show);
    setHost(meta.host);
    setCoverUrl(meta.coverUrl);
    setStatus(`Imported from ${meta.sourceLabel}.`);
  }

  async function importCurrentEpisode() {
    setBusy(true);
    setStatus("Checking Spotify…");
    const data = await fetchNowPlaying();
    setBusy(false);
    if (!data || data.error) {
      setStatus(data?.error ?? "Could not reach Spotify.");
      return;
    }
    if (!data.nowPlaying) {
      setStatus("Nothing is playing on Spotify right now.");
      return;
    }
    if (!data.nowPlaying.isEpisode) {
      setStatus("Spotify is playing music, not a podcast episode.");
      return;
    }
    const np = data.nowPlaying;
    setUrl(np.sourceUrl);
    setTitle(np.title);
    setShow(np.show ?? "");
    setHost(np.host ?? "");
    setCoverUrl(np.coverUrl ?? "");
    setStatus("Imported the episode currently playing on Spotify.");
  }

  function create() {
    const normalized = normalizeContentUrl(url) ?? url.trim();
    if (!normalized) {
      setStatus("Enter a valid episode link.");
      return;
    }
    const meta: PodcastMeta = {
      sourceUrl: normalized,
      sourceLabel: sourceLabel(normalized),
      coverUrl: coverUrl.trim() || undefined,
      show: show.trim() || undefined,
      host: host.trim() || undefined,
    };
    const id = addPodcastEpisode({ title: title.trim() || "Untitled Episode", meta, tags: parseTags(tags) });
    showToast("Added to Library · Podcasts");
    onCreated(id);
  }

  const canCreate = Boolean(normalizeContentUrl(url) || title.trim());

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheetWrap}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Import episode</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.sheetClose}>✕</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
          <View style={styles.urlRow}>
            <TextInput
              style={[styles.field, { flex: 1 }]}
              value={url}
              onChangeText={setUrl}
              placeholder="Spotify or YouTube link"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Pressable style={styles.pasteBtn} onPress={doPaste}>
              <Text style={styles.pasteBtnText}>Paste</Text>
            </Pressable>
          </View>

          <Pressable style={[styles.primaryBtn, busy && styles.btnDisabled]} onPress={doFetch} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Fetch details</Text>}
          </Pressable>

          {spotifyReady ? (
            <Pressable
              style={[styles.secondaryBtn, busy && styles.btnDisabled]}
              onPress={importCurrentEpisode}
              disabled={busy}
            >
              <Text style={styles.secondaryBtnText}>Import current Spotify episode</Text>
            </Pressable>
          ) : null}

          {status ? <Text style={styles.statusText}>{status}</Text> : null}

          <Text style={styles.fieldLabel}>Episode title</Text>
          <TextInput style={styles.field} value={title} onChangeText={setTitle} placeholder="Auto-filled" placeholderTextColor={colors.textTertiary} />

          <Text style={styles.fieldLabel}>Podcast / show</Text>
          <TextInput style={styles.field} value={show} onChangeText={setShow} placeholder="Auto-filled" placeholderTextColor={colors.textTertiary} />

          <Text style={styles.fieldLabel}>Cover image URL</Text>
          <TextInput style={styles.field} value={coverUrl} onChangeText={setCoverUrl} placeholder="Auto-filled" placeholderTextColor={colors.textTertiary} autoCapitalize="none" autoCorrect={false} />

          <Text style={styles.fieldLabel}>Tags / categories (comma separated)</Text>
          <TextInput style={styles.field} value={tags} onChangeText={setTags} placeholder="e.g. audiobook, founder podcast" placeholderTextColor={colors.textTertiary} />

          <Pressable style={[styles.primaryBtn, { marginTop: 20 }, !canCreate && styles.btnDisabled]} onPress={create} disabled={!canCreate}>
            <Text style={styles.primaryBtnText}>Create note</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── editor ───────────────────────────────────────────────────────────────────────

function EpisodeEditor({ episode, onBack }: { episode: LibraryNote; onBack: () => void }) {
  const { savePodcastEpisode, deleteNote, showToast } = useAppState();
  const spotifyReady = useSpotifyConfigured();
  const meta = episode.metadata;
  const [title, setTitle] = useState(episode.rawTitle ?? episode.label);
  const [show, setShow] = useState(meta?.show ?? "");
  const [tags, setTags] = useState(displayTags(episode.tags).join(", "));
  const [body, setBody] = useState(episode.body);
  const [showMenu, setShowMenu] = useState(false);
  const [selection, setSelection] = useState({ start: episode.body.length, end: episode.body.length });
  const [insertingTimestamp, setInsertingTimestamp] = useState(false);

  function persistMeta(nextShow: string) {
    if (!meta) return;
    savePodcastEpisode(episode.id, { meta: { ...meta, show: nextShow.trim() || undefined } });
  }

  async function insertLiveTimestamp() {
    if (!meta?.sourceUrl) {
      showToast("This episode has no source link to match against.");
      return;
    }
    setInsertingTimestamp(true);
    const data = await fetchNowPlaying();
    setInsertingTimestamp(false);
    if (!data || data.error) {
      showToast(data?.error ?? "Could not reach Spotify.");
      return;
    }
    if (!data.nowPlaying || !data.nowPlaying.isEpisode) {
      showToast("Spotify isn't playing a podcast episode right now.");
      return;
    }
    const np = data.nowPlaying;
    const matches =
      normalizeContentUrl(np.sourceUrl) === normalizeContentUrl(meta.sourceUrl) || np.sourceUrl === meta.sourceUrl;
    if (!matches) {
      showToast("Spotify is playing a different episode than this note.");
      return;
    }
    if (np.progressMs === undefined) {
      showToast("Spotify didn't return a playback position.");
      return;
    }
    const insert = `[${formatPlaybackTimestamp(np.progressMs)}] `;
    const start = selection.start;
    const end = selection.end;
    const next = `${body.slice(0, start)}${insert}${body.slice(end)}`;
    setBody(next);
    savePodcastEpisode(episode.id, { body: next });
    const pos = start + insert.length;
    setSelection({ start: pos, end: pos });
    showToast("Inserted current timestamp");
  }

  async function copyMarkdown() {
    const md = episodeToMarkdown({
      title,
      meta: meta ?? { sourceUrl: "" },
      body,
      tags: parseTags(tags),
      updatedAt: new Date().toLocaleString(),
    });
    const ok = await writeClipboard(md);
    showToast(ok ? "Markdown copied to clipboard" : "Clipboard blocked on this device");
    setShowMenu(false);
  }

  function remove() {
    deleteNote(episode.id);
    setShowMenu(false);
    onBack();
  }

  const label = meta ? sourceLabel(meta.sourceUrl) : "Source";

  return (
    <View style={styles.editorWrap}>
      <View style={styles.editorHeader}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Pressable onPress={() => setShowMenu((v) => !v)} hitSlop={10}>
          <Text style={styles.menuDots}>⋯</Text>
        </Pressable>
      </View>

      {showMenu ? (
        <View style={styles.menu}>
          <Pressable style={styles.menuItem} onPress={copyMarkdown}>
            <Text style={styles.menuItemText}>Copy Markdown</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={remove}>
            <Text style={[styles.menuItemText, { color: colors.accentRed }]}>Delete episode</Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.editorContent} keyboardShouldPersistTaps="handled">
        <View style={styles.episodeTop}>
          <Artwork url={meta?.coverUrl} size={64} />
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.titleField}
              value={title}
              onChangeText={setTitle}
              onBlur={() => savePodcastEpisode(episode.id, { title })}
              placeholder="Episode title"
              placeholderTextColor={colors.textTertiary}
              multiline
            />
            <TextInput
              style={styles.showField}
              value={show}
              onChangeText={setShow}
              onBlur={() => persistMeta(show)}
              placeholder="Podcast name"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        </View>

        {meta?.sourceUrl ? (
          <Pressable onPress={() => Linking.openURL(meta.sourceUrl)} style={styles.sourceLink}>
            <Text style={styles.sourceLinkText}>{`Open in ${label} ↗`}</Text>
          </Pressable>
        ) : null}

        <Text style={styles.fieldLabel}>Tags</Text>
        <TextInput
          style={styles.field}
          value={tags}
          onChangeText={setTags}
          onBlur={() => savePodcastEpisode(episode.id, { tags: parseTags(tags) })}
          placeholder="add tags, comma separated"
          placeholderTextColor={colors.textTertiary}
        />

        <View style={[styles.notesHeaderRow, { marginTop: 22 }]}>
          <Text style={[styles.fieldLabel, { marginTop: 0 }]}>Notes</Text>
          {spotifyReady ? (
            <Pressable style={styles.timestampBtn} onPress={insertLiveTimestamp} disabled={insertingTimestamp} hitSlop={8}>
              <Text style={styles.timestampBtnText}>{insertingTimestamp ? "…" : "+ Insert timestamp"}</Text>
            </Pressable>
          ) : null}
        </View>
        <TextInput
          style={styles.noteArea}
          value={body}
          onChangeText={setBody}
          onBlur={() => savePodcastEpisode(episode.id, { body })}
          onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
          placeholder="Type your notes while you listen…"
          placeholderTextColor={colors.textTertiary}
          multiline
          textAlignVertical="top"
        />
      </ScrollView>
    </View>
  );
}

// ── episode card ─────────────────────────────────────────────────────────────────

function EpisodeCard({ episode, onPress }: { episode: LibraryNote; onPress: () => void }) {
  const meta = episode.metadata;
  const tags = displayTags(episode.tags);
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Artwork url={meta?.coverUrl} size={56} />
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {episode.rawTitle ?? episode.label}
        </Text>
        {meta?.show ? <Text style={styles.cardShow}>{meta.show}</Text> : null}
        {tags.length ? <Text style={styles.cardTags}>{tags.map((t) => `#${t}`).join("  ")}</Text> : null}
      </View>
      <Text style={styles.cardChevron}>›</Text>
    </Pressable>
  );
}

// ── screen ───────────────────────────────────────────────────────────────────────

export default function PodcastNotesScreen({ onClose }: { onClose: () => void }) {
  const { notes } = useAppState();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [search, setSearch] = useState("");

  const episodes = useMemo(() => notes.filter((n) => n.category === "Podcasts"), [notes]);
  const active = activeId ? episodes.find((e) => e.id === activeId) ?? null : null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return episodes;
    return episodes.filter(
      (e) =>
        (e.rawTitle ?? e.label).toLowerCase().includes(q) ||
        (e.metadata?.show ?? "").toLowerCase().includes(q) ||
        e.body.toLowerCase().includes(q) ||
        displayTags(e.tags).some((t) => t.toLowerCase().includes(q)),
    );
  }, [episodes, search]);

  if (active) {
    return (
      <View style={styles.root}>
        <EpisodeEditor episode={active} onBack={() => setActiveId(null)} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.sheetHandle} />
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>Podcast Notes</Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={styles.sheetClose}>✕</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
        <View style={styles.heroRow}>
          <Text style={styles.hero}>listening log</Text>
          <Text style={styles.heroCount}>/{episodes.length}</Text>
        </View>

        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search titles, shows, notes…"
          placeholderTextColor={colors.textTertiary}
        />

        <Pressable style={styles.importBtn} onPress={() => setShowImport(true)}>
          <Text style={styles.importBtnText}>+ Import episode</Text>
        </Pressable>

        {filtered.length === 0 ? (
          <Text style={styles.empty}>
            {episodes.length === 0
              ? "No episodes yet. Import a Spotify or YouTube link to start a note."
              : "No episodes match your search."}
          </Text>
        ) : (
          <View style={{ marginTop: 6 }}>
            {filtered.map((ep) => (
              <EpisodeCard key={ep.id} episode={ep} onPress={() => setActiveId(ep.id)} />
            ))}
          </View>
        )}
      </ScrollView>

      {showImport ? (
        <ImportModal
          onClose={() => setShowImport(false)}
          onCreated={(id) => {
            setShowImport(false);
            setActiveId(id);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  sheetWrap: { flex: 1, backgroundColor: colors.background, paddingTop: 12 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginTop: 12, marginBottom: 16 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: { fontFamily: fonts.sansMedium, fontSize: 18, color: colors.textPrimary },
  sheetClose: { fontFamily: fonts.sans, fontSize: 16, color: colors.textTertiary },
  sheetScroll: { flex: 1 },
  sheetContent: { paddingHorizontal: 20, paddingBottom: 80 },

  heroRow: { flexDirection: "row", alignItems: "baseline", gap: 10, marginTop: 18 },
  hero: { fontFamily: fonts.serifRegular, fontSize: 34, color: colors.textPrimary, letterSpacing: -0.5 },
  heroCount: { fontFamily: fonts.serifRegular, fontSize: 20, color: colors.textTertiary },

  search: {
    marginTop: 16,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 11,
    backgroundColor: colors.surface,
  },
  importBtn: { alignSelf: "flex-start", marginTop: 14, paddingVertical: 9, paddingHorizontal: 15, borderRadius: 999, backgroundColor: colors.surfaceDark },
  importBtnText: { fontFamily: fonts.sansMedium, fontSize: 13, color: "#fff" },

  empty: { fontFamily: fonts.sans, fontSize: 14, color: colors.textFaint, fontStyle: "italic", marginTop: 26, lineHeight: 20 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cardTitle: { fontFamily: fonts.sansMedium, fontSize: 14.5, lineHeight: 19, color: colors.textPrimary },
  cardShow: { fontFamily: fonts.sans, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  cardTags: { fontFamily: fonts.mono, fontSize: 10, color: colors.textTertiary, marginTop: 4 },
  cardChevron: { fontSize: 20, color: colors.chevron },

  artFallback: { backgroundColor: colors.chipBg, alignItems: "center", justifyContent: "center" },
  artFallbackText: { color: colors.textTertiary, fontFamily: fonts.serif },

  // import + shared fields
  urlRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  field: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  pasteBtn: { paddingVertical: 11, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  pasteBtnText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.textPrimary },
  primaryBtn: { marginTop: 10, backgroundColor: colors.surfaceDark, borderRadius: 11, paddingVertical: 13, alignItems: "center" },
  primaryBtnText: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: "#fff" },
  secondaryBtn: { marginTop: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingVertical: 12, alignItems: "center" },
  secondaryBtnText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.textPrimary },
  timestampBtn: { paddingVertical: 2, paddingHorizontal: 4 },
  timestampBtnText: { fontFamily: fonts.monoMedium, fontSize: 10.5, letterSpacing: 0.5, textTransform: "uppercase", color: colors.textSecondary },
  notesHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  btnDisabled: { opacity: 0.4 },
  statusText: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.textSecondary, marginTop: 10 },
  fieldLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    color: colors.textSecondary,
    marginTop: 18,
    marginBottom: 7,
  },

  // editor
  editorWrap: { flex: 1, backgroundColor: colors.background, paddingTop: 12 },
  editorHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
  backText: { fontFamily: fonts.sansMedium, fontSize: 16, color: colors.textSecondary },
  menuDots: { fontFamily: fonts.sans, fontSize: 20, color: colors.textPrimary },
  menu: {
    position: "absolute",
    top: 44,
    right: 20,
    zIndex: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
    width: 180,
    ...(Platform.OS === "web" ? { boxShadow: "0 10px 30px rgba(0,0,0,0.12)" } : { elevation: 8 }),
  },
  menuItem: { paddingVertical: 11, paddingHorizontal: 14 },
  menuItemText: { fontFamily: fonts.sans, fontSize: 14, color: colors.textPrimary },
  editorContent: { paddingHorizontal: 20, paddingBottom: 120 },
  episodeTop: { flexDirection: "row", gap: 12, alignItems: "flex-start", marginTop: 4 },
  titleField: { fontFamily: fonts.sansMedium, fontSize: 19, color: colors.textPrimary, padding: 0, lineHeight: 24 },
  showField: { fontFamily: fonts.sans, fontSize: 13, color: colors.textSecondary, padding: 0, marginTop: 6 },
  sourceLink: { marginTop: 14 },
  sourceLinkText: { fontFamily: fonts.monoMedium, fontSize: 12, color: colors.accentRed },
  noteArea: {
    minHeight: 320,
    fontFamily: fonts.serifRegular,
    fontSize: 16,
    lineHeight: 26,
    color: colors.textPrimary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    marginTop: 4,
  },
});
