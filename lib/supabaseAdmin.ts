// Service-role Supabase client for server-only routes that must bypass RLS
// (writing/reading Plaid access tokens). Never import this from a
// "use client" component — SUPABASE_SERVICE_ROLE_KEY must stay server-side.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function supabaseAdminConfigured(): boolean {
  return Boolean(supabaseUrl && serviceRoleKey);
}

export function supabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service role is not configured");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
