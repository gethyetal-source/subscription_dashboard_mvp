import type { Session } from "@supabase/supabase-js";

export const NATIVE_AUTH_SCHEME = "subtrack";
export const RECOVERY_PENDING_KEY = "subtrack.account.password-recovery.v1";
export const LOGOUT_PENDING_KEY = "subtrack.account.signed-out.v1";
export const PENDING_VERIFICATION_EMAIL_KEY = "subtrack.cloud-sync.pending-verification-email.v1";
export const FINANCIAL_CLOUD_DISABLED = "Cloud transfers are turned off. Your subscription data stays on this device.";

const callbackPaths = new Set(["oauth/callback", "password-reset", "cloud-sync"]);

export function webAuthOrigin(value: string) {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) {
    throw new Error("Use only the public origin for authentication redirects.");
  }
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) {
    throw new Error("Authentication redirects must use HTTPS outside local development.");
  }
  return url.origin;
}

export function authRedirectUrl(path: "oauth/callback" | "password-reset", origin?: string) {
  return origin ? `${webAuthOrigin(origin)}/${path}` : `${NATIVE_AUTH_SCHEME}://${path}`;
}

export function isTrustedAuthUrl(value: string, origin?: string) {
  try {
    const url = new URL(value);
    if (url.username || url.password) return false;
    if (url.protocol === `${NATIVE_AUTH_SCHEME}:`) {
      return callbackPaths.has(`${url.hostname}${url.pathname}`.replace(/^\/+|\/+$/g, ""));
    }
    return !!origin && url.origin === webAuthOrigin(origin) && callbackPaths.has(url.pathname.replace(/^\/+|\/+$/g, ""));
  } catch {
    return false;
  }
}

export function authUrlParam(value: string, name: string) {
  const url = new URL(value);
  return url.searchParams.get(name) ?? new URLSearchParams(url.hash.slice(1)).get(name);
}

export function isRecoveryAuthUrl(value: string) {
  const url = new URL(value);
  return `${url.hostname}${url.pathname}`.endsWith("password-reset") || authUrlParam(value, "type") === "recovery";
}

export function getAuthCode(value: string) {
  return authUrlParam(value, "code") || undefined;
}

export function getAuthFlowId(value: string) {
  const id = authUrlParam(value, "sb_flow_id");
  if (id && !/^[A-Za-z0-9_-]{8,64}$/.test(id)) throw new Error("This sign-in link is not valid. Start sign-in again.");
  return id || undefined;
}

export function validateAccountPassword(value: string) {
  if (value.length < 8) throw new Error("Choose a password with at least 8 characters.");
  if (value.length > 128) throw new Error("Use a password with no more than 128 characters.");
}

export function normalizedProfileName(value: string) {
  const name = value.trim().replace(/\s+/g, " ");
  if (!name || name.length > 120) throw new Error("Enter a display name between 1 and 120 characters.");
  return name;
}

export function isPublicSupabaseKey(value: string) {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(value)) return true;
  try {
    const payload = JSON.parse(atob(value.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.role === "anon";
  } catch {
    return false;
  }
}

export function offlineSession(value: string | null) {
  try {
    const session = value ? JSON.parse(value) : null;
    return session && typeof session.access_token === "string" && typeof session.refresh_token === "string"
      && typeof session.user?.id === "string" && /^[A-Za-z0-9_-]{1,200}$/.test(session.user.id)
      ? session as Session : null;
  } catch {
    return null;
  }
}
