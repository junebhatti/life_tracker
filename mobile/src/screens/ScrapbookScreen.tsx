import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { colors, fonts } from "../theme";
import { useAppState } from "../state/AppState";
import type { ScrapItem } from "../types";

const MIN_SCALE = 0.2;
const MAX_SCALE = 4;

function ScrapImage({ item }: { item: Extract<ScrapItem, { type: "img" }> }) {
  return (
    <View style={[styles.imgBox, { width: item.w, height: item.h ?? item.w }]}>
      <Text style={styles.imgLabel}>{item.label}</Text>
    </View>
  );
}

function ScrapQuote({ item }: { item: Extract<ScrapItem, { type: "quote" }> }) {
  return (
    <View style={[styles.quoteBox, { width: item.w }]}>
      <Text style={styles.quoteText}>{`"${item.text}"`}</Text>
      <Text style={styles.quoteSource}>{item.source}</Text>
    </View>
  );
}

function ScrapNote({ item }: { item: Extract<ScrapItem, { type: "note" }> }) {
  return (
    <View style={[styles.noteBox, { width: item.w }]}>
      <Text style={styles.noteText}>{item.text}</Text>
    </View>
  );
}

export default function ScrapbookScreen() {
  const { scrapItems } = useAppState();

  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);

  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  const pan = Gesture.Pan()
    .onStart(() => {
      startTx.value = tx.value;
      startTy.value = ty.value;
    })
    .onUpdate((e) => {
      tx.value = startTx.value + e.translationX;
      ty.value = startTy.value + e.translationY;
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = clamp(startScale.value * e.scale, MIN_SCALE, MAX_SCALE);
    });

  const composed = Gesture.Simultaneous(pan, pinch);

  const canvasStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  const zoomBy = (factor: number) => {
    scale.value = withTiming(clamp(scale.value * factor, MIN_SCALE, MAX_SCALE), { duration: 150 });
  };

  const fit = () => {
    scale.value = withTiming(1, { duration: 150 });
    tx.value = withTiming(0, { duration: 150 });
    ty.value = withTiming(0, { duration: 150 });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.headerBar}>
        <Text style={styles.lbl}>Collected</Text>
        <Text style={styles.h1}>Scrapbook</Text>
        <Text style={styles.meta}>Things I love</Text>
      </View>

      <View style={styles.canvasViewport}>
        <GestureDetector gesture={composed}>
          <Animated.View style={[styles.canvas, canvasStyle]}>
            {scrapItems.map((item: ScrapItem) => (
              <View
                key={item.id}
                style={{
                  position: "absolute",
                  left: item.x,
                  top: item.y,
                  transform: item.rot ? [{ rotate: `${item.rot}deg` }] : undefined,
                }}
              >
                {item.type === "img" ? <ScrapImage item={item} /> : null}
                {item.type === "quote" ? <ScrapQuote item={item} /> : null}
                {item.type === "note" ? <ScrapNote item={item} /> : null}
              </View>
            ))}
          </Animated.View>
        </GestureDetector>

        <View style={styles.zoomPill}>
          <Pressable style={styles.zoomBtn} onPress={() => zoomBy(0.8)}>
            <Text style={styles.zoomBtnText}>−</Text>
          </Pressable>
          <Pressable style={styles.zoomBtn} onPress={fit}>
            <Text style={styles.zoomBtnTextSmall}>FIT</Text>
          </Pressable>
          <Pressable style={styles.zoomBtn} onPress={() => zoomBy(1.25)}>
            <Text style={styles.zoomBtnText}>+</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  headerBar: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 14,
  },
  lbl: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    lineHeight: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: colors.textSecondary,
  },
  h1: {
    fontFamily: fonts.serif,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -0.3,
    color: colors.textPrimary,
    marginTop: 6,
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    lineHeight: 16,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: colors.textTertiary,
    marginTop: 4,
  },
  canvasViewport: {
    flex: 1,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  canvas: {
    width: 700,
    height: 900,
  },
  zoomPill: {
    position: "absolute",
    right: 14,
    bottom: 14,
    flexDirection: "row",
    backgroundColor: colors.surfaceDark,
    borderRadius: 9999,
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 2,
  },
  zoomBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomBtnText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: fonts.sansMedium,
  },
  zoomBtnTextSmall: {
    color: "#fff",
    fontSize: 8.5,
    fontFamily: fonts.monoMedium,
  },
  imgBox: {
    backgroundColor: "#ede8e2",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  imgLabel: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    color: colors.textTertiary,
    textAlign: "center",
  },
  quoteBox: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
  },
  quoteText: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  quoteSource: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    color: colors.textTertiary,
    marginTop: 8,
    textTransform: "uppercase",
  },
  noteBox: {
    backgroundColor: "#fff8d6",
    borderRadius: 4,
    padding: 12,
  },
  noteText: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.textPrimary,
  },
});
