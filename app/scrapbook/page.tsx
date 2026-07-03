"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import type { ScrapItemRow } from "@/app/api/scrapbook/route";

type DragState =
  | { kind: "pan"; startMx: number; startMy: number; startTx: number; startTy: number }
  | { kind: "item"; id: string; startMx: number; startMy: number; startX: number; startY: number };

const CANVAS_W = 1400;
const CANVAS_H = 1800;
const MIN_SCALE = 0.2;
const MAX_SCALE = 3;

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

// ── Item renderers ─────────────────────────────────────────────────────────

function ScrapImage({ item }: { item: ScrapItemRow & { type: "img" } }) {
  // Clean "sticker" cutout: the image fills the whole box (object-cover, so no
  // letterbox bars), clipped to soft rounded corners with a gentle drop shadow
  // to lift it off the canvas — no matte/frame around it.
  return (
    <div
      style={{
        width: item.w,
        height: item.h ?? item.w,
        boxShadow: "0 6px 18px rgba(0,0,0,0.20)",
      }}
      className="overflow-hidden rounded-2xl"
    >
      {item.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.url}
          alt={item.label ?? ""}
          className="block h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#ede8e2]">
          <span className="px-2 text-center font-mono text-[10px] text-neutral-500">{item.label}</span>
        </div>
      )}
    </div>
  );
}

function ScrapQuote({ item }: { item: ScrapItemRow & { type: "quote" } }) {
  return (
    <div style={{ width: item.w }} className="rounded-lg bg-[#f7f4ef] p-3">
      <p className="font-serif text-[17px] leading-snug text-neutral-800">
        &ldquo;{item.text}&rdquo;
      </p>
      {item.source && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-neutral-500">
          {item.source}
        </p>
      )}
    </div>
  );
}

function ScrapNote({ item }: { item: ScrapItemRow & { type: "note" } }) {
  return (
    <div style={{ width: item.w }} className="rounded-sm bg-[#fff8d6] p-3 shadow-sm">
      <p className="font-serif text-[15px] leading-snug text-neutral-800">{item.text}</p>
    </div>
  );
}

// ── Add-item modal ─────────────────────────────────────────────────────────

type NewItemType = "img" | "quote" | "note";
function AddItemModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (item: Omit<ScrapItemRow, "id">) => void;
}) {
  const [type, setType] = useState<NewItemType>("note");
  const [text, setText] = useState("");
  const [source, setSource] = useState("");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [w, setW] = useState(200);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === "note" && !text.trim()) return;
    if (type === "quote" && !text.trim()) return;
    if (type === "img" && !label.trim() && !url.trim()) return;

    const base = { x: 40, y: 40, w, type } as const;
    if (type === "note") onAdd({ ...base, type: "note", text: text.trim() });
    else if (type === "quote") onAdd({ ...base, type: "quote", text: text.trim(), source: source.trim() || undefined });
    else onAdd({ ...base, type: "img", label: label.trim() || "Image", url: url.trim() || undefined });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/25 p-4 pt-24"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl"
      >
        <h2 className="mb-4 text-base font-semibold text-foreground">Add to scrapbook</h2>

        <div className="mb-4 flex rounded-md border border-border p-0.5">
          {(["note", "quote", "img"] as NewItemType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 rounded py-1.5 text-xs font-medium capitalize transition-colors ${
                type === t ? "bg-neutral-800 text-white" : "text-muted hover:text-foreground"
              }`}
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
            className="w-full resize-none rounded-md border border-border px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-neutral-400"
          />
        )}

        {type === "quote" && (
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Source (optional)"
            className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-neutral-400"
          />
        )}

        {type === "img" && (
          <>
            <input
              autoFocus
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Image URL (optional)"
              className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-neutral-400"
            />
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label / caption"
              className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-neutral-400"
            />
          </>
        )}

        <label className="mt-3 flex items-center gap-2 text-sm text-muted">
          Width
          <input
            type="range"
            min={120}
            max={400}
            value={w}
            onChange={(e) => setW(Number(e.target.value))}
            className="flex-1 accent-neutral-700"
          />
          <span className="w-10 text-right text-xs">{w}px</span>
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-2 text-sm text-muted transition-colors hover:bg-hover hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
          >
            Add
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Edit modal ─────────────────────────────────────────────────────────────

function EditItemModal({
  item,
  onClose,
  onSave,
  onDelete,
}: {
  item: ScrapItemRow;
  onClose: () => void;
  onSave: (patch: Partial<ScrapItemRow>) => void;
  onDelete: () => void;
}) {
  const [text, setText] = useState(item.text ?? "");
  const [source, setSource] = useState(item.source ?? "");
  const [label, setLabel] = useState(item.label ?? "");
  const [url, setUrl] = useState(item.url ?? "");
  const [rot, setRot] = useState(item.rot ?? 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (item.type === "note") onSave({ text: text.trim() });
    else if (item.type === "quote") onSave({ text: text.trim(), source: source.trim() || null });
    else onSave({ label: label.trim() || null, url: url.trim() || null, rot: rot || null });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/25 p-4 pt-24"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl"
      >
        <h2 className="mb-4 text-base font-semibold text-foreground capitalize">Edit {item.type}</h2>

        {(item.type === "note" || item.type === "quote") && (
          <textarea
            autoFocus
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full resize-none rounded-md border border-border px-3 py-2 text-sm text-foreground outline-none focus:border-neutral-400"
          />
        )}

        {item.type === "quote" && (
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Source"
            className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm text-foreground outline-none focus:border-neutral-400"
          />
        )}

        {item.type === "img" && (
          <>
            <input
              autoFocus
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Image URL"
              className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground outline-none focus:border-neutral-400"
            />
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label / caption"
              className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm text-foreground outline-none focus:border-neutral-400"
            />
          </>
        )}

        <label className="mt-3 flex items-center gap-2 text-sm text-muted">
          Rotation
          <input
            type="range"
            min={-15}
            max={15}
            value={rot}
            onChange={(e) => setRot(Number(e.target.value))}
            className="flex-1 accent-neutral-700"
          />
          <span className="w-12 text-right text-xs">{rot}°</span>
        </label>

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => { onDelete(); onClose(); }}
            className="rounded-md px-3 py-2 text-sm text-accent transition-colors hover:bg-hover"
          >
            Delete
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-2 text-sm text-muted transition-colors hover:bg-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function ScrapbookPage() {
  const [items, setItems] = useState<ScrapItemRow[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);

  const [scale, setScale] = useState(0.85);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  const [drag, setDrag] = useState<DragState | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<ScrapItemRow | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);

  // ── Load items ─────────────────────────────────────────────────────────

  const reload = useCallback(() => {
    setLoading(true);
    fetch("/api/scrapbook")
      .then((r) => r.json())
      .then((d: { items?: ScrapItemRow[]; configured?: boolean }) => {
        setItems(d.items ?? []);
        setConfigured(d.configured ?? true);
      })
      .catch(() => {
        // Surface the seed-like fallback when Supabase isn't set up yet.
        setItems([
          { id: "s1", type: "img", x: 28, y: 28, w: 184, h: 138, label: "Add your first image →" },
          { id: "s2", type: "quote", x: 28, y: 182, w: 220, text: "You do not rise to the level of your goals. You fall to the level of your systems.", source: "James Clear" },
          { id: "s3", type: "note", x: 280, y: 40, w: 180, text: "Set up Supabase to save items permanently." },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // ── Mouse events for pan + item drag ───────────────────────────────────

  const handleViewportMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setDrag({
        kind: "pan",
        startMx: e.clientX,
        startMy: e.clientY,
        startTx: tx,
        startTy: ty,
      });
    },
    [tx, ty],
  );

  const handleItemMouseDown = useCallback(
    (e: React.MouseEvent, item: ScrapItemRow) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      setDrag({
        kind: "item",
        id: item.id,
        startMx: e.clientX,
        startMy: e.clientY,
        startX: item.x,
        startY: item.y,
      });
    },
    [],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.startMx;
      const dy = e.clientY - drag.startMy;
      if (drag.kind === "pan") {
        setTx(drag.startTx + dx);
        setTy(drag.startTy + dy);
      } else {
        setItems((prev) =>
          prev.map((it) =>
            it.id === drag.id
              ? { ...it, x: drag.startX + dx / scale, y: drag.startY + dy / scale }
              : it,
          ),
        );
      }
    },
    [drag, scale],
  );

  const handleMouseUp = useCallback(
    (_e: React.MouseEvent) => {
      if (drag?.kind === "item") {
        const item = items.find((i) => i.id === drag.id);
        if (item) {
          fetch(`/api/scrapbook/${encodeURIComponent(item.id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ x: Math.round(item.x), y: Math.round(item.y) }),
          }).catch(console.error);
        }
      }
      setDrag(null);
    },
    [drag, items],
  );

  // Zoom toward a point (in viewport coords) keeping that point stationary, so
  // the canvas grows/shrinks under the cursor instead of jumping to a corner.
  const zoomAt = useCallback((factor: number, px: number, py: number) => {
    setScale((prevScale) => {
      const next = clamp(prevScale * factor, MIN_SCALE, MAX_SCALE);
      if (next === prevScale) return prevScale;
      const ratio = next / prevScale;
      setTx((prevTx) => px - (px - prevTx) * ratio);
      setTy((prevTy) => py - (py - prevTy) * ratio);
      return next;
    });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Exponential factor => smooth, velocity-sensitive zoom (trackpad pinch and
    // wheel both feel natural); anchored at the cursor.
    const factor = Math.exp(-e.deltaY * 0.0018);
    zoomAt(factor, e.clientX - rect.left, e.clientY - rect.top);
  }, [zoomAt]);

  // ── CRUD helpers ───────────────────────────────────────────────────────

  const addItem = useCallback(
    async (body: Omit<ScrapItemRow, "id">) => {
      const res = await fetch("/api/scrapbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const { item } = await res.json() as { item: ScrapItemRow };
        setItems((prev) => [...prev, item]);
      } else {
        // Optimistic for offline / unconfigured mode.
        const id = `local_${Date.now()}`;
        setItems((prev) => [...prev, { ...body, id }]);
      }
    },
    [],
  );

  const saveItem = useCallback(
    async (id: string, patch: Partial<ScrapItemRow>) => {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
      await fetch(`/api/scrapbook/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }).catch(console.error);
    },
    [],
  );

  const deleteItem = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    await fetch(`/api/scrapbook/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(console.error);
  }, []);

  // +/- buttons zoom toward the centre of the viewport.
  const zoomBy = (factor: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    zoomAt(factor, rect ? rect.width / 2 : 0, rect ? rect.height / 2 : 0);
  };
  const fitView = () => { setScale(0.85); setTx(0); setTy(0); };

  const isDraggingItem = drag?.kind === "item";
  const isDraggingPan = drag?.kind === "pan";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border px-6 py-3">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Scrapbook</h1>
            <p className="text-[11px] uppercase tracking-wider text-muted">Things I love</p>
          </div>
          <div className="flex items-center gap-2">
            {!configured && (
              <span className="text-xs text-muted">
                Set up Supabase to save permanently.
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="rounded-md bg-neutral-800 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-700"
            >
              + Add
            </button>
            {/* Zoom controls */}
            <div className="flex items-center rounded-full border border-border px-1 py-1 gap-1">
              <button type="button" onClick={() => zoomBy(0.8)} className="flex h-6 w-6 items-center justify-center rounded-full text-sm text-foreground transition-colors hover:bg-hover">−</button>
              <button type="button" onClick={fitView} className="px-1.5 text-[9px] font-medium uppercase tracking-wide text-muted transition-colors hover:text-foreground">FIT</button>
              <button type="button" onClick={() => zoomBy(1.25)} className="flex h-6 w-6 items-center justify-center rounded-full text-sm text-foreground transition-colors hover:bg-hover">+</button>
            </div>
          </div>
        </div>

        {/* Canvas viewport */}
        <div
          ref={viewportRef}
          className="relative flex-1 overflow-hidden bg-[#f7f5f1]"
          style={{ cursor: isDraggingPan ? "grabbing" : isDraggingItem ? "move" : "grab" }}
          onMouseDown={handleViewportMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-neutral-400" />
            </div>
          )}

          {/* Infinite canvas */}
          <div
            style={{
              transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
              transformOrigin: "0 0",
              width: CANVAS_W,
              height: CANVAS_H,
              position: "relative",
              willChange: "transform",
            }}
          >
            {items.map((item) => (
              <div
                key={item.id}
                onMouseDown={(e) => handleItemMouseDown(e, item)}
                onDoubleClick={(e) => { e.stopPropagation(); setEditItem(item); }}
                style={{
                  position: "absolute",
                  left: item.x,
                  top: item.y,
                  transform: item.rot ? `rotate(${item.rot}deg)` : undefined,
                  cursor: "pointer",
                  userSelect: "none",
                }}
                title="Drag to move · Double-click to edit"
              >
                {item.type === "img" && <ScrapImage item={item as ScrapItemRow & { type: "img" }} />}
                {item.type === "quote" && <ScrapQuote item={item as ScrapItemRow & { type: "quote" }} />}
                {item.type === "note" && <ScrapNote item={item as ScrapItemRow & { type: "note" }} />}
              </div>
            ))}
          </div>

          {items.length === 0 && !loading && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-muted">Your scrapbook is empty — click + Add to begin.</p>
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <AddItemModal onClose={() => setShowAdd(false)} onAdd={addItem} />
      )}

      {editItem && (
        <EditItemModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSave={(patch) => saveItem(editItem.id, patch)}
          onDelete={() => deleteItem(editItem.id)}
        />
      )}
    </div>
  );
}
