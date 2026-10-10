import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const source = (path: string) => readFileSync(join(root, path), "utf8");
function files(folder: string): string[] {
  return readdirSync(join(root, folder), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(`${folder}/${entry.name}`) : /\.(ts|tsx)$/.test(entry.name) ? [`${folder}/${entry.name}`] : []);
}

describe("account-only client boundaries", () => {
  it("does not give account code access to financial state or financial network methods", () => {
    const auth = source("lib/account.tsx");
    expect(auth).not.toMatch(/useSubscriptions|subscription-store|snapshotState|prepareCloudSnapshot|\.rpc\(|\.from\(/);
    expect(source("lib/cloud-sync.tsx")).not.toMatch(/syncNow|restoreFromCloud|getRestorePreview/);
    expect(source("lib/household-cloud.ts")).not.toMatch(/supabase|\.rpc\(|\.from\(/);
  });
  it("has no remaining client calls to financial tables or RPCs", () => {
    for (const file of [...files("app"), ...files("components"), ...files("lib")]) {
      expect(source(file), file).not.toMatch(/\.(?:rpc|from|channel)\(\s*["'`]subtrack_(?:save_snapshot|sync_state|household|shared_plan)/);
    }
  });
  it("protects every financial route, including direct custom-add and widget links", () => {
    const layout = source("app/_layout.tsx");
    const group = layout.split("<Stack.Protected guard={account.canAccessApp}>")[1]?.split("</Stack.Protected>")[0] ?? "";
    expect(group).not.toBe("");
    const publicRoutes = new Set(["login", "oauth/callback", "password-reset", "privacy-policy", "delete-account", "cloud-sync"]);
    for (const file of files("app")) {
      const route = file.replace(/^app\//, "").replace(/\.tsx$/, "");
      if (route.endsWith("_layout") || route.startsWith("(tabs)/") || publicRoutes.has(route)) continue;
      expect(group, route).toContain(`name="${route}"`);
    }
    expect(group).toContain('name="(tabs)"');
  });
  it("does not log callback credentials or use the legacy Manus OAuth exchange", () => {
    const callback = source("app/oauth/callback.tsx") + source("lib/account.tsx");
    expect(callback).not.toMatch(/console\.|exchangeOAuthCode|sessionToken|_core\/auth/);
    expect(callback).toContain("exchangeCodeForSession");
    expect(callback).toContain("replaceState");
  });
});
