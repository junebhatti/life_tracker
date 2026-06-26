"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";
import type { NewTransactionInput, Transaction, TransactionType } from "@/lib/budget";

type TransactionRow = {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string;
  category: string | null;
  date: string;
  created_at: string;
};

function fromRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    amount: row.amount,
    type: (row.type === "income" ? "income" : "expense") as TransactionType,
    description: row.description,
    category: row.category ?? undefined,
    date: row.date,
    createdAt: row.created_at,
  };
}

type BudgetStore = {
  transactions: Transaction[];
  hydrated: boolean;
  addTransaction: (input: NewTransactionInput) => void;
  deleteTransaction: (id: string) => void;
};

const BudgetContext = createContext<BudgetStore | null>(null);

function makeId() {
  return `txn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function BudgetStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load this user's transactions from Supabase, then subscribe to row
  // changes so edits made on another device or tab show up here too.
  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTransactions([]);
      setHydrated(false);
      return;
    }

    let active = true;
    setHydrated(false);

    supabase
      .from("budget_transactions")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Failed to load transactions", error);
        } else if (data) {
          setTransactions((data as TransactionRow[]).map(fromRow));
        }
        setHydrated(true);
      });

    const channel = supabase
      .channel(`budget_transactions:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "budget_transactions",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id: string }).id;
            setTransactions((prev) => prev.filter((t) => t.id !== oldId));
            return;
          }
          const next = fromRow(payload.new as TransactionRow);
          setTransactions((prev) => {
            const idx = prev.findIndex((t) => t.id === next.id);
            if (idx === -1) return [...prev, next];
            const copy = [...prev];
            copy[idx] = next;
            return copy;
          });
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addTransaction = useCallback(
    (input: NewTransactionInput) => {
      const txn: Transaction = {
        id: makeId(),
        amount: input.amount,
        type: input.type,
        description: input.description.trim(),
        category: input.category?.trim() || undefined,
        date: input.date,
        createdAt: new Date().toISOString(),
      };
      setTransactions((prev) => [...prev, txn]);
      if (user) {
        supabase
          .from("budget_transactions")
          .insert({
            id: txn.id,
            user_id: user.id,
            amount: txn.amount,
            type: txn.type,
            description: txn.description,
            category: txn.category ?? null,
            date: txn.date,
            created_at: txn.createdAt,
          })
          .then(({ error }) => {
            if (error) console.error("Failed to save transaction", error);
          });
      }
    },
    [user],
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      if (!user) return;
      supabase
        .from("budget_transactions")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("Failed to delete transaction", error);
        });
    },
    [user],
  );

  return (
    <BudgetContext.Provider
      value={{ transactions, hydrated, addTransaction, deleteTransaction }}
    >
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) {
    throw new Error("useBudget must be used within a BudgetStoreProvider");
  }
  return ctx;
}
