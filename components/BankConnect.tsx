"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useAuth } from "./AuthProvider";

type Status = { linked: boolean; institutions: string[] };

function authHeaders(token: string | undefined): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Bank-linking card for the Budget page: opens Plaid Link, exchanges the
 *  token, kicks a first sync, and shows connected institutions + a Sync button.
 *  Synced rows land in budget_transactions and flow in via the store's realtime
 *  subscription, so there's nothing to lift up here. */
export default function BankConnect() {
  const { session } = useAuth();
  const token = session?.access_token;

  const [status, setStatus] = useState<Status | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/plaid/status", { headers: authHeaders(token) });
      if (res.ok) setStatus((await res.json()) as Status);
    } catch {
      /* ignore — treat as unlinked */
    }
  }, [token]);

  useEffect(() => {
    // loadStatus only setStates after an await, but the rule can't see that.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStatus();
  }, [loadStatus]);

  const onSuccess = useCallback(
    async (publicToken: string, metadata: { institution?: { name?: string } | null }) => {
      setBusy(true);
      setMessage(null);
      try {
        const ex = await fetch("/api/plaid/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders(token) },
          body: JSON.stringify({ publicToken, institutionName: metadata.institution?.name }),
        });
        if (!ex.ok) throw new Error("exchange failed");
        const sync = await fetch("/api/plaid/sync", { method: "POST", headers: authHeaders(token) });
        const s = (await sync.json().catch(() => ({}))) as { added?: number };
        setMessage(sync.ok ? `Linked — imported ${s.added ?? 0} transactions.` : "Linked, but the first sync failed.");
        await loadStatus();
      } catch {
        setMessage("Couldn't finish linking. Please try again.");
      } finally {
        setLinkToken(null);
        setBusy(false);
      }
    },
    [token, loadStatus],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: () => setLinkToken(null),
  });

  // Once we have a link token and Plaid Link is ready, pop the modal.
  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  async function connect() {
    if (!token) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/plaid/link-token", { method: "POST", headers: authHeaders(token) });
      const json = (await res.json().catch(() => ({}))) as { linkToken?: string; error?: string };
      if (!res.ok || !json.linkToken) {
        if (json.error === "Plaid is not configured") setNotConfigured(true);
        else setMessage("Couldn't start bank linking. Please try again.");
        return;
      }
      setLinkToken(json.linkToken);
    } catch {
      setMessage("Couldn't start bank linking. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function sync() {
    if (!token) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/plaid/sync", { method: "POST", headers: authHeaders(token) });
      const s = (await res.json().catch(() => ({}))) as { added?: number; modified?: number; error?: string };
      setMessage(
        res.ok
          ? `Synced · ${s.added ?? 0} new, ${s.modified ?? 0} updated.`
          : s.error ?? "Sync failed.",
      );
    } catch {
      setMessage("Sync failed.");
    } finally {
      setBusy(false);
    }
  }

  if (notConfigured) {
    return (
      <div className="mt-6 rounded-md border border-border bg-hover/40 p-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Bank connection</p>
        <p className="mt-1 text-sm text-foreground">Bank linking isn&apos;t set up yet.</p>
        <p className="mt-1 text-xs text-muted">
          Add <code className="rounded bg-hover px-1">PLAID_CLIENT_ID</code>,{" "}
          <code className="rounded bg-hover px-1">PLAID_SECRET</code> and{" "}
          <code className="rounded bg-hover px-1">PLAID_ENV</code> in your environment, then reload.
        </p>
      </div>
    );
  }

  const linked = status?.linked;

  return (
    <div className="mt-6 rounded-md border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Bank</p>
          {linked ? (
            <p className="mt-1 truncate text-sm text-foreground">
              Connected · {status!.institutions.join(", ")}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">
              Link a bank or card to import transactions automatically.
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {linked && (
            <button
              type="button"
              onClick={sync}
              disabled={busy}
              className="rounded-md border border-border px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-foreground hover:bg-hover disabled:opacity-50"
            >
              {busy ? "Working…" : "Sync now"}
            </button>
          )}
          <button
            type="button"
            onClick={connect}
            disabled={busy}
            className="rounded-md bg-[#2323e8] px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-white hover:bg-[#1c1cba] disabled:opacity-50"
          >
            {linked ? "Add another" : busy ? "Working…" : "Connect bank"}
          </button>
        </div>
      </div>
      {message && <p className="mt-3 text-xs text-muted">{message}</p>}
    </div>
  );
}
