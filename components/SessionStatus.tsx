"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";

/** Shows the signed-in account, when the current access token next refreshes,
 *  and how sign-in longevity works — answering "how often do I have to sign
 *  back in?". Supabase silently refreshes the access token (default: hourly)
 *  in the background, so you stay signed in indefinitely as long as you open
 *  the app now and then; you only re-sign-in if the refresh token lapses. */
export default function SessionStatus() {
  const { session, user, signOut } = useAuth();
  const [now, setNow] = useState(() => Date.now());

  // Tick so the "refreshes in …" estimate stays roughly current.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!session || !user) return null;

  const expiresAtMs = session.expires_at ? session.expires_at * 1000 : null;
  const minutesLeft =
    expiresAtMs != null ? Math.round((expiresAtMs - now) / 60_000) : null;

  const refreshLabel =
    minutesLeft == null
      ? "automatically in the background"
      : minutesLeft <= 0
        ? "any moment now"
        : minutesLeft < 60
          ? `in about ${minutesLeft} min`
          : `in about ${Math.round(minutesLeft / 60)} h`;

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium text-foreground">Account</h2>
          <p className="mt-1 text-sm text-muted">
            Signed in as{" "}
            <span className="text-foreground">{user.email ?? "your account"}</span>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted transition-colors hover:text-accent"
        >
          Sign out
        </button>
      </div>

      <p className="mt-3 text-sm text-muted">
        You stay signed in automatically — your session refreshes {refreshLabel},
        with no action needed. You&apos;d only have to sign in again if you go a
        long stretch without opening the app, or after signing out on this
        device.
      </p>
    </div>
  );
}
