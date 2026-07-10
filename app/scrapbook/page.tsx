"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { NAV_ITEMS } from "@/lib/data";
import type { ScrapItemRow } from "@/app/api/scrapbook/route";

const ARIAL = "Arial, Helvetica, sans-serif";
const BLUE = "#2323e8";

const FILTERS = ["Photos", "Quotes", "Journal"] as const;
const FILTER_TYPE: Record<(typeof FILTERS)[number], ScrapItemRow["type"]> = {
  Photos: "img",
  Quotes: "quote",
  Journal: "note",
};

// ── sidebar (distinct sub-brand treatment — same real nav, restyled) ─────────

function ScrapbookSidebar() {
  const pathname = usePathname();
  return (
    <div style={{ width: 130, flex: "none", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12, borderRight: "1px solid #e2e2e2" }}>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{ fontFamily: ARIAL, fontSize: 12.5, lineHeight: 1.3, fontWeight: active ? 700 : 400, color: active ? BLUE : "#222" }}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

// ── item cards (full-width, masonry-flow) ────────────────────────────────────

function ItemCard({ item, onClick }: { item: ScrapItemRow; onClick: () => void }) {
  if (item.type === "img") {
    const aspect = item.w && item.h ? item.w / item.h : 1;
    return (
      <div onClick={onClick} style={{ cursor: "pointer" }}>
        {item.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt={item.label ?? ""} style={{ display: "block", width: "100%", aspectRatio: aspect, objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: 140, background: "#ede8e2", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: ARIAL, fontSize: 11, color: "#8a8783", padding: "0 10px", textAlign: "center" }}>{item.label}</span>
          </div>
        )}
        <p style={{ fontFamily: ARIAL, fontWeight: 700, fontSize: 11.5, lineHeight: 1.3, color: BLUE, margin: "7px 0 0" }}>{item.label}</p>
      </div>
    );
  }

  if (item.type === "quote") {
    return (
      <div onClick={onClick} style={{ cursor: "pointer", background: "#f7f4ef", padding: 14 }}>
        <p style={{ fontFamily: ARIAL, fontStyle: "italic", fontSize: 13, lineHeight: 1.5, color: "#222", margin: 0 }}>&ldquo;{item.text}&rdquo;</p>
        {item.source && (
          <p style={{ fontFamily: ARIAL, fontWeight: 700, fontSize: 11, color: BLUE, margin: "8px 0 0" }}>{item.source}</p>
        )}
      </div>
    );
  }

  return (
    <div onClick={onClick} style={{ cursor: "pointer", background: "#fff8d6", padding: 14 }}>
      <p style={{ fontFamily: ARIAL, fontSize: 13, lineHeight: 1.5, color: "#222", margin: 0 }}>{item.text}</p>
    </div>
  );
}

// ── add-item modal ───────────────────────────────────────────────────────────

type NewItemType = "img" | "quote" | "note";
function AddItemModal({ onClose, onAdd }: { onClose: () => void; onAdd: (item: Omit<ScrapItemRow, "id">) => void }) {
  const [type, setType] = useState<NewItemType>("note");
  const [text, setText] = useState("");
  const [source, setSource] = useState("");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

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
            <input
              autoFocus
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Image URL (optional)"
              style={{ width: "100%", border: "1px solid #e2e2e2", padding: "8px 10px", fontFamily: ARIAL, fontSize: 13, color: "#222", outline: "none" }}
            />
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label / caption"
              style={{ marginTop: 8, width: "100%", border: "1px solid #e2e2e2", padding: "8px 10px", fontFamily: ARIAL, fontSize: 13, color: "#222", outline: "none" }}
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

function EditItemModal({ item, onClose, onSave, onDelete }: { item: ScrapItemRow; onClose: () => void; onSave: (patch: Partial<ScrapItemRow>) => void; onDelete: () => void }) {
  const [text, setText] = useState(item.text ?? "");
  const [source, setSource] = useState(item.source ?? "");
  const [label, setLabel] = useState(item.label ?? "");
  const [url, setUrl] = useState(item.url ?? "");

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
            <input
              autoFocus
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Image URL"
              style={{ width: "100%", border: "1px solid #e2e2e2", padding: "8px 10px", fontFamily: ARIAL, fontSize: 13, color: "#222", outline: "none" }}
            />
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label / caption"
              style={{ marginTop: 8, width: "100%", border: "1px solid #e2e2e2", padding: "8px 10px", fontFamily: ARIAL, fontSize: 13, color: "#222", outline: "none" }}
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

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#fff", fontFamily: ARIAL }}>
      <ScrapbookSidebar />

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

        <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <div className="animate-spin" style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #e2e2e2", borderTopColor: BLUE }} />
            </div>
          ) : visibleItems.length === 0 ? (
            <p style={{ fontFamily: ARIAL, fontSize: 13, color: "#8a8783", textAlign: "center", marginTop: 60 }}>
              {items.length === 0 ? "Your scrapbook is empty — click + Add to begin." : "No items match this filter."}
            </p>
          ) : (
            <div style={{ columns: "3 140px", columnGap: 16 }}>
              {visibleItems.map((item) => (
                <div key={item.id} style={{ breakInside: "avoid", marginBottom: 20, width: "100%" }}>
                  <ItemCard item={item} onClick={() => setEditItem(item)} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAdd && <AddItemModal onClose={() => setShowAdd(false)} onAdd={addItem} />}
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
