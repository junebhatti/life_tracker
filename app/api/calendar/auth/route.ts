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

  const redirectUri = new URL("/api/calendar/callback", request.url).toString();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: SCOPE,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  );
}
