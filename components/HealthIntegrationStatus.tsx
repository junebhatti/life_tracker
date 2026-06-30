"use client";

import { useEffect, useState } from "react";

type HealthSnapshot = {
  steps?: number;
  restingHeartRate?: number;
  sleep?: { hours: number; start: string; end: string };
};

type StatusResponse = {
  configured: boolean;
  connected?: boolean;
  snapshot?: HealthSnapshot;
  error?: string;
  debug?: Partial<Record<"steps" | "restingHeartRate" | "sleep", string>>;
  checkedAt?: string;
};

/** Test panel for the Google Health integration: is Fitbit data syncing in. */
export default function HealthIntegrationStatus() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const runCheck = () => {
    fetch("/api/health/status")
      .then((res) => res.json())
      .then((data: StatusResponse) => setStatus(data))
      .catch(() => setStatus({ configured: true, connected: false, error: "Request failed" }))
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
        <h2 className="text-sm font-medium text-foreground">Google Health</h2>
        <button
          onClick={handleTestClick}
          disabled={loading}
          className="text-xs text-muted underline underline-offset-2 transition-colors hover:text-foreground disabled:opacity-50"
        >
          {loading ? "Testing…" : "Test sync"}
        </button>
      </div>

      {status === null && <p className="mt-3 text-sm text-muted">Checking connection…</p>}

      {status && !status.configured && (
        <p className="mt-3 text-sm text-muted">
          Not connected.{" "}
          <a href="/api/health/auth" className="text-foreground underline underline-offset-2">
            Connect Google Health
          </a>{" "}
          (Fitbit data syncs in through this).
        </p>
      )}

      {status && status.configured && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-start justify-between rounded-md bg-hover px-3 py-2">
            <div>
              <p className="text-sm text-foreground">Connected account</p>
              {status.error && (
                <p className="mt-1 break-all font-mono text-[11px] text-muted/70">
                  {status.error}
                </p>
              )}
              {status.connected && status.snapshot && (
                <p className="mt-1 text-xs text-muted">
                  Steps today: {status.snapshot.steps ?? "—"} · Resting HR:{" "}
                  {status.snapshot.restingHeartRate ?? "—"} · Sleep:{" "}
                  {status.snapshot.sleep ? `${status.snapshot.sleep.hours}h` : "—"}
                </p>
              )}
              {status.debug && (
                <div className="mt-1 flex flex-col gap-0.5">
                  {Object.entries(status.debug).map(([field, message]) => (
                    <p
                      key={field}
                      className="break-all font-mono text-[11px] text-muted/70"
                    >
                      {field}: {message}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                status.connected
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {status.connected ? "Connected" : "Error"}
            </span>
          </div>

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
