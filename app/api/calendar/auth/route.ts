import { NextRequest, NextResponse } from "next/server";

const SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

/** Kicks off the one-time consent flow that mints a refresh token. */
export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return new Response("Missing GOOGLE_CLIENT_ID environment variable.", {
      status: 500,
    });
  }

  // Visit with ?account=2 to mint a token for a second Google account
  // instead of overwriting the first; the callback echoes this back via
  // `state` so it knows which GOOGLE_REFRESH_TOKEN(_2) to ask you to set.
  const account = request.nextUrl.searchParams.get("account") === "2" ? "2" : "1";
  const redirectUri = new URL("/api/calendar/callback", request.url).toString();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: SCOPE,
    state: account,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  );
}
