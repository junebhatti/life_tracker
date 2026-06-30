import { NextRequest, NextResponse } from "next/server";
import { plaidClient, plaidConfigured } from "@/lib/plaid";
import { userIdFromRequest } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function makeId() {
  return `plaid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Exchanges Link's public_token for a permanent access_token and stores it. */
export async function POST(request: NextRequest) {
  if (!plaidConfigured()) {
    return NextResponse.json({ error: "Plaid is not configured" }, { status: 500 });
  }
  const userId = await userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { publicToken, institutionName } = await request.json();
  if (!publicToken) {
    return NextResponse.json({ error: "Missing publicToken" }, { status: 400 });
  }

  try {
    const exchange = await plaidClient().itemPublicTokenExchange({ public_token: publicToken });
    const { access_token: accessToken, item_id: itemId } = exchange.data;

    const { error } = await supabaseAdmin().from("plaid_items").insert({
      id: makeId(),
      user_id: userId,
      item_id: itemId,
      access_token: accessToken,
      institution_name: institutionName ?? null,
    });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to exchange Plaid public token", error);
    return NextResponse.json({ error: "Failed to link account" }, { status: 502 });
  }
}
