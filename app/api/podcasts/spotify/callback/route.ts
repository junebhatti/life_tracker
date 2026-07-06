import { NextRequest } from "next/server";

type TokenResponse = { refresh_token?: string; error?: string; error_description?: string };

function htmlResponse(message: string, token?: string) {
  const body = `<!doctype html>
<html>
  <body style="font-family: system-ui, sans-serif; max-width: 640px; margin: 80px auto; color: #111; line-height: 1.5;">
    <h1 style="font-size: 18px;">Spotify</h1>
    <p>${message}</p>
    ${
      token
        ? `<pre style="background:#f4f4f4; padding:16px; border-radius:8px; white-space:pre-wrap; word-break:break-all;">${token}</pre>`
        : ""
    }
  </body>
</html>`;
  return new Response(body, { headers: { "Content-Type": "text/html" } });
}

/** Exchanges the one-time auth code for a refresh token to store as SPOTIFY_REFRESH_TOKEN. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError) {
    return htmlResponse(`Spotify declined the request: ${oauthError}`);
  }
  if (!code) {
    return htmlResponse("Missing authorization code.");
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return htmlResponse("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET environment variables.");
  }

  const redirectUri = new URL("/api/podcasts/spotify/callback", request.url).toString();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = (await tokenRes.json()) as TokenResponse;

  if (!tokenRes.ok) {
    return htmlResponse(
      `Token exchange failed: ${tokenData.error_description || tokenData.error || tokenRes.status}`,
    );
  }

  if (!tokenData.refresh_token) {
    return htmlResponse("Spotify didn't return a refresh token. Try again.");
  }

  return htmlResponse(
    "Connected. Copy this value into the <strong>SPOTIFY_REFRESH_TOKEN</strong> environment variable " +
      "in your Vercel project settings, then redeploy:",
    tokenData.refresh_token,
  );
}
