"use client";

import { useEffect, useState } from "react";

type AccountStatus = {
  key: string;
  calendarId: string;
  label?: string;
  connected: boolean;
  eventCount?: number;
  error?: string;
};

type StatusResponse = {
  configured: boolean;
  accounts: AccountStatus[];
  checkedAt?: string;
};

function accountLabel(account: AccountStatus) {
  if (account.label) return account.label;
  return account.key === "2" ? "Second account" : "First account";
}

/** Test panel for the Google Calendar integration: which accounts are connected and whether they're syncing. */
export default function CalendarIntegrationStatus() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const runCheck = () => {
    fetch("/api/calendar/status")
      .then((res) => res.json())
      .then((data: StatusResponse) => setStatus(data))
      .catch(() =>
        setStatus({ configured: true, accounts: [], checkedAt: new Date().toISOString() }),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    runCheck();
  }, []);

  const handleTestClick = () => {
    setLoading(true);
    runCheck();
  };

  return (
    <section className="rounded-lg border border-border p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-foreground">Google Calendar</h2>
        <button
          onClick={handleTestClick}
          disabled={loading}
          className="text-xs text-muted underline underline-offset-2 transition-colors hover:text-foreground disabled:opacity-50"
        >
          {loading ? "Testing…" : "Test sync"}
        </button>
      </div>

      {status === null && (
        <p className="mt-3 text-sm text-muted">Checking connection…</p>
      )}

      {status && !status.configured && (
        <p className="mt-3 text-sm text-muted">
          Not connected.{" "}
          <a
            href="/api/calendar/auth"
            className="text-foreground underline underline-offset-2"
          >
            Connect a Google account
          </a>
          .
        </p>
      )}

      {status && status.configured && (
        <div className="mt-3 flex flex-col gap-2">
          {status.accounts.map((account) => (
            <div
              key={account.key}
              className="flex items-start justify-between rounded-md bg-hover px-3 py-2"
            >
              <div>
                <p className="text-sm text-foreground">{accountLabel(account)}</p>
                <p className="text-xs text-muted">{account.calendarId}</p>
                {account.error && (
                  <p className="mt-1 break-all font-mono text-[11px] text-muted/70">
                    {account.error}
                  </p>
                )}
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  account.connected
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {account.connected
                  ? `Connected · ${account.eventCount} upcoming`
                  : "Error"}
              </span>
            </div>
          ))}

          {status.accounts.length < 2 && (
            <p className="mt-1 text-xs text-muted">
              <a
                href="/api/calendar/auth?account=2"
                className="text-foreground underline underline-offset-2"
              >
                Connect a second Google account
              </a>{" "}
              to merge events from both calendars.
            </p>
          )}

          {status.checkedAt && (
            <p className="mt-1 text-[11px] text-muted/70">
              Last checked {new Date(status.checkedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
