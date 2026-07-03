import React, { useEffect, useState } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { Session } from "@supabase/supabase-js";

import {
  useFonts as useNewsreaderFonts,
  Newsreader_400Regular,
  Newsreader_500Medium,
} from "@expo-google-fonts/newsreader";
import {
  useFonts as useGeistFonts,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
} from "@expo-google-fonts/geist";
import {
  useFonts as useGeistMonoFonts,
  GeistMono_400Regular,
  GeistMono_500Medium,
  GeistMono_600SemiBold,
  GeistMono_700Bold,
} from "@expo-google-fonts/geist-mono";
import {
  useFonts as useJetBrainsMonoFonts,
  JetBrainsMono_400Regular,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";
import {
  useFonts as useNotoNastaliqFonts,
  NotoNastaliqUrdu_400Regular,
} from "@expo-google-fonts/noto-nastaliq-urdu";

import { supabase } from "./src/lib/supabase";
import { colors } from "./src/theme";
import { AppStateProvider, useAppState } from "./src/state/AppState";
import BottomNav, { TabKey } from "./src/components/BottomNav";
import Fabs from "./src/components/Fabs";
import Toast from "./src/components/Toast";
import QuickCaptureModal from "./src/components/QuickCaptureModal";
import LoginScreen from "./src/screens/LoginScreen";
import TodayScreen from "./src/screens/TodayScreen";
import TasksScreen from "./src/screens/TasksScreen";
import ProjectsScreen from "./src/screens/ProjectsScreen";
import LibraryScreen from "./src/screens/LibraryScreen";
import ScrapbookScreen from "./src/screens/ScrapbookScreen";
import SearchScreen from "./src/screens/SearchScreen";
import FlashcardsScreen from "./src/screens/FlashcardsScreen";

function AppShell() {
  const [tab, setTab] = useState<TabKey>("Today");
  const { toast } = useAppState();

  const isScrapbook = tab === "Scrapbook";

  return (
    <View style={styles.app}>
      {isScrapbook ? (
        <ScrapbookScreen />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {tab === "Today" ? <TodayScreen /> : null}
          {tab === "Tasks" ? <TasksScreen /> : null}
          {tab === "Projects" ? <ProjectsScreen /> : null}
          {tab === "Library" ? <LibraryScreen /> : null}
          {tab === "Urdu" ? <FlashcardsScreen /> : null}
          {tab === "Search" ? <SearchScreen /> : null}
        </ScrollView>
      )}

      <Fabs hidden={isScrapbook} />
      <Toast message={toast} />
      <QuickCaptureModal />

      <BottomNav active={tab} onChange={setTab} />
    </View>
  );
}

// ── self-update ────────────────────────────────────────────────────────────
// The build this bundle was compiled from (Vercel commit SHA, stamped in at
// build time via mobile/patch-html.js -> version.json + sw.js).
const LOCAL_BUILD_ID = process.env.EXPO_PUBLIC_BUILD_ID;

// Expose it so it's inspectable without logging in (used by the update test and
// handy for support).
if (typeof window !== "undefined") {
  (window as unknown as { __BUILD_ID__?: string }).__BUILD_ID__ = LOCAL_BUILD_ID ?? "dev";
}

/** Purge caches + any service worker, then cache-bust reload into the new build. */
async function applyUpdate() {
  try {
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    // best-effort — the cache-busting navigation below is the real fix
  }
  const base = window.location.pathname.replace(/[?#].*$/, "");
  window.location.replace(`${base}?u=${Date.now()}`);
}

/**
 * Compare the deployed build id (version.json, served no-store) to this bundle's
 * and reload into the new one if they differ. This is the primary mechanism —
 * it runs in plain app JS on load and every time the tab becomes visible
 * (reopening the installed PWA), independent of the service worker. A
 * sessionStorage guard prevents reload loops.
 */
async function checkForUpdate() {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  if (!LOCAL_BUILD_ID || LOCAL_BUILD_ID === "local" || LOCAL_BUILD_ID === "dev") return;
  try {
    const res = await fetch(`/app/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { buildId?: string };
    if (!data.buildId || data.buildId === LOCAL_BUILD_ID) return;
    const store = window.sessionStorage;
    if (store && store.getItem("lt_updated_to") === data.buildId) return;
    store?.setItem("lt_updated_to", data.buildId);
    await applyUpdate();
  } catch {
    // offline or version.json missing — nothing to do
  }
}

/**
 * Register the update service worker as a secondary safety net. Served with
 * `Service-Worker-Allowed: /app` (see next.config) and registered with scope
 * "/app" so it actually controls the /app page (default scope "/app/" would
 * NOT). Its only job is forcing navigations to hit the network (fresh shell),
 * so even if the browser ignores no-store the app can't get stuck on a stale
 * page. Reloads are driven by checkForUpdate (version.json), not by the worker,
 * to avoid a spurious reload when it first claims an uncontrolled page.
 */
function registerServiceWorker() {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/app/sw.js", { scope: "/app" }).catch(() => {});
}

/** Wire up self-update: runs before the login gate so it works signed-out too. */
function useAppUpdates() {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    registerServiceWorker();
    void checkForUpdate();
    // iOS home-screen PWAs don't reliably fire a single event on reopen, so
    // listen to several — whichever fires when the app comes back to the fore
    // triggers the version check.
    const onWake = () => {
      if (document.visibilityState !== "hidden") void checkForUpdate();
    };
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("pageshow", onWake);
    window.addEventListener("focus", onWake);
    return () => {
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("pageshow", onWake);
      window.removeEventListener("focus", onWake);
    };
  }, []);
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useAppUpdates();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    }).catch(() => {
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s);
      setAuthReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Load fonts in parallel — don't block rendering on them
  useNewsreaderFonts({ Newsreader_400Regular, Newsreader_500Medium });
  useGeistFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold });
  useGeistMonoFonts({ GeistMono_400Regular, GeistMono_500Medium, GeistMono_600SemiBold, GeistMono_700Bold });
  useJetBrainsMonoFonts({ JetBrainsMono_400Regular, JetBrainsMono_700Bold });
  useNotoNastaliqFonts({ NotoNastaliqUrdu_400Regular });

  if (!authReady) {
    return <View style={styles.app} />;
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, minHeight: "100%" }}>
      <SafeAreaProvider>
        <AppStateProvider userId={session.user.id}>
          <AppShell />
          <StatusBar style="dark" />
        </AppStateProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
});
