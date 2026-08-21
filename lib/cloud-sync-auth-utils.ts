type CloudAuthErrorLike = {
  code?: unknown;
  message?: unknown;
};

function asText(value: unknown) {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function authParams(url: string) {
  const query = url.split("?")[1]?.split("#")[0] ?? "";
  const fragment = url.split("#")[1] ?? "";
  return [new URLSearchParams(fragment), new URLSearchParams(query)];
}

function firstParam(url: string, name: string) {
  return authParams(url).map((params) => params.get(name)).find(Boolean) ?? null;
}

export function getSessionTokensFromAuthUrl(url: string) {
  const accessToken = firstParam(url, "access_token");
  const refreshToken = firstParam(url, "refresh_token");
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}

export function getCloudAuthErrorMessage(error: unknown) {
  const candidate = (error ?? {}) as CloudAuthErrorLike;
  const code = asText(candidate.code);
  const message = asText(candidate.message);
  const combined = `${code} ${message}`;

  if (combined.includes("over_email_send_rate_limit") || combined.includes("email rate limit")) {
    return "We could not send another email yet. Please wait a few minutes, then try again.";
  }
  if (combined.includes("email_not_confirmed") || combined.includes("email not confirmed")) {
    return "Confirm your email before signing in. Check your inbox, including spam, or resend the verification email.";
  }
  if (combined.includes("invalid_credentials") || combined.includes("invalid login credentials")) {
    return "That email or password did not match. If you just created an account, confirm your email first.";
  }
  if (combined.includes("user_already_exists") || combined.includes("already registered")) {
    return "An account already exists for this email. Sign in or use password recovery instead.";
  }
  if (combined.includes("otp_expired") || combined.includes("expired")) {
    return "This email link has expired. Request a fresh verification or password-reset email and open the newest link.";
  }
  if (combined.includes("email_address_invalid") || combined.includes("invalid email")) {
    return "Enter a valid email address, then try again.";
  }
  return "We could not complete that account action. Check your connection and try again.";
}

export function getAuthCallbackMessage(url: string) {
  const code = firstParam(url, "error_code") ?? firstParam(url, "error");
  if (!code) return undefined;
  return getCloudAuthErrorMessage({ code, message: firstParam(url, "error_description") ?? undefined });
}
