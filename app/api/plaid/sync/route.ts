import { NextRequest, NextResponse } from "next/server";
import { plaidClient, plaidConfigured, prettifyPlaidCategory } from "@/lib/plaid";
import { userIdFromRequest } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Pulls new/changed transactions for every bank item the user has linked. */
export async function POST(request: NextRequest) {
  if (!plaidConfigured()) {
    return NextResponse.json({ error: "Plaid is not configured" }, { status: 500 });
  }
  const userId = await userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: items, error: itemsError } = await admin
    .from("plaid_items")
    .select("id, item_id, access_token, cursor")
    .eq("user_id", userId);
  if (itemsError) {
    console.error("Failed to load Plaid items", itemsError);
    return NextResponse.json({ error: "Failed to load linked accounts" }, { status: 500 });
  }
  if (!items || items.length === 0) {
    return NextResponse.json({ error: "No linked bank account" }, { status: 400 });
  }

  let added = 0;
  let modified = 0;
  let removed = 0;

  try {
    for (const item of items) {
      let cursor: string | undefined = item.cursor ?? undefined;
      let hasMore = true;

      while (hasMore) {
        const res = await plaidClient().transactionsSync({
          access_token: item.access_token,
          cursor,
        });
        const { added: newTxns, modified: changedTxns, removed: removedTxns, next_cursor, has_more } =
          res.data;

        for (const t of [...newTxns, ...changedTxns]) {
          const category = t.personal_finance_category?.primary
            ? prettifyPlaidCategory(t.personal_finance_category.primary)
            : null;
          const { error } = await admin.from("budget_transactions").upsert(
            {
              id: `txn_plaid_${t.transaction_id}`,
              user_id: userId,
              external_id: t.transaction_id,
              amount: Math.abs(t.amount),
              type: t.amount >= 0 ? "expense" : "income",
              description: t.merchant_name ?? t.name,
              category,
              date: t.date,
            },
            { onConflict: "user_id,external_id" },
          );
          if (error) throw error;
        }
        added += newTxns.length;
        modified += changedTxns.length;

        if (removedTxns.length > 0) {
          const { error } = await admin
            .from("budget_transactions")
            .delete()
            .eq("user_id", userId)
            .in(
              "external_id",
              removedTxns.map((t) => t.transaction_id),
            );
          if (error) throw error;
          removed += removedTxns.length;
        }

        cursor = next_cursor;
        hasMore = has_more;
      }

      const { error: cursorError } = await admin
        .from("plaid_items")
        .update({ cursor })
        .eq("id", item.id);
      if (cursorError) throw cursorError;
    }

    return NextResponse.json({ added, modified, removed });
  } catch (error) {
    console.error("Failed to sync Plaid transactions", error);
    return NextResponse.json({ error: "Failed to sync transactions" }, { status: 502 });
  }
}
