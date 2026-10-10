import { describe, expect, it } from "vitest";
import { authRedirectUrl, getAuthCode, getAuthFlowId, isPublicSupabaseKey, isRecoveryAuthUrl, isTrustedAuthUrl, normalizedProfileName, offlineSession, validateAccountPassword, webAuthOrigin } from "../lib/account-utils";

describe("account redirect safety", () => {
  it("uses stable native callbacks and exact web origins", () => {
    expect(authRedirectUrl("oauth/callback")).toBe("subtrack://oauth/callback");
    expect(authRedirectUrl("password-reset")).toBe("subtrack://password-reset");
    expect(authRedirectUrl("oauth/callback", "http://localhost:8081/")).toBe("http://localhost:8081/oauth/callback");
    expect(authRedirectUrl("oauth/callback", "https://app.example.test")).toBe("https://app.example.test/oauth/callback");
  });
  it.each(["http://app.example.test", "https://user:pass@app.example.test", "https://app.example.test/path", "https://app.example.test/?token=x", "https://app.example.test/#x"])("rejects unsafe web redirect origins: %s", (origin) => {
    expect(() => webAuthOrigin(origin)).toThrow();
  });
  it("accepts only auth paths on the configured origin or native scheme", () => {
    expect(isTrustedAuthUrl("subtrack://oauth/callback?code=test")).toBe(true);
    expect(isTrustedAuthUrl("subtrack://password-reset#access_token=test")).toBe(true);
    expect(isTrustedAuthUrl("subtrack://subscription/private?code=test")).toBe(false);
    expect(isTrustedAuthUrl("otherapp://oauth/callback?code=test")).toBe(false);
    expect(isTrustedAuthUrl("https://evil.test/oauth/callback?code=test", "https://app.example.test")).toBe(false);
    expect(isTrustedAuthUrl("https://app.example.test/privacy-policy?code=test", "https://app.example.test")).toBe(false);
    expect(isTrustedAuthUrl("https://app.example.test/oauth/callback?code=test", "https://app.example.test")).toBe(true);
    expect(isTrustedAuthUrl("https://user:pass@app.example.test/oauth/callback", "https://app.example.test")).toBe(false);
  });
  it("reads PKCE codes, validates flow IDs, and detects password recovery", () => {
    const url = "subtrack://oauth/callback?code=one-time-test&sb_flow_id=flow_12345678";
    expect(getAuthCode(url)).toBe("one-time-test");
    expect(getAuthFlowId(url)).toBe("flow_12345678");
    expect(getAuthFlowId("subtrack://oauth/callback?code=test")).toBeUndefined();
    expect(() => getAuthFlowId("subtrack://oauth/callback?sb_flow_id=bad")).toThrow();
    expect(isRecoveryAuthUrl("subtrack://password-reset?code=test")).toBe(true);
    expect(isRecoveryAuthUrl("https://app.example.test/oauth/callback#type=recovery")).toBe(true);
    expect(isRecoveryAuthUrl(url)).toBe(false);
  });
});

describe("account-only inputs", () => {
  it("validates passwords and limits display names", () => {
    expect(() => validateAccountPassword("short")).toThrow("8 characters");
    expect(() => validateAccountPassword("x".repeat(129))).toThrow("128");
    expect(() => validateAccountPassword("long-test-password")).not.toThrow();
    expect(normalizedProfileName("  Test   Account  ")).toBe("Test Account");
    expect(() => normalizedProfileName("")).toThrow();
    expect(() => normalizedProfileName("x".repeat(121))).toThrow();
  });
  it("accepts only publishable or legacy anon keys, never elevated keys", () => {
    const legacy = (role: string) => `header.${btoa(JSON.stringify({ role }))}.signature`;
    expect(isPublicSupabaseKey("sb_publishable_test_only")).toBe(true);
    expect(isPublicSupabaseKey(legacy("anon"))).toBe(true);
    expect(isPublicSupabaseKey("sb_secret_not_a_real_key")).toBe(false);
    expect(isPublicSupabaseKey(legacy("service_role"))).toBe(false);
    expect(isPublicSupabaseKey("invalid")).toBe(false);
  });
  it("uses an existing valid local session only, not a bare account marker", () => {
    expect(offlineSession(null)).toBeNull();
    expect(offlineSession("{broken")).toBeNull();
    expect(offlineSession(JSON.stringify({ user: { id: "test" } }))).toBeNull();
    expect(offlineSession(JSON.stringify({ user: { id: "../other" }, access_token: "test", refresh_token: "test" }))).toBeNull();
    expect(offlineSession(JSON.stringify({ user: { id: "test-account" }, access_token: "test-access", refresh_token: "test-refresh" }))?.user.id).toBe("test-account");
  });
});
