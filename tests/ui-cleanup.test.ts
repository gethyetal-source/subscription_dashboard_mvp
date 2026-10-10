import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseMoneyInput } from "../lib/form-utils";
import { getRenewalQueue } from "../lib/renewal-queue";
import { billingOccurrences } from "../lib/renewal-engine";
import { describeDataError, parseBackup } from "../lib/data-safety";
import type { SubscriptionRecord } from "../lib/subscription-types";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path: string) => readFileSync(join(root, path), "utf8");
const record: SubscriptionRecord = {
  id: "base", serviceId: "custom", planName: "My plan", amount: 12, currency: "USD", cadence: "monthly",
  renewalDate: "2026-01-31", status: "active", billingSource: "provider", reminderEnabled: false,
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
};

describe("strict amount entry", () => {
  it.each([["12.50", 12.5], ["12,50", 12.5], [" 10 ", 10], ["0", 0], [".5", 0.5], ["1000000000", 1e9]])("accepts %s without truncation", (text, expected) => {
    expect(parseMoneyInput(text as string)).toBe(expected);
  });
  it.each(["", " ", "12abc", "12.50.20", "1,234.56", "-1", "Infinity", "1e4", "1000000001"])("rejects invalid entry %s", (text) => {
    expect(parseMoneyInput(text)).toBeUndefined();
  });
});

describe("renewal queue", () => {
  it("orders trials and projected renewals by their actual due date", () => {
    const queue = getRenewalQueue([
      { ...record, id: "later-trial", status: "trial", trialEndDate: "2026-04-10" },
      { ...record, id: "early-trial", status: "trial", trialEndDate: "2026-02-03" },
      record,
    ], "2026-02-01");
    expect(queue.map((item) => [item.record.id, item.due])).toEqual([
      ["early-trial", "2026-02-03"], ["base", "2026-02-28"], ["later-trial", "2026-04-10"],
    ]);
  });
  it("includes cancellation follow-ups on archived subscriptions", () => {
    const queue = getRenewalQueue([{ ...record, status: "cancelled", cancellationState: "pending", cancellationFollowUpDate: "2026-02-05" }], "2026-02-01");
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ kind: "cancellation", due: "2026-02-05" });
  });
  it("does not include completed follow-ups or cancelled renewals", () => {
    expect(getRenewalQueue([{ ...record, status: "cancelled", cancellationState: "pending", cancellationFollowUpDate: "2026-02-05", cancellationFollowUpCompletedAt: record.updatedAt }], "2026-02-01")).toEqual([]);
  });
  it("keeps overdue trial checks visible without pretending they are future charges", () => {
    expect(getRenewalQueue([{ ...record, status: "trial", trialEndDate: "2026-01-25" }], "2026-02-01")[0]).toMatchObject({ kind: "trial", due: "2026-01-25" });
  });
  it("does not roll a non-renewing plan forward from a past renewal date", () => {
    const stopped = { ...record, autoRenewStatus: "off" as const };
    expect(getRenewalQueue([stopped], "2026-06-01")).toEqual([]);
    expect(billingOccurrences(stopped, "2026-06-01", "2026-12-31")).toEqual([]);
    expect(billingOccurrences(stopped, "2026-01-01", "2026-12-31")).toEqual(["2026-01-31"]);
  });
});

describe("customer-facing UI boundaries", () => {
  it("keeps business strategy and theme previews outside public routes", () => {
    expect(existsSync(join(root, "app/monetization.tsx"))).toBe(false);
    expect(existsSync(join(root, "app/dev/theme-lab.tsx"))).toBe(false);
    expect(existsSync(join(root, "docs/membership-strategy.md"))).toBe(true);
    expect(source("app/(tabs)/settings.tsx")).not.toContain("Membership possibilities");
  });
  it("keeps secondary screens outside the three main tabs", () => {
    const tabs = source("app/(tabs)/_layout.tsx");
    expect(tabs).toContain('name="insights" options={{ title: "Insights"');
    for (const [name, title] of [["profile", "Profile"], ["settings", "Settings"], ["discover", "Discover"]]) {
      expect(tabs).toContain(`name="${name}" options={{ title: "${title}", href: null`);
    }
  });
  it("keeps deployment instructions and revision counters out of sharing screens", () => {
    const ui = source("app/shared-household.tsx") + source("app/(tabs)/settings.tsx") + source("app/cloud-sync.tsx");
    expect(ui).not.toMatch(/deploy the reviewed|Requires approved Supabase|public Supabase project configuration|revision \{/);
  });
  it("uses cross-platform confirmation for resets and logout without a cloud restore action", () => {
    expect(source("app/(tabs)/settings.tsx")).toContain("<ConfirmDialog");
    expect(source("app/(tabs)/profile.tsx")).toContain("<ConfirmDialog");
    expect(source("app/(tabs)/profile.tsx")).not.toContain("Alert.alert");
    expect(source("app/cloud-sync.tsx")).not.toContain("restoreFromCloud");
  });
  it("explains invalid backup data without showing parser or schema internals", () => {
    expect.assertions(2);
    try { parseBackup("{broken"); }
    catch (error) { expect(describeDataError(error)).toBe("This file is not a readable backup. Your existing records have not been changed."); }
    try { parseBackup(JSON.stringify({ subscriptions: [{ amount: "bad" }] })); }
    catch (error) { expect(describeDataError(error)).not.toMatch(/subscriptions\.|invalid_type|expected/); }
  });
});
