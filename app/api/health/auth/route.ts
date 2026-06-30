import { NextRequest, NextResponse } from "next/server";

// Restricted scopes (require Google's CASA review for >100-user / public
// apps — exempt here since this is single-user). Steps, sleep, and resting
// heart rate respectively.
const SCOPES = [
  "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
  "https://www.googleapis.com/auth/googlehealth.sleep.readonly",
  "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly",
].join(" ");

/** Kicks off the one-time consent flow that mints a refresh token. */
export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return new Response("Missing GOOGLE_CLIENT_ID environment variable.", {
      status: 500,
    });
  }

  const redirectUri = new URL("/api/health/callback", request.url).toString();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  );
}
