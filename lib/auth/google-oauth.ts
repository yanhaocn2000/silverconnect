import "server-only";
import { Google } from "arctic";

/**
 * Google OAuth client.
 *
 * Returns null when credentials are unset (typical local dev) so callers
 * can render a graceful "not configured" page instead of crashing.
 *
 * Required env:
 *   GOOGLE_CLIENT_ID      — from Google Cloud Console → APIs & Services → Credentials
 *   GOOGLE_CLIENT_SECRET  — same place
 *   GOOGLE_REDIRECT_URI   — must match an Authorized redirect URI in Google Console
 *                           exactly. Use the locale-agnostic API route so a single
 *                           registered URI works for every locale:
 *                             dev   http://localhost:3000/api/auth/google/callback
 *                             prod  https://silverconnect.xinxinsoft.org/api/auth/google/callback
 */
let cached: Google | null | undefined;

export function getGoogleClient(): Google | null {
  if (cached !== undefined) return cached;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    cached = null;
    return null;
  }
  cached = new Google(clientId, clientSecret, redirectUri);
  return cached;
}

export const GOOGLE_OAUTH_SCOPES = ["openid", "profile", "email"];
