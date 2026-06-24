import { NextRequest } from "next/server";

type TokenResponse = {
  refresh_token?: string;
  error?: string;
  error_description?: string;
};

function htmlResponse(message: string, token?: string) {
  const body = `<!doctype html>
<html>
  <body style="font-family: system-ui, sans-serif; max-width: 640px; margin: 80px auto; color: #111; line-height: 1.5;">
    <h1 style="font-size: 18px;">Google Calendar</h1>
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

/** Exchanges the one-time auth code for a refresh token to store as GOOGLE_REFRESH_TOKEN. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError) {
    return htmlResponse(`Google declined the request: ${oauthError}`);
  }
  if (!code) {
    return htmlResponse("Missing authorization code.");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return htmlResponse(
      "Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables.",
    );
  }

  const redirectUri = new URL("/api/calendar/callback", request.url).toString();

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = (await tokenRes.json()) as TokenResponse;

  if (!tokenRes.ok) {
    return htmlResponse(
      `Token exchange failed: ${tokenData.error_description || tokenData.error || tokenRes.status}`,
    );
  }

  if (!tokenData.refresh_token) {
    return htmlResponse(
      "Google didn't return a refresh token. This happens if you've already granted access before " +
        "— revoke this app's access at https://myaccount.google.com/permissions, then try again so Google issues a fresh one.",
    );
  }

  return htmlResponse(
    "Connected. Copy this value into the <strong>GOOGLE_REFRESH_TOKEN</strong> environment variable " +
      "in your Vercel project settings, then redeploy:",
    tokenData.refresh_token,
  );
}
