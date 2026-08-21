import { describe, expect, it } from "vitest";

import { getAuthCallbackMessage, getCloudAuthErrorMessage, getSessionTokensFromAuthUrl } from "../lib/cloud-sync-auth-utils";

describe("cloud account callback and error guidance", () => {
  it("reads Supabase session tokens from an email-link fragment", () => {
    expect(getSessionTokensFromAuthUrl("subtrack://cloud-sync#access_token=access-value&refresh_token=refresh-value&type=signup")).toEqual({
      accessToken: "access-value",
      refreshToken: "refresh-value",
    });
  });

  it("reads callback failures from the query string", () => {
    expect(getAuthCallbackMessage("https://subtrackdash-k768wbpy.manus.space/cloud-sync?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired")).toContain("expired");
  });

  it("maps expected authentication failures to actionable language", () => {
    expect(getCloudAuthErrorMessage({ code: "email_not_confirmed" })).toContain("Confirm your email");
    expect(getCloudAuthErrorMessage({ code: "over_email_send_rate_limit" })).toContain("could not send another email");
    expect(getCloudAuthErrorMessage({ message: "Invalid login credentials" })).toContain("did not match");
  });
});
