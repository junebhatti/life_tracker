// Supabase client shared across the app. Tasks, Projects, and Routines all
// sync through this client so the same account sees the same data on every
// device, instead of each browser keeping its own localStorage copy.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** False until NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are set. */
export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

const webStorage =
  typeof window !== "undefined" && window.localStorage
    ? {
        getItem: (k: string) => Promise.resolve(window.localStorage.getItem(k)),
        setItem: (k: string, v: string) =>
          Promise.resolve(window.localStorage.setItem(k, v)),
        removeItem: (k: string) =>
          Promise.resolve(window.localStorage.removeItem(k)),
      }
    : undefined;

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  {
    auth: {
      storage: webStorage,
      flowType: "implicit",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
