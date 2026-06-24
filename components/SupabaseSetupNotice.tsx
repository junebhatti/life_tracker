/** Shown instead of the app when Supabase env vars haven't been set yet. */
export default function SupabaseSetupNotice() {
  return (
    <div className="flex h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md rounded-xl border border-border p-6">
        <h1 className="text-lg font-semibold text-foreground">
          Supabase isn&apos;t configured
        </h1>
        <p className="mt-2 text-sm text-muted">
          Set <code className="text-foreground">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
          and{" "}
          <code className="text-foreground">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
          (see <code className="text-foreground">.env.example</code>), run the
          schema in <code className="text-foreground">supabase/schema.sql</code>,
          then reload.
        </p>
      </div>
    </div>
  );
}
