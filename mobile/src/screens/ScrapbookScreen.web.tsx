import React, { useEffect, useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useAppState } from "../state/AppState";
import type { ScrapItem } from "../types";

const ARIAL = "Arial";
const BLUE = "#2323e8";

const FILTERS = ["Photos", "Quotes", "Journal"] as const;
const FILTER_TYPE: Record<(typeof FILTERS)[number], ScrapItem["type"]> = {
  Photos: "img",
  Quotes: "quote",
  Journal: "note",
};

// Positions the 3rd scatter column (x=-20) flush with the left edge on load,
// so panning starts from a view that actually shows content instead of the
// gap between columns.
const CANVAS_ORIGIN = { tx: 20, ty: 20, scale: 1 };
const CARD_W = 112;
const MIN_SCALE = 0.1;
const MAX_SCALE = 8;

function itemHeight(item: ScrapItem): number {
  if (item.h && item.w) return Math.round(CARD_W * (item.h / item.w));
  if (item.type === "img") return 150;
  if (item.type === "quote") return 110;
  return 90;
}

// Loose 4-column scatter so the canvas reads as a wall you pan around, not a
// scrolling list — columns extend left/right past the viewport.
function buildCanvasLayout(items: ScrapItem[]) {
  const colX = [-320, -170, -20, 130];
  const colY = [0, 0, 0, 0];
  const gap = 22;
  return items.map((it, i) => {
    const c = i % 4;
    const h = itemHeight(it);
    const x = colX[c];
    const y = colY[c];
    colY[c] += h + 40 + gap;
    return { item: it, x, y, h };
  });
}

function CanvasCard({ item, h }: { item: ScrapItem; h: number }) {
  if (item.type === "img") {
    return (
      <View style={{ width: CARD_W }}>
        {item.url ? (
          <Image source={{ uri: item.url }} style={{ width: CARD_W, height: h }} resizeMode="cover" accessibilityLabel={item.label} />
        ) : (
          <View style={[styles.imgPlaceholder, { width: CARD_W, height: h }]}>
            <Text style={styles.imgPlaceholderText}>{item.label}</Text>
          </View>
        )}
        <Text style={styles.cardTitle}>{item.label}</Text>
      </View>
    );
  }
  if (item.type === "quote") {
    return (
      <View style={{ width: CARD_W }}>
        <View style={[styles.quoteBox, { minHeight: h }]}>
          <Text style={styles.quoteText}>{`"${item.text}"`}</Text>
        </View>
        <Text style={styles.cardTitle}>{item.source}</Text>
      </View>
    );
  }
  return (
    <View style={{ width: CARD_W }}>
      <View style={[styles.noteBox, { minHeight: h }]}>
        <Text style={styles.noteText}>{item.text}</Text>
      </View>
    </View>
  );
}

export default function ScrapbookScreen() {
  const { scrapItems } = useAppState();
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [cam, setCam] = useState(CANVAS_ORIGIN);
  const canvasRef = useRef<View & { getBoundingClientRect?: () => DOMRect }>(null);
  // All active touches/pointers, so a second finger upgrades a pan to a pinch.
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<
    | { kind: "pan"; x: number; y: number; tx: number; ty: number; id: number }
    | { kind: "pinch"; dist: number; midX: number; midY: number; tx: number; ty: number; scale: number }
    | null
  >(null);

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
      ? scrapItems
      : scrapItems.filter((it) => [...activeFilters].some((f) => FILTER_TYPE[f as (typeof FILTERS)[number]] === it.type));

  const layout = buildCanvasLayout(visibleItems);

  function canvasRect(): DOMRect | null {
    // This screen only ever runs via react-native-web, where a View ref is
    // the underlying DOM element.
    const el = canvasRef.current as unknown as HTMLElement | null;
    return el?.getBoundingClientRect ? el.getBoundingClientRect() : null;
  }

  function firstTwoPointers(): { a: { x: number; y: number }; b: { x: number; y: number } } | null {
    const pts = [...pointersRef.current.values()];
    return pts.length >= 2 ? { a: pts[0], b: pts[1] } : null;
  }

  function startPinch() {
    const two = firstTwoPointers();
    const rect = canvasRect();
    if (!two || !rect) return;
    const dist = Math.hypot(two.b.x - two.a.x, two.b.y - two.a.y);
    gestureRef.current = {
      kind: "pinch",
      dist: Math.max(dist, 1),
      midX: (two.a.x + two.b.x) / 2 - rect.left,
      midY: (two.a.y + two.b.y) / 2 - rect.top,
      tx: cam.tx,
      ty: cam.ty,
      scale: cam.scale,
    };
  }

  function onCanvasDown(e: { nativeEvent: PointerEvent }) {
    const ne = e.nativeEvent;
    pointersRef.current.set(ne.pointerId, { x: ne.clientX, y: ne.clientY });
    if (pointersRef.current.size >= 2) {
      startPinch();
    } else {
      gestureRef.current = { kind: "pan", x: ne.clientX, y: ne.clientY, tx: cam.tx, ty: cam.ty, id: ne.pointerId };
    }
    try {
      (ne.target as Element).setPointerCapture(ne.pointerId);
    } catch {
      // ignore — pointer capture isn't critical to correctness
    }
  }

  function onCanvasMove(e: { nativeEvent: PointerEvent }) {
    const ne = e.nativeEvent;
    if (!pointersRef.current.has(ne.pointerId)) return;
    pointersRef.current.set(ne.pointerId, { x: ne.clientX, y: ne.clientY });
    const g = gestureRef.current;
    if (!g) return;

    if (g.kind === "pinch") {
      const two = firstTwoPointers();
      const rect = canvasRect();
      if (!two || !rect) return;
      const dist = Math.max(Math.hypot(two.b.x - two.a.x, two.b.y - two.a.y), 1);
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, g.scale * (dist / g.dist)));
      const ratio = nextScale / g.scale;
      const midX = (two.a.x + two.b.x) / 2 - rect.left;
      const midY = (two.a.y + two.b.y) / 2 - rect.top;
      // Zoom around the starting midpoint, then follow the fingers' drift so
      // two-finger panning works during the pinch too.
      setCam({
        scale: nextScale,
        tx: midX - (g.midX - g.tx) * ratio,
        ty: midY - (g.midY - g.ty) * ratio,
      });
    } else if (g.id === ne.pointerId) {
      setCam((c) => ({ ...c, tx: g.tx + (ne.clientX - g.x), ty: g.ty + (ne.clientY - g.y) }));
    }
  }

  function onCanvasUp(e: { nativeEvent: PointerEvent }) {
    const ne = e.nativeEvent;
    pointersRef.current.delete(ne.pointerId);
    try {
      (ne.target as Element).releasePointerCapture(ne.pointerId);
    } catch {
      // ignore
    }
    if (pointersRef.current.size >= 2) {
      startPinch();
    } else if (pointersRef.current.size === 1) {
      const [id, p] = [...pointersRef.current.entries()][0];
      gestureRef.current = { kind: "pan", x: p.x, y: p.y, tx: cam.tx, ty: cam.ty, id };
    } else {
      gestureRef.current = null;
    }
  }

  function zoomAt(factor: number, px: number, py: number) {
    setCam((c) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, c.scale * factor));
      if (next === c.scale) return c;
      const ratio = next / c.scale;
      return { scale: next, tx: px - (px - c.tx) * ratio, ty: py - (py - c.ty) * ratio };
    });
  }

  function zoomBy(factor: number) {
    const rect = canvasRect();
    zoomAt(factor, rect ? rect.width / 2 : 0, rect ? rect.height / 2 : 0);
  }

  function recenter() {
    setCam(CANVAS_ORIGIN);
  }

  // Wheel/trackpad zoom for when the PWA runs on a desktop browser. Must be a
  // native non-passive listener so preventDefault() actually stops the
  // browser's own page-zoom on trackpad pinches (delivered as ctrl+wheel).
  useEffect(() => {
    const el = canvasRef.current as unknown as HTMLElement | null;
    if (!el || !el.addEventListener) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0018));
      zoomAt(factor, e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <View style={styles.wrap}>
      <View style={styles.topBar}>
        <Text style={styles.h1}>SCRAPBOOK</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable key={f} onPress={() => toggleFilter(f)} style={[styles.filterChip, activeFilters.has(f) && styles.filterChipActive]}>
            <Text style={[styles.filterChipText, activeFilters.has(f) && styles.filterChipTextActive]}>{f}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View
        ref={canvasRef}
        style={[
          styles.canvas,
          // RN's ViewStyle type doesn't know these CSS properties, but this app
          // only ever runs via react-native-web: without them, dragging to pan
          // the canvas also drag-selects the item text underneath the cursor.
          { touchAction: "none", userSelect: "none" } as object,
        ]}
        {...({
          onPointerDown: onCanvasDown,
          onPointerMove: onCanvasMove,
          onPointerUp: onCanvasUp,
          onPointerCancel: onCanvasUp,
        } as object)}
      >
        <View
          style={[
            styles.canvasLayer,
            // A CSS string transform (react-native-web passes it through) so
            // scale can share one origin-0 transform with the pan translate.
            { transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.scale})`, transformOrigin: "0 0" } as object,
          ]}
        >
          {layout.map(({ item, x, y, h }) => (
            <View key={item.id} style={{ position: "absolute", left: x, top: y }}>
              <CanvasCard item={item} h={h} />
            </View>
          ))}
        </View>

        {visibleItems.length === 0 && (
          <View style={styles.emptyWrap} pointerEvents="none">
            <Text style={styles.emptyText}>
              {scrapItems.length === 0 ? "Your scrapbook is empty." : "No items match this filter."}
            </Text>
          </View>
        )}

        <View style={styles.controls}>
          <Pressable onPress={() => zoomBy(1.3)} style={styles.zoomBtn} hitSlop={6}>
            <Text style={styles.zoomBtnText}>+</Text>
          </Pressable>
          <Pressable onPress={recenter} style={styles.recenterBtn} hitSlop={6}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx={12} cy={12} r={3} />
              <Path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </Svg>
          </Pressable>
          <Pressable onPress={() => zoomBy(1 / 1.3)} style={styles.zoomBtn} hitSlop={6}>
            <Text style={styles.zoomBtnText}>−</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#ffffff" },
  topBar: { paddingTop: 52, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#e2e2e2" },
  h1: { fontFamily: ARIAL, fontWeight: "700", fontSize: 15, letterSpacing: 0.5, color: BLUE, textAlign: "center" },

  filterScroll: { flexGrow: 0, flexShrink: 0, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  filterRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
  filterChip: { borderWidth: 1, borderColor: BLUE, paddingVertical: 5, paddingHorizontal: 8 },
  filterChipActive: { backgroundColor: BLUE },
  filterChipText: { fontFamily: ARIAL, fontSize: 10.5, color: BLUE },
  filterChipTextActive: { color: "#fff" },

  canvas: { flex: 1, position: "relative", overflow: "hidden", backgroundColor: "#fff" },
  canvasLayer: { position: "absolute", left: 0, top: 0, width: 1, height: 1 },

  emptyWrap: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" },
  emptyText: { fontFamily: ARIAL, fontSize: 13, color: "#8a8783" },

  controls: { position: "absolute", right: 14, bottom: 18, alignItems: "center", gap: 8 },
  zoomBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: BLUE,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomBtnText: { fontFamily: ARIAL, fontSize: 17, color: BLUE, lineHeight: 20 },
  recenterBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },

  imgPlaceholder: { backgroundColor: "#ede8e2", alignItems: "center", justifyContent: "center" },
  imgPlaceholderText: { fontFamily: ARIAL, fontSize: 10, color: "#8a8783", textAlign: "center", paddingHorizontal: 6 },
  cardTitle: { fontFamily: ARIAL, fontWeight: "700", fontSize: 10.5, color: BLUE, marginTop: 6 },
  quoteBox: { backgroundColor: "#f7f4ef", padding: 10 },
  quoteText: { fontFamily: ARIAL, fontStyle: "italic", fontSize: 11, lineHeight: 15, color: "#222" },
  noteBox: { backgroundColor: "#fff8d6", padding: 10 },
  noteText: { fontFamily: ARIAL, fontSize: 11, lineHeight: 15, color: "#222" },
});
