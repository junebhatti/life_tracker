import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";
import { useAppState } from "../state/AppState";
import { applyUpdate, checkForUpdate } from "../lib/appUpdate";

/** Short build id, stamped in at deploy time (the Vercel commit SHA). */
const BUILD_ID = (process.env.EXPO_PUBLIC_BUILD_ID ?? "dev").slice(0, 7);

function nowLabel(): string {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function TodaySettings() {
  const { refreshAll, refreshing, signOut } = useAppState();
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  // The visible "refresh" affordance: pull the newest data AND, if a newer
  // build has been deployed, reload straight into it. Whichever button the
  // user thinks of as "refresh", this is the one that also grabs new code.
  async function handleSync() {
    await refreshAll();
    const updated = await checkForUpdate();
    if (!updated) setLastSynced(nowLabel());
    // if updated, checkForUpdate() is already reloading the page — nothing
    // left to update in local state.
  }

  // Force-check even if this bundle's build id looks current: bypasses
  // checkForUpdate's own guard and always clears caches + hard-reloads, in
  // case the browser/PWA is stuck on a stale shell that never even ran the
  // new JS (so checkForUpdate's up-front bail-out never fires from it).
  async function handleForceUpdate() {
    setCheckingUpdate(true);
    const updated = await checkForUpdate();
    if (!updated) await applyUpdate();
    // On success either branch navigates away; setCheckingUpdate(false) would
    // only matter if both bail out silently (e.g. offline), which can't
    // happen here since applyUpdate always reloads.
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>Sync &amp; Settings</Text>

      <Pressable style={styles.row} onPress={handleSync} disabled={refreshing}>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>{refreshing ? "Syncing…" : "Sync now"}</Text>
          <Text style={styles.rowSub}>
            Pull latest tasks, calendar, health &amp; app version
            {lastSynced ? ` · last ${lastSynced}` : ""}
          </Text>
        </View>
        <Text style={styles.rowIcon}>{refreshing ? "•••" : "↻"}</Text>
      </Pressable>

      {Platform.OS === "web" ? (
        <Pressable style={styles.row} onPress={() => void handleForceUpdate()} disabled={checkingUpdate}>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>{checkingUpdate ? "Checking…" : "Check for updates"}</Text>
            <Text style={styles.rowSub}>Force-reload to the newest deployed version</Text>
          </View>
          <Text style={styles.rowIcon}>⤓</Text>
        </Pressable>
      ) : null}

      <Pressable style={styles.row} onPress={() => void signOut()}>
        <View style={styles.rowBody}>
          <Text style={[styles.rowTitle, styles.signOut]}>Sign out</Text>
        </View>
      </Pressable>

      <Text style={styles.build}>Build {BUILD_ID}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: colors.textSecondary,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowBody: { flex: 1 },
  rowTitle: { fontFamily: fonts.sans, fontSize: 15, color: colors.textPrimary },
  rowSub: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textTertiary,
    marginTop: 2,
  },
  rowIcon: {
    fontFamily: fonts.sans,
    fontSize: 18,
    color: colors.textSecondary,
    marginLeft: 12,
  },
  signOut: { color: colors.accentRed },
  build: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.textFaint,
    marginTop: 14,
  },
});
