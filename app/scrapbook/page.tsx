"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/components/AuthProvider";
import type { ScrapItemRow } from "@/app/api/scrapbook/route";

const ARIAL = "Arial, Helvetica, sans-serif";
const BLUE = "#2323e8";

const FILTERS = ["Photos", "Quotes", "Journal"] as const;
const FILTER_TYPE: Record<(typeof FILTERS)[number], ScrapItemRow["type"]> = {
  Photos: "img",
  Quotes: "quote",
  Journal: "note",
};

// ── canvas cards + scattered layout ──────────────────────────────────────────

// The collection lives on an infinite pan/zoom canvas (Figma-style) instead
// of a scrolling grid. Cards share one fixed width but keep a hint of their
// own aspect ratio, and columns are staggered/jittered so the wall reads as
// a loose scatter rather than rigid rows.
const CANVAS_CARD_W = 130;
const SCATTER_COLS = 5;
const SCATTER_COL_SPACING = 180;
const MIN_SCALE = 0.05;
const MAX_SCALE = 10;
// Fixed per-column head starts so the top edge is uneven from the first row.
const SCATTER_STAGGER = [0, 52, 22, 68, 34];

function hashNum(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  return h;
}

function imgHeight(item: ScrapItemRow): number {
  const aspect = item.w && item.h ? item.h / item.w : 1;
  return Math.round(Math.min(175, Math.max(90, CANVAS_CARD_W * aspect)));
}

/** Full card footprint (image + caption, or fixed text card) — the layout
 *  stacks columns with this, so it must match what ItemCard renders. */
function itemCardHeight(item: ScrapItemRow): number {
  if (item.type === "img") return imgHeight(item) + 22;
  return 112;
}

function buildScatterLayout(items: ScrapItemRow[]): { item: ScrapItemRow; x: number; y: number }[] {
  const ys = [...SCATTER_STAGGER];
  return items.map((item, i) => {
    const c = i % SCATTER_COLS;
    const x = c * SCATTER_COL_SPACING + ((hashNum(item.id) % 28) - 14);
    const y = ys[c];
    ys[c] += itemCardHeight(item) + 30 + (hashNum(item.id + "v") % 26);
    return { item, x, y };
  });
}

function ItemCard({ item, onClick }: { item: ScrapItemRow; onClick: () => void }) {
  if (item.type === "img") {
    const h = imgHeight(item);
    return (
      <div onClick={onClick} style={{ cursor: "pointer", width: CANVAS_CARD_W }}>
        {item.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt={item.label ?? ""} draggable={false} style={{ display: "block", width: "100%", height: h, objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: h, background: "#ede8e2", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: ARIAL, fontSize: 10, color: "#8a8783", padding: "0 8px", textAlign: "center" }}>{item.label}</span>
          </div>
        )}
        <p style={{ fontFamily: ARIAL, fontWeight: 700, fontSize: 10.5, lineHeight: 1.3, color: BLUE, margin: "6px 0 0" }}>{item.label}</p>
      </div>
    );
  }

  if (item.type === "quote") {
    return (
      <div onClick={onClick} style={{ cursor: "pointer", width: CANVAS_CARD_W, height: 112, background: "#f7f4ef", padding: 10, display: "flex", flexDirection: "column", justifyContent: "center", overflow: "hidden" }}>
        <p style={{ fontFamily: ARIAL, fontStyle: "italic", fontSize: 10.5, lineHeight: 1.4, color: "#222", margin: 0 }}>&ldquo;{item.text}&rdquo;</p>
        {item.source && (
          <p style={{ fontFamily: ARIAL, fontWeight: 700, fontSize: 9.5, color: BLUE, margin: "6px 0 0" }}>{item.source}</p>
        )}
      </div>
    );
  }

  return (
    <div onClick={onClick} style={{ cursor: "pointer", width: CANVAS_CARD_W, height: 112, background: "#fff8d6", padding: 10, display: "flex", alignItems: "center", overflow: "hidden" }}>
      <p style={{ fontFamily: ARIAL, fontSize: 10.5, lineHeight: 1.4, color: "#222", margin: 0 }}>{item.text}</p>
    </div>
  );
}

// ── image upload (drag-drop, paste, or file picker) ──────────────────────────

async function uploadImageFile(file: File, authHeaders: (extra?: Record<string, string>) => Record<string, string>): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/scrapbook/upload", { method: "POST", headers: authHeaders(), body: form });
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error || "Upload failed.");
  return data.url;
}

function ImageDropzone({
  url,
  onUploaded,
  onClear,
  authHeaders,
}: {
  url: string;
  onUploaded: (url: string) => void;
  onClear: () => void;
  authHeaders: (extra?: Record<string, string>) => Record<string, string>;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const uploadedUrl = await uploadImageFile(file, authHeaders);
      onUploaded(uploadedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  if (url) {
    return (
      <div style={{ position: "relative", marginBottom: 8 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" style={{ display: "block", width: "100%", height: 160, objectFit: "cover" }} />
        <span
          onClick={onClear}
          style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.55)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ARIAL, fontSize: 13, cursor: "pointer" }}
        >
          ×
        </span>
      </div>
    );
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handleFile(e.dataTransfer.files?.[0]);
        }}
        onPaste={(e) => {
          const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
          const file = item?.getAsFile();
          if (file) void handleFile(file);
        }}
        tabIndex={0}
        style={{
          border: `1px dashed ${dragOver ? BLUE : "#d0d0d0"}`,
          background: dragOver ? "#f0f0ff" : "#fafafa",
          padding: "22px 12px",
          textAlign: "center",
          cursor: "pointer",
          marginBottom: 8,
        }}
      >
        <p style={{ fontFamily: ARIAL, fontSize: 12, color: "#8a8783", margin: 0 }}>
          {uploading ? "Uploading…" : "Drag an image here, paste, or click to choose a file"}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={(e) => void handleFile(e.target.files?.[0])}
          style={{ display: "none" }}
        />
      </div>
      {error && <p style={{ fontFamily: ARIAL, fontSize: 11.5, color: "#b23a2e", margin: "0 0 8px" }}>{error}</p>}
    </div>
  );
}

// ── add-item modal ───────────────────────────────────────────────────────────

type NewItemType = "img" | "quote" | "note";
function AddItemModal({
  onClose,
  onAdd,
  authHeaders,
}: {
  onClose: () => void;
  onAdd: (item: Omit<ScrapItemRow, "id">) => void;
  authHeaders: (extra?: Record<string, string>) => Record<string, string>;
}) {
  const [type, setType] = useState<NewItemType>("note");
  const [text, setText] = useState("");
  const [source, setSource] = useState("");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((type === "note" || type === "quote") && !text.trim()) return;
    if (type === "img" && !label.trim() && !url.trim()) return;

    const base = { x: 0, y: 0, w: 200, type } as const;
    if (type === "note") onAdd({ ...base, type: "note", text: text.trim() });
    else if (type === "quote") onAdd({ ...base, type: "quote", text: text.trim(), source: source.trim() || undefined });
    else onAdd({ ...base, type: "img", label: label.trim() || "Image", url: url.trim() || undefined });
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", background: "rgba(0,0,0,0.25)", padding: 16, paddingTop: 96 }} onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} style={{ width: "100%", maxWidth: 420, background: "#fff", padding: 24, fontFamily: ARIAL }}>
        <h2 style={{ fontFamily: ARIAL, fontWeight: 700, fontSize: 15, color: "#222", margin: "0 0 16px" }}>Add to scrapbook</h2>

        <div style={{ display: "flex", border: "1px solid #e2e2e2", marginBottom: 16 }}>
          {(["note", "quote", "img"] as NewItemType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              style={{ flex: 1, padding: "7px 0", fontFamily: ARIAL, fontSize: 12, fontWeight: 500, textTransform: "capitalize", border: "none", cursor: "pointer", background: type === t ? BLUE : "transparent", color: type === t ? "#fff" : "#222" }}
            >
              {t === "img" ? "Image" : t === "quote" ? "Quote" : "Note"}
            </button>
          ))}
        </div>

        {(type === "note" || type === "quote") && (
          <textarea
            autoFocus
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={type === "quote" ? "Quote text…" : "Note text…"}
            style={{ width: "100%", resize: "none", border: "1px solid #e2e2e2", padding: "8px 10px", fontFamily: ARIAL, fontSize: 13, color: "#222", outline: "none" }}
          />
        )}

        {type === "quote" && (
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Source (optional)"
            style={{ marginTop: 8, width: "100%", border: "1px solid #e2e2e2", padding: "8px 10px", fontFamily: ARIAL, fontSize: 13, color: "#222", outline: "none" }}
          />
        )}

        {type === "img" && (
          <>
            <ImageDropzone url={url} onUploaded={setUrl} onClear={() => setUrl("")} authHeaders={authHeaders} />
            {showUrlInput || url ? (
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Or paste an image URL"
                style={{ width: "100%", border: "1px solid #e2e2e2", padding: "8px 10px", fontFamily: ARIAL, fontSize: 13, color: "#222", outline: "none", marginBottom: 8 }}
              />
            ) : (
              <span onClick={() => setShowUrlInput(true)} style={{ display: "inline-block", fontFamily: ARIAL, fontSize: 11.5, color: "#8a8783", textDecoration: "underline", cursor: "pointer", marginBottom: 8 }}>
                Or paste an image URL instead
              </span>
            )}
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label / caption"
              style={{ width: "100%", border: "1px solid #e2e2e2", padding: "8px 10px", fontFamily: ARIAL, fontSize: 13, color: "#222", outline: "none" }}
            />
          </>
        )}

        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose} style={{ padding: "8px 12px", fontFamily: ARIAL, fontSize: 13, color: "#8a8783", background: "none", border: "none", cursor: "pointer" }}>
            Cancel
          </button>
          <button type="submit" style={{ padding: "8px 16px", fontFamily: ARIAL, fontWeight: 700, fontSize: 13, color: "#fff", background: BLUE, border: "none", cursor: "pointer" }}>
            Add
          </button>
        </div>
      </form>
    </div>
  );
}

// ── edit modal ────────────────────────────────────────────────────────────────

function EditItemModal({
  item,
  onClose,
  onSave,
  onDelete,
  authHeaders,
}: {
  item: ScrapItemRow;
  onClose: () => void;
  onSave: (patch: Partial<ScrapItemRow>) => void;
  onDelete: () => void;
  authHeaders: (extra?: Record<string, string>) => Record<string, string>;
}) {
  const [text, setText] = useState(item.text ?? "");
  const [source, setSource] = useState(item.source ?? "");
  const [label, setLabel] = useState(item.label ?? "");
  const [url, setUrl] = useState(item.url ?? "");
  const [showUrlInput, setShowUrlInput] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (item.type === "note") onSave({ text: text.trim() });
    else if (item.type === "quote") onSave({ text: text.trim(), source: source.trim() || null });
    else onSave({ label: label.trim() || null, url: url.trim() || null });
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", background: "rgba(0,0,0,0.25)", padding: 16, paddingTop: 96 }} onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} style={{ width: "100%", maxWidth: 420, background: "#fff", padding: 24, fontFamily: ARIAL }}>
        <h2 style={{ fontFamily: ARIAL, fontWeight: 700, fontSize: 15, color: "#222", margin: "0 0 16px", textTransform: "capitalize" }}>Edit {item.type}</h2>

        {(item.type === "note" || item.type === "quote") && (
          <textarea
            autoFocus
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ width: "100%", resize: "none", border: "1px solid #e2e2e2", padding: "8px 10px", fontFamily: ARIAL, fontSize: 13, color: "#222", outline: "none" }}
          />
        )}

        {item.type === "quote" && (
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Source"
            style={{ marginTop: 8, width: "100%", border: "1px solid #e2e2e2", padding: "8px 10px", fontFamily: ARIAL, fontSize: 13, color: "#222", outline: "none" }}
          />
        )}

        {item.type === "img" && (
          <>
            <ImageDropzone url={url} onUploaded={setUrl} onClear={() => setUrl("")} authHeaders={authHeaders} />
            {showUrlInput || url ? (
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Or paste an image URL"
                style={{ width: "100%", border: "1px solid #e2e2e2", padding: "8px 10px", fontFamily: ARIAL, fontSize: 13, color: "#222", outline: "none", marginBottom: 8 }}
              />
            ) : (
              <span onClick={() => setShowUrlInput(true)} style={{ display: "inline-block", fontFamily: ARIAL, fontSize: 11.5, color: "#8a8783", textDecoration: "underline", cursor: "pointer", marginBottom: 8 }}>
                Or paste an image URL instead
              </span>
            )}
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label / caption"
              style={{ width: "100%", border: "1px solid #e2e2e2", padding: "8px 10px", fontFamily: ARIAL, fontSize: 13, color: "#222", outline: "none" }}
            />
          </>
        )}

        <div style={{ marginTop: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button type="button" onClick={() => { onDelete(); onClose(); }} style={{ padding: "8px 12px", fontFamily: ARIAL, fontSize: 13, color: "#b23a2e", background: "none", border: "none", cursor: "pointer" }}>
            Delete
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onClose} style={{ padding: "8px 12px", fontFamily: ARIAL, fontSize: 13, color: "#8a8783", background: "none", border: "none", cursor: "pointer" }}>
              Cancel
            </button>
            <button type="submit" style={{ padding: "8px 16px", fontFamily: ARIAL, fontWeight: 700, fontSize: 13, color: "#fff", background: BLUE, border: "none", cursor: "pointer" }}>
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function ScrapbookPage() {
  const { session } = useAuth();
  const token = session?.access_token;
  const authHeaders = useCallback(
    (extra?: Record<string, string>): Record<string, string> => ({
      ...extra,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token],
  );

  const [items, setItems] = useState<ScrapItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<ScrapItemRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/scrapbook", { headers: authHeaders() })
      .then((r) => r.json())
      .then((d: { items?: ScrapItemRow[] }) => {
        if (cancelled) return;
        setItems(d.items ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authHeaders]);

  const addItem = useCallback(
    async (body: Omit<ScrapItemRow, "id">) => {
      const res = await fetch("/api/scrapbook", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const { item } = (await res.json()) as { item: ScrapItemRow };
        setItems((prev) => [...prev, item]);
      } else {
        setItems((prev) => [...prev, { ...body, id: `local_${Date.now()}` }]);
      }
    },
    [authHeaders],
  );

  const saveItem = useCallback(
    async (id: string, patch: Partial<ScrapItemRow>) => {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
      await fetch(`/api/scrapbook/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(patch),
      }).catch(console.error);
    },
    [authHeaders],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      setItems((prev) => prev.filter((it) => it.id !== id));
      await fetch(`/api/scrapbook/${encodeURIComponent(id)}`, { method: "DELETE", headers: authHeaders() }).catch(console.error);
    },
    [authHeaders],
  );

  function toggleFilter(f: string) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  }

  const visibleItems =
    activeFilters.size === 0
      ? items
      : items.filter((it) => [...activeFilters].some((f) => FILTER_TYPE[f as (typeof FILTERS)[number]] === it.type));

  // ── infinite canvas: pan, zoom toward cursor, drag cards to rearrange ────

  const [cam, setCam] = useState({ tx: 40, ty: 24, scale: 1 });
  const dragRef = useRef<
    | { kind: "pan"; mx: number; my: number; tx: number; ty: number }
    | { kind: "item"; id: string; mx: number; my: number; startX: number; startY: number }
    | null
  >(null);
  const movedRef = useRef(0);
  const viewportRef = useRef<HTMLDivElement>(null);

  // A card keeps its stored x/y once the user has dragged it on THIS canvas.
  // "Placed here" is marked by a non-null `rot` (unused visually since the
  // grid redesign; drags save rot alongside x/y). Coordinates left over from
  // the retired freeform-canvas era all have rot null, so everything starts
  // in the clean auto-scatter instead of wherever it sat years of layouts ago.
  const slotById = new Map<string, { x: number; y: number }>();
  buildScatterLayout(visibleItems).forEach(({ item, x, y }) => slotById.set(item.id, { x, y }));
  const positioned = visibleItems.map((item) => {
    const placed = item.rot !== null && item.rot !== undefined;
    const pos = placed ? { x: item.x, y: item.y } : slotById.get(item.id)!;
    return { item, ...pos };
  });

  function onCanvasMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    dragRef.current = { kind: "pan", mx: e.clientX, my: e.clientY, tx: cam.tx, ty: cam.ty };
    movedRef.current = 0;
  }

  function onItemMouseDown(e: React.MouseEvent, item: ScrapItemRow, x: number, y: number) {
    if (e.button !== 0) return;
    e.stopPropagation();
    dragRef.current = { kind: "item", id: item.id, mx: e.clientX, my: e.clientY, startX: x, startY: y };
    movedRef.current = 0;
  }

  function onCanvasMouseMove(e: React.MouseEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.mx;
    const dy = e.clientY - d.my;
    movedRef.current = Math.max(movedRef.current, Math.abs(dx) + Math.abs(dy));
    if (d.kind === "pan") {
      setCam((c) => ({ ...c, tx: d.tx + dx, ty: d.ty + dy }));
    } else {
      // Setting rot here (not just on mouseup) flips the card to "placed"
      // immediately, so it tracks the pointer instead of snapping back to
      // its scatter slot until release.
      setItems((prev) =>
        prev.map((it) =>
          it.id === d.id
            ? { ...it, x: d.startX + dx / cam.scale, y: d.startY + dy / cam.scale, rot: it.rot ?? 0 }
            : it,
        ),
      );
    }
  }

  function onCanvasMouseUp() {
    const d = dragRef.current;
    dragRef.current = null;
    if (d?.kind === "item" && movedRef.current >= 5) {
      const it = items.find((i) => i.id === d.id);
      if (it) void saveItem(it.id, { x: Math.round(it.x), y: Math.round(it.y), rot: it.rot ?? 0 });
    }
  }

  const zoomAt = useCallback((factor: number, px: number, py: number) => {
    setCam((c) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, c.scale * factor));
      if (next === c.scale) return c;
      const ratio = next / c.scale;
      return { scale: next, tx: px - (px - c.tx) * ratio, ty: py - (py - c.ty) * ratio };
    });
  }, []);

  // Wheel zoom must be a NATIVE non-passive listener: React registers
  // onWheel passively, so preventDefault() there is ignored and a trackpad
  // pinch (delivered as ctrl+wheel) falls through to browser page-zoom —
  // zooming the whole page instead of the canvas.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      // Pinch deltas are much smaller than wheel ticks, so boost them.
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0018));
      zoomAt(factor, e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  function zoomBy(factor: number) {
    const rect = viewportRef.current?.getBoundingClientRect();
    zoomAt(factor, rect ? rect.width / 2 : 0, rect ? rect.height / 2 : 0);
  }

  function recenter() {
    setCam({ tx: 40, ty: 24, scale: 1 });
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#fff", fontFamily: ARIAL }}>
      <Sidebar />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "20px 60px 16px", borderBottom: "1px solid #e2e2e2" }}>
          <h1 style={{ fontFamily: ARIAL, fontWeight: 700, fontSize: 17, letterSpacing: "0.04em", color: BLUE, margin: 0 }}>
            SCRAPBOOK — THINGS I LOVE
          </h1>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </div>

        <div style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #e2e2e2" }}>
          <p style={{ fontFamily: ARIAL, fontSize: 12.5, color: "#222", margin: 0 }}>
            Collected · {items.length} item{items.length === 1 ? "" : "s"}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {FILTERS.map((f) => (
              <span
                key={f}
                onClick={() => toggleFilter(f)}
                style={{
                  fontFamily: ARIAL,
                  fontSize: 11.5,
                  color: activeFilters.has(f) ? "#fff" : BLUE,
                  background: activeFilters.has(f) ? BLUE : "transparent",
                  border: `1px solid ${BLUE}`,
                  padding: "5px 9px",
                  cursor: "pointer",
                }}
              >
                {f}
              </span>
            ))}
            <span onClick={() => setShowAdd(true)} style={{ fontFamily: ARIAL, fontWeight: 700, fontSize: 11.5, color: "#fff", background: BLUE, padding: "5px 11px", cursor: "pointer" }}>
              + Add
            </span>
          </div>
        </div>

        <div
          ref={viewportRef}
          onMouseDown={onCanvasMouseDown}
          onMouseMove={onCanvasMouseMove}
          onMouseUp={onCanvasMouseUp}
          onMouseLeave={onCanvasMouseUp}
          style={{ flex: 1, position: "relative", overflow: "hidden", cursor: "grab", userSelect: "none", touchAction: "none", background: "#fff" }}
        >
          {loading && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div className="animate-spin" style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #e2e2e2", borderTopColor: BLUE }} />
            </div>
          )}

          {!loading && visibleItems.length === 0 && (
            <p style={{ position: "absolute", inset: "60px 0 auto", fontFamily: ARIAL, fontSize: 13, color: "#8a8783", textAlign: "center", pointerEvents: "none" }}>
              {items.length === 0 ? "Your scrapbook is empty — click + Add to begin." : "No items match this filter."}
            </p>
          )}

          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.scale})`,
              transformOrigin: "0 0",
              willChange: "transform",
            }}
          >
            {positioned.map(({ item, x, y }) => (
              <div key={item.id} onMouseDown={(e) => onItemMouseDown(e, item, x, y)} style={{ position: "absolute", left: x, top: y }}>
                <ItemCard item={item} onClick={() => { if (movedRef.current < 5) setEditItem(item); }} />
              </div>
            ))}
          </div>

          <p style={{ position: "absolute", left: 14, bottom: 12, fontFamily: ARIAL, fontSize: 10.5, color: "#b0b0b0", margin: 0, pointerEvents: "none" }}>
            drag to pan · scroll to zoom · drag a card to move it
          </p>

          <div onMouseDown={(e) => e.stopPropagation()} style={{ position: "absolute", right: 14, bottom: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              type="button"
              onClick={() => zoomBy(1.3)}
              style={{ width: 34, height: 34, borderRadius: "50%", border: `1px solid ${BLUE}`, background: "#fff", color: BLUE, fontFamily: ARIAL, fontSize: 17, cursor: "pointer", lineHeight: 1 }}
            >
              +
            </button>
            <button
              type="button"
              onClick={recenter}
              title="Recenter"
              style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: BLUE, color: "#fff", fontFamily: ARIAL, fontSize: 13, cursor: "pointer", lineHeight: 1, boxShadow: "0 4px 12px rgba(35,35,232,.35)" }}
            >
              ◎
            </button>
            <button
              type="button"
              onClick={() => zoomBy(1 / 1.3)}
              style={{ width: 34, height: 34, borderRadius: "50%", border: `1px solid ${BLUE}`, background: "#fff", color: BLUE, fontFamily: ARIAL, fontSize: 17, cursor: "pointer", lineHeight: 1 }}
            >
              −
            </button>
          </div>
        </div>
      </div>

      {showAdd && <AddItemModal onClose={() => setShowAdd(false)} onAdd={addItem} authHeaders={authHeaders} />}
      {editItem && (
        <EditItemModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSave={(patch) => saveItem(editItem.id, patch)}
          onDelete={() => deleteItem(editItem.id)}
          authHeaders={authHeaders}
        />
      )}
    </div>
  );
}
