import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";
import { useAppState } from "../state/AppState";

/**
 * Foreground / cache-busting reload so a home-screen PWA can pull a freshly
 * deployed build without being reinstalled. Clearing the caches first means the
 * service worker (if any) hands back the new bundle instead of the cached one.
 */
async function reloadApp() {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  try {
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    if (nav && "serviceWorker" in nav) {
      const regs = await nav.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    // best-effort — fall through to a plain reload
  }
  window.location.reload();
}

function nowLabel(): string {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function TodaySettings() {
  const { refreshAll, refreshing, signOut } = useAppState();
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  async function handleSync() {
    await refreshAll();
    setLastSynced(nowLabel());
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>Sync &amp; Settings</Text>

      <Pressable style={styles.row} onPress={handleSync} disabled={refreshing}>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>{refreshing ? "Syncing…" : "Sync now"}</Text>
          <Text style={styles.rowSub}>
            Pull latest tasks, calendar &amp; health
            {lastSynced ? ` · last ${lastSynced}` : ""}
          </Text>
        </View>
        <Text style={styles.rowIcon}>{refreshing ? "•••" : "↻"}</Text>
      </Pressable>

      {Platform.OS === "web" ? (
        <Pressable style={styles.row} onPress={reloadApp}>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Check for updates</Text>
            <Text style={styles.rowSub}>Reload to download the newest app version</Text>
          </View>
          <Text style={styles.rowIcon}>⤓</Text>
        </Pressable>
      ) : null}

      <Pressable style={styles.row} onPress={() => void signOut()}>
        <View style={styles.rowBody}>
          <Text style={[styles.rowTitle, styles.signOut]}>Sign out</Text>
        </View>
      </Pressable>
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
});
