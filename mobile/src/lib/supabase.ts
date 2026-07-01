import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* eslint-disable dot-notation */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

// createClient throws TypeError if url is empty/invalid — guard so the module
// doesn't crash during Vercel builds where env vars may not be set yet.
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  key || "placeholder",
  {
    auth: {
      ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === "web",
    },
  },
);
