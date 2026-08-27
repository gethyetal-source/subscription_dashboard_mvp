import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(projectRoot, path), "utf8");

describe("Play Store preparation", () => {
  it("keeps the account-deletion function authenticated and scoped to the requesting user", () => {
    const source = read("supabase/functions/delete-subtrack-account/index.ts");
    expect(source).toContain("caller.auth.getUser()");
    expect(source).toContain('delete().eq("user_id", user.id)');
    expect(source).toContain("admin.auth.admin.deleteUser(user.id)");
    expect(source).not.toContain("request.json");
  });

  it("includes Play-compatible Android bundle and internal APK build profiles", () => {
    const config = JSON.parse(read("eas.json"));
    expect(config.build.preview.android.buildType).toBe("apk");
    expect(config.build.production.android.buildType).toBe("app-bundle");
    expect(config.build.production.autoIncrement).toBe(true);
  });

  it("removes unused microphone template configuration and registers public privacy controls", () => {
    const appConfig = read("app.config.ts");
    const routes = read("app/_layout.tsx");
    expect(appConfig).toContain("versionCode: 1");
    expect(appConfig).toContain('permissions: ["POST_NOTIFICATIONS"]');
    expect(appConfig).not.toContain("expo-audio");
    expect(appConfig).not.toContain("expo-video");
    expect(routes).toContain('name="privacy-policy"');
    expect(routes).toContain('name="delete-account"');
  });

  it("keeps the privacy route transparent about local data, optional cloud sync, and deletion", () => {
    const source = read("app/privacy-policy.tsx");
    expect(source).toContain("stored locally on the device by default");
    expect(source).toContain("Optional cloud sync");
    expect(source).toContain("Account deletion");
  });
});
