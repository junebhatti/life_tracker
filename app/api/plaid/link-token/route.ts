import { NextRequest, NextResponse } from "next/server";
import { PLAID_COUNTRY_CODES, PLAID_PRODUCTS, plaidClient, plaidConfigured } from "@/lib/plaid";
import { userIdFromRequest } from "@/lib/serverAuth";

/** Mints a Link token so the client can open Plaid's hosted bank-login widget. */
export async function POST(request: NextRequest) {
  if (!plaidConfigured()) {
    return NextResponse.json({ error: "Plaid is not configured" }, { status: 500 });
  }
  const userId = await userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const res = await plaidClient().linkTokenCreate({
      user: { client_user_id: userId },
      client_name: "Life Tracker",
      products: PLAID_PRODUCTS,
      country_codes: PLAID_COUNTRY_CODES,
      language: "en",
    });
    return NextResponse.json({ linkToken: res.data.link_token });
  } catch (error) {
    console.error("Failed to create Plaid link token", error);
    return NextResponse.json({ error: "Failed to create link token" }, { status: 502 });
  }
}
