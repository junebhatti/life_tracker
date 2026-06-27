// Server-only Plaid client. Never import this from a "use client" component —
// PLAID_CLIENT_ID/PLAID_SECRET must stay server-side. See app/api/plaid/*
// routes for the link → exchange → sync flow, and lib/supabaseAdmin.ts for
// where the resulting access token is stored.

import { Configuration, CountryCode, PlaidApi, PlaidEnvironments, Products } from "plaid";

export function plaidConfigured(): boolean {
  return Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
}

let client: PlaidApi | null = null;

export function plaidClient(): PlaidApi {
  if (client) return client;
  const env = process.env.PLAID_ENV === "production" ? "production" : "sandbox";
  client = new PlaidApi(
    new Configuration({
      basePath: PlaidEnvironments[env],
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
          "PLAID-SECRET": process.env.PLAID_SECRET,
        },
      },
    }),
  );
  return client;
}

export const PLAID_PRODUCTS = [Products.Transactions];
export const PLAID_COUNTRY_CODES = [CountryCode.Us];

/** "FOOD_AND_DRINK" -> "Food And Drink" */
export function prettifyPlaidCategory(raw: string): string {
  return raw
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
