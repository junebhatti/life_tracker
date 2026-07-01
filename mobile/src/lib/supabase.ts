import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Explicit localStorage adapter for web so the session survives app restarts
const webStorage =
  typeof window !== "undefined" && window.localStorage
    ? {
        getItem: (k: string) => Promise.resolve(window.localStorage.getItem(k)),
        setItem: (k: string, v: string) => Promise.resolve(window.localStorage.setItem(k, v)),
        removeItem: (k: string) => Promise.resolve(window.localStorage.removeItem(k)),
      }
    : undefined;

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  key || "placeholder",
  {
    auth: {
      storage: Platform.OS === "web" ? webStorage : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === "web",
    },
  },
);
