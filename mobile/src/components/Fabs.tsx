import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import { colors, fonts, radius, shadow } from "../theme";
import { useAppState } from "../state/AppState";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ListeningBanner() {
  const { voiceText, seconds } = useAppState();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;

  return (
    <View style={styles.banner}>
      <View style={styles.bannerHeader}>
        <Animated.View style={[styles.dot, { opacity: pulse }]} />
        <Text style={styles.bannerLabel}>LISTENING — TAP MIC TO STOP</Text>
      </View>
      <Text style={styles.timer}>{`${pad2(mm)}:${pad2(ss)}`}</Text>
      <Text style={styles.transcript} numberOfLines={3}>
        {voiceText}
      </Text>
    </View>
  );
}

export default function Fabs({ hidden }: { hidden?: boolean }) {
  const { capture, openCapture, stopVoice } = useAppState();
  if (hidden) return null;
  const recording = capture === "voice";

  return (
    <>
      {recording ? <ListeningBanner /> : null}
      <View style={styles.stack}>
        <Pressable style={styles.fab} onPress={() => openCapture("text")}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 20h9"
              stroke="#fff"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <Path
              d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"
              stroke="#fff"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
        <Pressable
          style={[styles.fab, recording && styles.fabRecording]}
          onPress={() => (recording ? stopVoice() : openCapture("voice"))}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z"
              stroke="#fff"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M19 11a7 7 0 0 1-14 0"
              stroke="#fff"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Line x1={12} y1={18} x2={12} y2={22} stroke="#fff" strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: "absolute",
    right: 18,
    bottom: 78,
    zIndex: 7,
    flexDirection: "column",
    gap: 12,
  },
  fab: {
    width: 50,
    height: 50,
    borderRadius: radius.fab,
    backgroundColor: colors.surfaceDark,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.fab,
  },
  fabRecording: {
    backgroundColor: colors.overdueRed,
  },
  banner: {
    position: "absolute",
    left: 18,
    right: 84,
    bottom: 84,
    zIndex: 8,
    backgroundColor: "#1f1d1b",
    borderRadius: 16,
    padding: 14,
    paddingHorizontal: 16,
  },
  bannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.overdueRed,
  },
  bannerLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    color: "#e7ddd5",
  },
  timer: {
    fontFamily: fonts.monoMedium,
    fontSize: 26,
    color: "#fff",
    marginTop: 8,
  },
  transcript: {
    fontFamily: fonts.sans,
    fontSize: 12.5,
    lineHeight: 18,
    color: "#b9b0a7",
    marginTop: 6,
  },
});
