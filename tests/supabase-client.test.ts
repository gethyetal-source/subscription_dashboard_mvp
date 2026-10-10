import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), processLock: vi.fn(), storage: {}, platform: { OS: "android" } }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient, processLock: mocks.processLock }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: mocks.storage }));
vi.mock("react-native", () => ({ Platform: mocks.platform }));

beforeEach(() => { vi.resetModules(); mocks.createClient.mockReset(); mocks.platform.OS = "android"; });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Supabase account client", () => {
  it("persists and refreshes PKCE sessions with one callback owner and a native lock", async () => {
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", "https://test-project.supabase.co");
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test_only");
    const module = await import("../lib/supabase");
    expect(module.isSupabaseConfigured).toBe(true);
    expect(module.supabaseSessionStorageKey).toBe("sb-test-project-auth-token");
    expect(mocks.createClient.mock.calls[0][2].auth).toMatchObject({
      persistSession: true, autoRefreshToken: true, flowType: "pkce",
      detectSessionInUrl: false, storage: mocks.storage, lock: mocks.processLock,
      experimental: { appendPkceFlowIdToRedirects: true },
    });
  });
  it.each(["sb_secret_not_a_real_key", `header.${btoa(JSON.stringify({ role: "service_role" }))}.signature`])("never creates a client with an elevated public key", async (key) => {
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", "https://test-project.supabase.co");
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY", key);
    const module = await import("../lib/supabase");
    expect(module.isSupabaseConfigured).toBe(false);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
  it.each(["", "invalid", "http://test-project.supabase.co", "https://user:pass@test-project.supabase.co"])("fails closed for unavailable or unsafe project URLs", async (url) => {
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", url);
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test_only");
    const module = await import("../lib/supabase");
    expect(module.supabase).toBeNull();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
  it("does not persist sessions or refresh tokens during a static server render", async () => {
    mocks.platform.OS = "web";
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", "https://test-project.supabase.co");
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test_only");
    await import("../lib/supabase");
    expect(mocks.createClient.mock.calls[0][2].auth).toMatchObject({ persistSession: false, autoRefreshToken: false, detectSessionInUrl: false });
  });
});
