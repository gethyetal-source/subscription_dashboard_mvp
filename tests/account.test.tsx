import type { Session } from "@supabase/supabase-js";
import { act } from "react";
import { create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountProvider, useAccount, type AccountValue } from "../lib/account";
import { LOGOUT_PENDING_KEY, PENDING_VERIFICATION_EMAIL_KEY, RECOVERY_PENDING_KEY } from "../lib/account-utils";

const mocks = vi.hoisted(() => ({
  values: new Map<string, string>(),
  storedSession: null as Session | null,
  callbacks: new Set<(event: string, session: Session | null) => void>(),
  auth: {
    getSession: vi.fn(), onAuthStateChange: vi.fn(), signInWithPassword: vi.fn(), signUp: vi.fn(),
    signInWithOAuth: vi.fn(), exchangeCodeForSession: vi.fn(), setSession: vi.fn(), resend: vi.fn(),
    resetPasswordForEmail: vi.fn(), updateUser: vi.fn(), signOut: vi.fn(), startAutoRefresh: vi.fn(), stopAutoRefresh: vi.fn(),
  },
  functions: { invoke: vi.fn() }, rpc: vi.fn(), from: vi.fn(),
  getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn(),
  initialUrl: vi.fn(), linkListener: vi.fn(), appState: vi.fn(),
  openBrowser: vi.fn(), completeBrowser: vi.fn(), platform: { OS: "android" },
}));

vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: mocks.getItem, setItem: mocks.setItem, removeItem: mocks.removeItem } }));
vi.mock("../lib/supabase", () => ({
  isSupabaseConfigured: true, supabaseSessionStorageKey: "sb-test-auth-token",
  supabase: { auth: mocks.auth, functions: mocks.functions, rpc: mocks.rpc, from: mocks.from },
}));
vi.mock("expo-linking", () => ({ getInitialURL: mocks.initialUrl, addEventListener: mocks.linkListener }));
vi.mock("expo-web-browser", () => ({ openAuthSessionAsync: mocks.openBrowser, maybeCompleteAuthSession: mocks.completeBrowser }));
vi.mock("react-native", () => ({ Platform: mocks.platform, AppState: { addEventListener: mocks.appState } }));

const testSession = (id = "account-one"): Session => ({
  access_token: "test-access-not-a-real-token", refresh_token: "test-refresh-not-a-real-token", token_type: "bearer", expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id, email: `${id}@example.test`, app_metadata: {}, user_metadata: { full_name: "Test Account" }, aud: "authenticated", created_at: "2026-01-01T00:00:00Z" },
});
function emit(event: string, session: Session | null) {
  mocks.callbacks.forEach((callback) => callback(event, session));
}
let current: AccountValue;
let renderer: ReactTestRenderer | undefined;
function Probe() { current = useAccount(); return null; }
async function mount() {
  await act(async () => { renderer = create(<AccountProvider><Probe /></AccountProvider>); });
}
async function unmount() {
  if (renderer) await act(async () => renderer!.unmount());
  renderer = undefined;
}

beforeEach(() => {
  vi.stubEnv("EXPO_PUBLIC_AUTH_REDIRECT_ORIGIN", "");
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const report = console.error;
  vi.spyOn(console, "error").mockImplementation((...args) => {
    if (!String(args[0]).startsWith("react-test-renderer is deprecated")) report(...args);
  });
  mocks.values.clear(); mocks.callbacks.clear(); mocks.storedSession = null; mocks.platform.OS = "android";
  Object.values(mocks.auth).forEach((method) => method.mockReset());
  mocks.from.mockReset(); mocks.rpc.mockReset(); mocks.functions.invoke.mockReset();
  mocks.getItem.mockReset().mockImplementation(async (key: string) => mocks.values.get(key) ?? null);
  mocks.setItem.mockReset().mockImplementation(async (key: string, value: string) => { mocks.values.set(key, value); });
  mocks.removeItem.mockReset().mockImplementation(async (key: string) => { mocks.values.delete(key); });
  mocks.auth.getSession.mockImplementation(async () => ({ data: { session: mocks.storedSession }, error: null }));
  mocks.auth.onAuthStateChange.mockImplementation((callback: (event: string, session: Session | null) => void) => {
    mocks.callbacks.add(callback);
    return { data: { subscription: { unsubscribe: () => mocks.callbacks.delete(callback) } } };
  });
  mocks.auth.startAutoRefresh.mockResolvedValue(undefined);
  mocks.auth.stopAutoRefresh.mockResolvedValue(undefined);
  mocks.auth.signOut.mockImplementation(async () => { mocks.storedSession = null; emit("SIGNED_OUT", null); return { error: null }; });
  mocks.auth.signInWithPassword.mockImplementation(async () => {
    mocks.storedSession = testSession(); emit("SIGNED_IN", mocks.storedSession);
    return { data: { session: mocks.storedSession }, error: null };
  });
  mocks.auth.signUp.mockResolvedValue({ data: { session: null, user: null }, error: null });
  mocks.auth.signInWithOAuth.mockResolvedValue({ data: { url: "https://auth.example.test/authorize?provider=google" }, error: null });
  mocks.auth.exchangeCodeForSession.mockImplementation(async () => {
    mocks.storedSession = testSession(); emit("SIGNED_IN", mocks.storedSession);
    return { data: { session: mocks.storedSession, redirectType: null }, error: null };
  });
  mocks.auth.setSession.mockResolvedValue({ data: { session: testSession() }, error: null });
  mocks.auth.resend.mockResolvedValue({ error: null });
  mocks.auth.resetPasswordForEmail.mockResolvedValue({ error: null });
  mocks.auth.updateUser.mockResolvedValue({ data: { user: testSession().user }, error: null });
  mocks.initialUrl.mockReset().mockResolvedValue(null);
  mocks.linkListener.mockReset().mockReturnValue({ remove: vi.fn() });
  mocks.appState.mockReset().mockReturnValue({ remove: vi.fn() });
  mocks.openBrowser.mockReset().mockResolvedValue({ type: "success", url: "subtrack://oauth/callback?code=test-code&sb_flow_id=flow_12345678" });
});

afterEach(async () => { await unmount(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("remembered account sessions", () => {
  it("requires sign-in with no saved session", async () => {
    await mount();
    expect(current.isLoading).toBe(false);
    expect(current.isSignedIn).toBe(false);
    expect(current.canAccessApp).toBe(false);
  });
  it("restores a saved session on every fresh mount without prompting for credentials", async () => {
    mocks.storedSession = testSession();
    for (let launch = 0; launch < 2; launch++) {
      await mount();
      expect(current.canAccessApp).toBe(true);
      expect(current.accountId).toBe("account-one");
      await unmount();
    }
    expect(mocks.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(mocks.auth.signInWithOAuth).not.toHaveBeenCalled();
  });
  it("remembers email login and locks the app again only after logout", async () => {
    await mount();
    await act(async () => { await current.signIn("  ACCOUNT-ONE@EXAMPLE.TEST  ", "test-password"); });
    expect(mocks.auth.signInWithPassword).toHaveBeenCalledWith({ email: "account-one@example.test", password: "test-password" });
    expect(current.canAccessApp).toBe(true);
    await unmount(); await mount();
    expect(current.canAccessApp).toBe(true);
    await act(async () => { await current.signOut(); });
    expect(current.canAccessApp).toBe(false);
    expect(mocks.values.get(LOGOUT_PENDING_KEY)).toBe("true");
    expect(mocks.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    await unmount(); await mount();
    expect(current.canAccessApp).toBe(false);
  });
  it("honors explicit logout after restart even if remote revocation failed", async () => {
    mocks.storedSession = testSession();
    await mount();
    mocks.auth.signOut.mockResolvedValue({ error: { message: "Network unavailable" } });
    await act(async () => { await expect(current.signOut()).rejects.toThrow("signed out on this device"); });
    expect(current.canAccessApp).toBe(false);
    await unmount(); await mount();
    expect(current.canAccessApp).toBe(false);
  });
  it("uses the saved local session offline without pretending server actions succeeded", async () => {
    mocks.values.set("sb-test-auth-token", JSON.stringify(testSession()));
    mocks.auth.getSession.mockResolvedValue({ data: { session: null }, error: { name: "AuthRetryableFetchError" } });
    await mount();
    expect(current.canAccessApp).toBe(true);
    expect(mocks.auth.signInWithPassword).not.toHaveBeenCalled();
  });
  it("does not reuse a saved session when refresh credentials have been rejected", async () => {
    mocks.values.set("sb-test-auth-token", JSON.stringify(testSession()));
    mocks.auth.getSession.mockResolvedValue({ data: { session: null }, error: { name: "AuthApiError", code: "refresh_token_not_found" } });
    await mount();
    expect(current.canAccessApp).toBe(false);
    expect(current.initializationError).toContain("retry");
  });
  it("handles session-storage failure without opening the financial screens", async () => {
    mocks.getItem.mockRejectedValue(new Error("Storage unavailable"));
    await mount();
    expect(current.isLoading).toBe(false);
    expect(current.canAccessApp).toBe(false);
    expect(current.initializationError).toBeDefined();
  });
  it("refreshes tokens on native foreground changes and cleans up listeners", async () => {
    mocks.storedSession = testSession();
    await mount();
    const listener = mocks.appState.mock.calls[0][1];
    listener("background");
    expect(mocks.auth.stopAutoRefresh).toHaveBeenCalled();
    listener("active");
    expect(mocks.auth.startAutoRefresh).toHaveBeenCalledTimes(2);
    await unmount();
    expect(mocks.callbacks.size).toBe(0);
  });
  it("restarts native refresh after the user logs out and then signs back in", async () => {
    mocks.storedSession = testSession();
    await mount();
    await act(async () => { await current.signOut(); });
    mocks.auth.startAutoRefresh.mockClear();
    await act(async () => { await current.signIn("test@example.test", "test-password"); });
    expect(mocks.auth.startAutoRefresh).toHaveBeenCalledTimes(1);
    expect(current.canAccessApp).toBe(true);
  });
});

describe("Google PKCE authentication", () => {
  it("opens Google consent and exchanges the trusted callback exactly once", async () => {
    await mount();
    await act(async () => { await current.signInWithGoogle(); });
    expect(mocks.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google", options: { redirectTo: "subtrack://oauth/callback", skipBrowserRedirect: true, queryParams: { prompt: "select_account" } },
    });
    expect(mocks.openBrowser).toHaveBeenCalledWith("https://auth.example.test/authorize?provider=google", "subtrack://oauth/callback");
    expect(mocks.auth.exchangeCodeForSession).toHaveBeenCalledWith("test-code", { flowId: "flow_12345678" });
    expect(current.canAccessApp).toBe(true);
    await act(async () => { await current.completeAuthUrl("subtrack://oauth/callback?code=test-code&sb_flow_id=flow_12345678"); });
    expect(mocks.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
  });
  it("handles cancellation without creating or replacing an account", async () => {
    mocks.openBrowser.mockResolvedValue({ type: "cancel" });
    await mount();
    await act(async () => { await expect(current.signInWithGoogle()).rejects.toThrow("cancelled"); });
    expect(current.canAccessApp).toBe(false);
    expect(mocks.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
  it("explains an unconfigured Google provider without exposing backend details", async () => {
    mocks.auth.signInWithOAuth.mockResolvedValue({ data: { url: null }, error: { message: "Unsupported provider: provider is not enabled" } });
    await mount();
    await act(async () => { await expect(current.signInWithGoogle()).rejects.toThrow("Google sign-in is not available"); });
    expect(mocks.openBrowser).not.toHaveBeenCalled();
  });
  it("rejects foreign schemes and unrelated routes before exchanging credentials", async () => {
    await mount();
    await act(async () => {
      expect(await current.completeAuthUrl("other://oauth/callback?code=test")).toBe(false);
      expect(await current.completeAuthUrl("subtrack://subscription/secret?code=test")).toBe(false);
      expect(await current.completeAuthUrl("https://evil.test/oauth/callback?code=test")).toBe(false);
    });
    expect(mocks.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(mocks.auth.setSession).not.toHaveBeenCalled();
  });
  it("rejects unsolicited implicit session tokens even on the correct callback path", async () => {
    await mount();
    await act(async () => {
      expect(await current.completeAuthUrl("subtrack://oauth/callback#access_token=test-access&refresh_token=test-refresh")).toBe(false);
    });
    expect(mocks.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(mocks.auth.setSession).not.toHaveBeenCalled();
    expect(current.canAccessApp).toBe(false);
  });
  it("deduplicates simultaneous browser-result and deep-link code callbacks", async () => {
    await mount();
    await act(async () => {
      await Promise.all([current.completeAuthUrl("subtrack://oauth/callback?code=shared-test"), current.completeAuthUrl("subtrack://oauth/callback?code=shared-test")]);
    });
    expect(mocks.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
  });
  it("never reopens a session from a callback that completes after explicit logout", async () => {
    mocks.storedSession = testSession();
    await mount();
    let exchange!: (result: unknown) => void;
    mocks.auth.exchangeCodeForSession.mockReturnValue(new Promise((resolve) => { exchange = resolve; }));
    let callback!: Promise<boolean>;
    await act(async () => { callback = current.completeAuthUrl("subtrack://oauth/callback?code=delayed-test"); });
    await act(async () => { await current.signOut(); });
    await act(async () => { exchange({ data: { session: testSession(), redirectType: null }, error: null }); await callback; });
    expect(current.canAccessApp).toBe(false);
    expect(mocks.values.get(LOGOUT_PENDING_KEY)).toBe("true");
  });
  it("shows callback failures without echoing error descriptions or credentials", async () => {
    await mount();
    await act(async () => { await current.completeAuthUrl("subtrack://oauth/callback?error=access_denied&error_description=private-value"); });
    expect(current.authCallbackMessage).toContain("cancelled");
    expect(current.authCallbackMessage).not.toContain("private-value");
    expect(mocks.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
  it("redirects web Google sign-in in the same browser without opening a native session", async () => {
    mocks.platform.OS = "web";
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { origin: "http://localhost:8081", href: "http://localhost:8081/login", assign }, history: { replaceState: vi.fn() } });
    await mount();
    await act(async () => { await current.signInWithGoogle(); });
    expect(mocks.auth.signInWithOAuth.mock.calls[0][0].options.redirectTo).toBe("http://localhost:8081/oauth/callback");
    expect(assign).toHaveBeenCalledWith("https://auth.example.test/authorize?provider=google");
    expect(mocks.openBrowser).not.toHaveBeenCalled();
    expect(mocks.auth.startAutoRefresh).not.toHaveBeenCalled();
  });
  it("exchanges a web callback once and clears credentials from its history entry", async () => {
    mocks.platform.OS = "web";
    const replaceState = vi.fn();
    const url = "http://localhost:8081/oauth/callback?code=web-test";
    vi.stubGlobal("window", { location: { origin: "http://localhost:8081", href: url }, history: { replaceState } });
    await mount();
    expect(current.canAccessApp).toBe(true);
    expect(mocks.auth.exchangeCodeForSession).toHaveBeenCalledWith("web-test", undefined);
    expect(replaceState).toHaveBeenCalledWith(null, "", "/oauth/callback");
    await act(async () => { await current.completeAuthUrl(url); });
    expect(mocks.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
  });
  it("does not send a code when a callback carries an invalid flow identifier", async () => {
    await mount();
    await act(async () => { expect(await current.completeAuthUrl("subtrack://oauth/callback?code=test&sb_flow_id=bad")).toBe(false); });
    expect(mocks.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(current.canAccessApp).toBe(false);
  });
  it("preserves a fresh Google verifier when returning after a previous explicit logout", async () => {
    mocks.values.set(LOGOUT_PENDING_KEY, "true");
    mocks.initialUrl.mockResolvedValue("subtrack://oauth/callback?code=fresh-login-after-logout&sb_flow_id=flow_12345678");
    await mount();
    expect(mocks.auth.signOut).not.toHaveBeenCalled();
    expect(mocks.auth.exchangeCodeForSession).toHaveBeenCalledWith("fresh-login-after-logout", { flowId: "flow_12345678" });
    expect(current.canAccessApp).toBe(true);
    expect(mocks.values.has(LOGOUT_PENDING_KEY)).toBe(false);
  });
});

describe("email signup, profile, and password recovery", () => {
  it("sends only signup account details and keeps the app locked pending confirmation", async () => {
    await mount();
    await act(async () => { expect(await current.signUp("Test@Example.test", "test-password", " Test  Account ")).toBe(true); });
    expect(mocks.auth.signUp).toHaveBeenCalledWith({
      email: "test@example.test", password: "test-password",
      options: { emailRedirectTo: "subtrack://oauth/callback", data: { full_name: "Test Account" } },
    });
    expect(current.canAccessApp).toBe(false);
    expect(mocks.values.get(PENDING_VERIFICATION_EMAIL_KEY)).toBe("test@example.test");
    await act(async () => { await current.resendVerification(); });
    expect(mocks.auth.resend).toHaveBeenCalledWith({ type: "signup", email: "test@example.test", options: { emailRedirectTo: "subtrack://oauth/callback" } });
  });
  it("supports immediate email sessions when the provider permits them", async () => {
    mocks.auth.signUp.mockResolvedValue({ data: { session: testSession() }, error: null });
    await mount();
    await act(async () => { expect(await current.signUp("test@example.test", "test-password")).toBe(false); });
    expect(current.canAccessApp).toBe(true);
  });
  it("keeps recovery sessions out of subscription screens until a new password is saved", async () => {
    await mount();
    await act(async () => { await current.completeAuthUrl("subtrack://password-reset?code=recovery-test"); });
    expect(current.isSignedIn).toBe(true);
    expect(current.recoveryRequired).toBe(true);
    expect(current.canAccessApp).toBe(false);
    await unmount(); await mount();
    expect(current.canAccessApp).toBe(false);
    await act(async () => { await current.updatePassword("new-test-password"); });
    expect(mocks.auth.updateUser).toHaveBeenCalledWith({ password: "new-test-password" });
    expect(current.canAccessApp).toBe(true);
    expect(mocks.values.get(RECOVERY_PENDING_KEY)).toBe("false");
  });
  it("requests recovery using an account email and safe callback", async () => {
    await mount();
    await act(async () => { await current.requestPasswordReset(" TEST@example.test "); });
    expect(mocks.auth.resetPasswordForEmail).toHaveBeenCalledWith("test@example.test", { redirectTo: "subtrack://password-reset" });
  });
  it("updates only display-name metadata, never a financial snapshot", async () => {
    mocks.storedSession = testSession();
    await mount();
    await act(async () => { await current.updateProfile(" New  Name "); });
    expect(mocks.auth.updateUser).toHaveBeenCalledWith({ data: { full_name: "New Name" } });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects invalid account inputs before any network request", async () => {
    await mount();
    await act(async () => {
      await expect(current.signUp("not-email", "test-password")).rejects.toThrow("valid email");
      await expect(current.signUp("test@example.test", "short")).rejects.toThrow("8 characters");
      await expect(current.updatePassword("test-password")).rejects.toThrow("sign in");
    });
    expect(mocks.auth.signUp).not.toHaveBeenCalled();
    expect(mocks.auth.updateUser).not.toHaveBeenCalled();
  });
  it("deletes only the authenticated account through the existing protected function", async () => {
    mocks.storedSession = testSession();
    mocks.functions.invoke.mockResolvedValue({ data: { deleted: true }, error: null });
    await mount();
    await act(async () => { await current.deleteAccount(); });
    expect(mocks.functions.invoke).toHaveBeenCalledWith("delete-subtrack-account", { method: "POST" });
    expect(current.canAccessApp).toBe(false);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
