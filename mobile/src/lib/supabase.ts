import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const url = (process.env as Record<string, string | undefined>)["EXPO_PUBLIC_SUPABASE_URL"] ?? "";
const key = (process.env as Record<string, string | undefined>)["EXPO_PUBLIC_SUPABASE_ANON_KEY"] ?? "";

export const supabase = createClient(url, key, {
  auth: {
    ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
  },
});
