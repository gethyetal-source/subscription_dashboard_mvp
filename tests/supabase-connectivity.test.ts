import { describe, expect, it } from "vitest";

const projectUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

describe("Supabase mobile client configuration", () => {
  it("reaches the configured project's public Auth settings endpoint with the publishable key", async () => {
    expect(projectUrl).toMatch(/^https:\/\/[a-z0-9-]+\.supabase\.co$/i);
    expect(publishableKey).toMatch(/^sb_publishable_/);

    const response = await fetch(`${projectUrl}/auth/v1/settings`, {
      headers: { apikey: publishableKey ?? "" },
    });

    expect(response.ok).toBe(true);
    const settings = await response.json() as Record<string, unknown>;
    expect(settings).toHaveProperty("external");
  });
});
