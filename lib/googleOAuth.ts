// Shared OAuth2 access-token refresh for single-user Google integrations
// (Calendar, Health). Each integration keeps its own refresh token in its
// own env var, since the granted scopes differ per token, but the
// refresh-token -> access-token exchange against Google's token endpoint
// is identical, so it lives here once.

const TOKEN_URL = "https://oauth2.googleapis.com/token";

type TokenResponse = { access_token: string };

export function googleOAuthClientConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth client is not configured");
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Failed to refresh Google access token (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as TokenResponse;
  return data.access_token;
}
