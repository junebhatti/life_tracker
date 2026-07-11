"use client";

import { useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import BankConnect from "@/components/BankConnect";
import { useBudget } from "@/components/BudgetStore";
import {
  formatCurrency,
  monthKeyOf,
  monthLabel,
  todayKey,
  type Transaction,
  type TransactionType,
} from "@/lib/budget";

function formatDate(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00`)
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}

/** "2026-06" shifted by ±N months, staying a valid month key. */
function shiftMonth(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Plaid-synced rows carry this id prefix (see app/api/plaid/sync). */
function isBankTxn(t: Transaction): boolean {
  return t.id.startsWith("txn_plaid_");
}

const CATEGORY_COLORS = [
  "#2323e8", "#0891b2", "#7c3aed", "#0ea5e9", "#059669",
  "#d97706", "#db2777", "#65a30d", "#dc2626", "#64748b",
];

export default function BudgetPage() {
  const { transactions, hydrated, addTransaction, deleteTransaction } = useBudget();

  const [month, setMonth] = useState(monthKeyOf(todayKey()));
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(todayKey());
  const [filter, setFilter] = useState<"all" | "expense" | "income">("all");

  // Transactions in the selected month, newest first.
  const monthTxns = useMemo(
    () =>
      transactions
        .filter((t) => monthKeyOf(t.date) === month)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [transactions, month],
  );

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of monthTxns) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    }
    return { income, expense, net: income - expense };
  }, [monthTxns]);

  // Expense breakdown by category for the selected month.
  const breakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of monthTxns) {
      if (t.type !== "expense") continue;
      const key = t.category?.trim() || "Uncategorized";
      map.set(key, (map.get(key) ?? 0) + t.amount);
    }
    const rows = Array.from(map.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
    const max = rows[0]?.total ?? 0;
    return { rows, max };
  }, [monthTxns]);

  const insights = useMemo(() => {
    const expenses = monthTxns.filter((t) => t.type === "expense");
    if (expenses.length === 0) return null;
    const daysWithSpend = new Set(expenses.map((t) => t.date)).size;
    const biggest = expenses.reduce((a, b) => (b.amount > a.amount ? b : a));
    const top = breakdown.rows[0];
    return {
      perDay: totals.expense / Math.max(1, daysWithSpend),
      biggest,
      top,
      count: expenses.length,
    };
  }, [monthTxns, totals.expense, breakdown.rows]);

  const visibleTxns = useMemo(
    () => (filter === "all" ? monthTxns : monthTxns.filter((t) => t.type === filter)),
    [monthTxns, filter],
  );

  const isCurrentMonth = month === monthKeyOf(todayKey());

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount);
    const trimmedDescription = description.trim();
    if (!trimmedDescription || !Number.isFinite(value) || value <= 0) return;
    addTransaction({
      amount: value,
      type,
      description: trimmedDescription,
      category: category.trim() || undefined,
      date,
    });
    setAmount("");
    setDescription("");
    setCategory("");
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-8 py-10">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Budget</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Budget</h1>

          {/* month navigator */}
          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
              className="rounded-md border border-border px-2 py-1 text-sm text-muted hover:bg-hover hover:text-foreground"
              aria-label="Previous month"
            >
              ‹
            </button>
            <p className="min-w-[9rem] text-center text-sm font-medium text-foreground">
              {monthLabel(month)}
            </p>
            <button
              type="button"
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
              disabled={isCurrentMonth}
              className="rounded-md border border-border px-2 py-1 text-sm text-muted hover:bg-hover hover:text-foreground disabled:opacity-40"
              aria-label="Next month"
            >
              ›
            </button>
            {!isCurrentMonth && (
              <button
                type="button"
                onClick={() => setMonth(monthKeyOf(todayKey()))}
                className="text-[11px] uppercase tracking-wider text-muted hover:text-foreground"
              >
                Today
              </button>
            )}
          </div>

          {/* summary */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-md border border-border p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted">Income</p>
              <p className="mt-1 text-lg font-medium text-foreground">{formatCurrency(totals.income)}</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted">Spent</p>
              <p className="mt-1 text-lg font-medium text-foreground">{formatCurrency(totals.expense)}</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted">Net</p>
              <p className={`mt-1 text-lg font-medium ${totals.net < 0 ? "text-accent" : "text-foreground"}`}>
                {formatCurrency(totals.net)}
              </p>
            </div>
          </div>

          {/* category breakdown */}
          {breakdown.rows.length > 0 && (
            <div className="mt-6">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                Where it went
              </p>
              <div className="mt-3 flex flex-col gap-2.5">
                {breakdown.rows.slice(0, 8).map((r, i) => (
                  <div key={r.name}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-foreground">{r.name}</span>
                      <span className="text-muted">
                        {formatCurrency(r.total)}
                        <span className="ml-1.5 text-[11px]">
                          {Math.round((r.total / totals.expense) * 100)}%
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-hover">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${breakdown.max ? (r.total / breakdown.max) * 100 : 0}%`,
                          backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {insights && (
                <p className="mt-4 text-xs leading-relaxed text-muted">
                  {insights.count} expense{insights.count === 1 ? "" : "s"} ·{" "}
                  {formatCurrency(insights.perDay)}/active day
                  {insights.top && <> · most on {insights.top.name}</>} · biggest:{" "}
                  {insights.biggest.description} ({formatCurrency(insights.biggest.amount)})
                </p>
              )}
            </div>
          )}

          {/* bank connection */}
          <BankConnect />

          {/* manual add */}
          <form onSubmit={handleAdd} className="mt-6 flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`rounded-md px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider transition-colors ${
                  type === "expense" ? "bg-[#2323e8] text-white" : "border border-border text-muted hover:text-foreground"
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setType("income")}
                className={`rounded-md px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider transition-colors ${
                  type === "income" ? "bg-[#2323e8] text-white" : "border border-border text-muted hover:text-foreground"
                }`}
              >
                Income
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description…"
                className="flex-1 rounded-md border border-border px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-neutral-400"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
                className="w-28 shrink-0 rounded-md border border-border px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-neutral-400"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Category (optional)…"
                className="flex-1 rounded-md border border-border px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-neutral-400"
              />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="shrink-0 rounded-md border border-border px-3 py-2 text-sm text-foreground outline-none focus:border-neutral-400"
              />
              <button
                type="submit"
                className="shrink-0 rounded-md bg-[#2323e8] px-3 py-2 text-xs font-medium uppercase tracking-wider text-white transition-colors hover:bg-[#1c1cba]"
              >
                Add
              </button>
            </div>
          </form>

          {/* transactions for the month */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                {monthLabel(month)} · {visibleTxns.length}
              </p>
              <div className="flex gap-1">
                {(["all", "expense", "income"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                      filter === f ? "bg-hover text-foreground" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-2 flex flex-col">
              {!hydrated &&
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="mb-2 h-12 w-full animate-pulse rounded bg-hover" />
                ))}

              {hydrated && visibleTxns.length === 0 && (
                <p className="py-4 text-sm text-muted">No transactions this month.</p>
              )}

              {hydrated &&
                visibleTxns.map((t) => (
                  <div key={t.id} className="group flex items-center gap-3 border-b border-border py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">{t.description}</p>
                        {isBankTxn(t) && (
                          <span className="shrink-0 rounded bg-[#2323e8]/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-[#2323e8]">
                            Bank
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted">
                        {formatDate(t.date)}
                        {t.category ? ` · ${t.category}` : ""}
                      </p>
                    </div>
                    <p
                      className={`shrink-0 text-sm font-medium ${
                        t.type === "income" ? "text-foreground" : "text-accent"
                      }`}
                    >
                      {t.type === "income" ? "+" : "-"}
                      {formatCurrency(t.amount)}
                    </p>
                    <button
                      type="button"
                      onClick={() => deleteTransaction(t.id)}
                      className="shrink-0 text-[11px] uppercase tracking-wider text-muted opacity-0 transition-colors hover:text-accent group-hover:opacity-100"
                    >
                      Delete
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
