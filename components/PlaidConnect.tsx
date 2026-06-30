"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useAuth } from "./AuthProvider";

type StatusResponse = { linked: boolean; institutions: string[] };

/** Connects a bank/credit card via Plaid Link and pulls transactions into the Budget tracker. */
export default function PlaidConnect() {
  const { session } = useAuth();
  const token = session?.access_token;

  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const authedFetch = useCallback(
    (url: string, init?: RequestInit) =>
      fetch(url, {
        ...init,
        headers: { ...init?.headers, Authorization: `Bearer ${token}` },
      }),
    [token],
  );

  const loadStatus = useCallback(() => {
    if (!token) return;
    authedFetch("/api/plaid/status")
      .then((res) => res.json())
      .then((data: StatusResponse) => setStatus(data))
      .catch(() => {});
  }, [token, authedFetch]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!token || linkToken) return;
    authedFetch("/api/plaid/link-token", { method: "POST" })
      .then((res) => res.json())
      .then((data) => setLinkToken(data.linkToken ?? null))
      .catch(() => {});
  }, [token, linkToken, authedFetch]);

  const onSuccess = useCallback(
    (publicToken: string, metadata: { institution: { name: string } | null }) => {
      setError(null);
      authedFetch("/api/plaid/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicToken,
          institutionName: metadata.institution?.name ?? null,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          loadStatus();
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to link account"));
    },
    [authedFetch, loadStatus],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken ?? "",
    onSuccess,
  });

  const runSync = () => {
    setSyncing(true);
    setError(null);
    setSyncResult(null);
    authedFetch("/api/plaid/sync", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setSyncResult(
          `Synced: ${data.added} new, ${data.modified} updated${
            data.removed ? `, ${data.removed} removed` : ""
          }.`,
        );
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Sync failed"))
      .finally(() => setSyncing(false));
  };

  return (
    <div className="rounded-lg border border-border p-4">
      <h2 className="text-sm font-medium text-foreground">Bank account (Plaid)</h2>
      <p className="mt-1 text-sm text-muted">
        Connect a bank or credit card to automatically pull its transactions into the
        Budget tracker. Connecting opens Plaid&apos;s secure login widget — your bank
        credentials are never sent to this app.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!ready}
          onClick={() => open()}
          className="rounded-md bg-neutral-800 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-white transition-colors hover:bg-neutral-700 disabled:opacity-40"
        >
          {status?.linked ? "Connect another account" : "Connect bank account"}
        </button>
        {status?.linked && (
          <button
            type="button"
            disabled={syncing}
            onClick={runSync}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted transition-colors hover:text-foreground disabled:opacity-40"
          >
            {syncing ? "Syncing…" : "Sync transactions"}
          </button>
        )}
      </div>

      {status?.linked && (
        <p className="mt-2 text-xs text-muted">
          Connected: {status.institutions.join(", ")}.
        </p>
      )}
      {syncResult && <p className="mt-2 text-xs text-muted">{syncResult}</p>}
      {error && <p className="mt-2 text-xs text-accent">{error}</p>}
    </div>
  );
}
