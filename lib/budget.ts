// Budget transaction model: a single expense or income entry, logged manually.

export type TransactionType = "expense" | "income";

export type Transaction = {
  id: string;
  amount: number;
  type: TransactionType;
  description: string;
  category?: string;
  /** YYYY-MM-DD */
  date: string;
  createdAt: string;
};

export type NewTransactionInput = {
  amount: number;
  type: TransactionType;
  description: string;
  category?: string;
  date: string;
};

export function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

/** "2026-06-05" -> "2026-06" */
export function monthKeyOf(dateKey: string): string {
  return dateKey.slice(0, 7);
}

/** "2026-06" -> "June 2026" */
export function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/** Local YYYY-MM-DD for today (avoids UTC off-by-one from toISOString). */
export function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
