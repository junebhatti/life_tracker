import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
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

import { supabase } from "./src/lib/supabase";
import { colors } from "./src/theme";
import { AppStateProvider, useAppState } from "./src/state/AppState";
import BottomNav, { TabKey } from "./src/components/BottomNav";
import NotificationBell from "./src/components/NotificationBell";
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

function AppShell() {
  const [tab, setTab] = useState<TabKey>("Today");
  const { toast } = useAppState();

  const isScrapbook = tab === "Scrapbook";

  return (
    <View style={styles.app}>
      <NotificationBell count={1} />

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

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  // Load fonts in parallel — don't block rendering on them
  useNewsreaderFonts({ Newsreader_400Regular, Newsreader_500Medium });
  useGeistFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold });
  useGeistMonoFonts({ GeistMono_400Regular, GeistMono_500Medium, GeistMono_600SemiBold, GeistMono_700Bold });
  useJetBrainsMonoFonts({ JetBrainsMono_400Regular, JetBrainsMono_700Bold });

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
