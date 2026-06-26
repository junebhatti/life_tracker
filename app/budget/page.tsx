"use client";

import { useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useBudget } from "@/components/BudgetStore";
import {
  formatCurrency,
  monthKeyOf,
  monthLabel,
  todayKey,
  type TransactionType,
} from "@/lib/budget";

function formatDate(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00`)
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}

export default function BudgetPage() {
  const { transactions, hydrated, addTransaction, deleteTransaction } =
    useBudget();
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(todayKey());

  const sorted = useMemo(
    () =>
      [...transactions].sort(
        (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
      ),
    [transactions],
  );

  const groups = useMemo(() => {
    const map = new Map<string, typeof transactions>();
    for (const t of sorted) {
      const key = monthKeyOf(t.date);
      const existing = map.get(key);
      if (existing) existing.push(t);
      else map.set(key, [t]);
    }
    return Array.from(map.entries());
  }, [sorted]);

  const thisMonthKey = monthKeyOf(todayKey());
  const monthTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      if (monthKeyOf(t.date) !== thisMonthKey) continue;
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    }
    return { income, expense, net: income - expense };
  }, [transactions, thisMonthKey]);

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
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Budget
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            Budget
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted">
            Track spending and income, logged manually.
          </p>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-md border border-border p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted">
                Income
              </p>
              <p className="mt-1 text-lg font-medium text-foreground">
                {formatCurrency(monthTotals.income)}
              </p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted">
                Spent
              </p>
              <p className="mt-1 text-lg font-medium text-foreground">
                {formatCurrency(monthTotals.expense)}
              </p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted">
                Net
              </p>
              <p
                className={`mt-1 text-lg font-medium ${
                  monthTotals.net < 0 ? "text-accent" : "text-foreground"
                }`}
              >
                {formatCurrency(monthTotals.net)}
              </p>
            </div>
          </div>

          <form onSubmit={handleAdd} className="mt-6 flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`rounded-md px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider transition-colors ${
                  type === "expense"
                    ? "bg-neutral-800 text-white"
                    : "border border-border text-muted hover:text-foreground"
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setType("income")}
                className={`rounded-md px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider transition-colors ${
                  type === "income"
                    ? "bg-neutral-800 text-white"
                    : "border border-border text-muted hover:text-foreground"
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
                className="shrink-0 rounded-md bg-neutral-800 px-3 py-2 text-xs font-medium uppercase tracking-wider text-white transition-colors hover:bg-neutral-700"
              >
                Add
              </button>
            </div>
          </form>

          <div className="mt-8 flex flex-col gap-6">
            {!hydrated && (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 w-full animate-pulse rounded bg-hover"
                  />
                ))}
              </div>
            )}

            {hydrated && groups.length === 0 && (
              <p className="text-sm text-muted">No transactions yet.</p>
            )}

            {hydrated &&
              groups.map(([key, items]) => {
                const net = items.reduce(
                  (sum, t) => sum + (t.type === "income" ? t.amount : -t.amount),
                  0,
                );
                return (
                  <div key={key}>
                    <div className="flex items-baseline justify-between">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                        {monthLabel(key)}
                      </p>
                      <p
                        className={`text-xs font-medium ${
                          net < 0 ? "text-accent" : "text-foreground"
                        }`}
                      >
                        {formatCurrency(net)}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-col">
                      {items.map((t) => (
                        <div
                          key={t.id}
                          className="group flex items-center gap-3 border-b border-border py-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {t.description}
                            </p>
                            <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted">
                              {formatDate(t.date)}
                              {t.category ? ` · ${t.category}` : ""}
                            </p>
                          </div>
                          <p
                            className={`shrink-0 text-sm font-medium ${
                              t.type === "income"
                                ? "text-foreground"
                                : "text-accent"
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
                );
              })}
          </div>
        </div>
      </main>
    </div>
  );
}
