/**
 * OAuth 2.0 helpers shared by Google + Microsoft sign-in.
 *
 * Flow:
 *   1. /api/auth/[provider]/start
 *      - Generate a random `state` (CSRF protection), store in a short-lived
 *        signed cookie
 *      - Redirect user to provider's consent screen
 *   2. /api/auth/[provider]/callback
 *      - Verify state cookie matches query param
 *      - Exchange code for token
 *      - Fetch user info (email + name)
 *      - Look up / link to a User in our DB
 *      - Call createSession() to drop our normal app cookie
 *      - Redirect to /dashboard
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

const STATE_COOKIE = "cd-oauth-state";
const STATE_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production",
);

export interface OAuthProviderConfig {
  provider: "google" | "microsoft";
  authorizeUrl: string;
  tokenUrl: string;
  userinfoUrl: string;
  scopes: string;
  clientId: string | undefined;
  clientSecret: string | undefined;
  /** Optional extra body params for token exchange (Microsoft requires `scope`). */
  tokenExtraParams?: Record<string, string>;
}

export const GOOGLE_CONFIG: OAuthProviderConfig = {
  provider: "google",
  authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  userinfoUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
  scopes: "openid email profile",
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
};

// Single-tenant Azure AD app — must use the specific tenant ID, not /common.
// (The MailerCity app was registered as "Accounts in this organizational
// directory only".) Falls back to /common if MS_GRAPH_TENANT_ID isn't set so
// dev environments without the env var still build.
const MS_TENANT = process.env.MS_GRAPH_TENANT_ID || "common";

export const MICROSOFT_CONFIG: OAuthProviderConfig = {
  provider: "microsoft",
  authorizeUrl: `https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0/authorize`,
  tokenUrl: `https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0/token`,
  userinfoUrl: "https://graph.microsoft.com/oidc/userinfo",
  // Just OIDC scopes — User.Read isn't needed for the userinfo endpoint
  scopes: "openid email profile",
  clientId: process.env.MICROSOFT_CLIENT_ID ?? process.env.MS_GRAPH_CLIENT_ID,
  clientSecret:
    process.env.MICROSOFT_CLIENT_SECRET ?? process.env.MS_GRAPH_CLIENT_SECRET,
  tokenExtraParams: { scope: "openid email profile" },
};

function portalUrl(): string {
  return process.env.PORTAL_URL ?? "https://marketing.cndprinting.com";
}

export function redirectUri(provider: "google" | "microsoft"): string {
  return `${portalUrl()}/api/auth/${provider}/callback`;
}

/**
 * Set a short-lived signed cookie storing the OAuth `state` value (and
 * optional `next` redirect target). Used to defeat CSRF on the callback.
 */
export async function startState(
  provider: "google" | "microsoft",
  next?: string,
): Promise<string> {
  const state = randomBytes(16).toString("hex");
  const token = await new SignJWT({ state, provider, next: next ?? "/dashboard" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(STATE_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return state;
}

export async function consumeState(
  expectedState: string,
  expectedProvider: "google" | "microsoft",
): Promise<{ ok: boolean; next: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);
  if (!token) return { ok: false, next: "/login" };
  try {
    const { payload } = await jwtVerify(token, STATE_SECRET);
    const ok =
      payload.state === expectedState && payload.provider === expectedProvider;
    return { ok, next: (payload.next as string) || "/dashboard" };
  } catch {
    return { ok: false, next: "/login" };
  }
}

export function buildAuthorizeUrl(
  cfg: OAuthProviderConfig,
  state: string,
): string {
  if (!cfg.clientId) {
    throw new Error(`${cfg.provider} OAuth not configured (missing client id)`);
  }
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    response_type: "code",
    redirect_uri: redirectUri(cfg.provider),
    scope: cfg.scopes,
    state,
    access_type: "offline",
    prompt: "select_account",
  });
  return `${cfg.authorizeUrl}?${params}`;
}

export interface ProviderUser {
  email: string;
  name: string;
  emailVerified: boolean;
}

export async function exchangeCodeAndFetchUser(
  cfg: OAuthProviderConfig,
  code: string,
): Promise<ProviderUser> {
  if (!cfg.clientId || !cfg.clientSecret) {
    throw new Error(`${cfg.provider} OAuth not configured`);
  }

  const tokenBody = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri(cfg.provider),
    ...(cfg.tokenExtraParams ?? {}),
  });

  const tokenRes = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody.toString(),
  });
  if (!tokenRes.ok) {
    throw new Error(
      `${cfg.provider} token exchange failed (${tokenRes.status}): ${(await tokenRes.text()).slice(0, 300)}`,
    );
  }
  const tokens = (await tokenRes.json()) as { access_token: string };

  const userRes = await fetch(cfg.userinfoUrl, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) {
    throw new Error(
      `${cfg.provider} userinfo failed (${userRes.status}): ${(await userRes.text()).slice(0, 300)}`,
    );
  }
  const info = (await userRes.json()) as Record<string, unknown>;

  // Both Google and Microsoft return OIDC-shaped userinfo with these fields.
  // Microsoft's Graph /oidc/userinfo returns: sub, name, email
  // Google's v3/userinfo returns: sub, name, email, email_verified, picture
  const email = String(info.email ?? "").trim().toLowerCase();
  const name = String(info.name ?? info.given_name ?? email);
  const emailVerified =
    cfg.provider === "google"
      ? Boolean(info.email_verified)
      : true; // Microsoft doesn't expose this — assume verified by AD

  if (!email) {
    throw new Error(`${cfg.provider} returned no email — refusing sign-in`);
  }
  return { email, name, emailVerified };
}
