import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { financeAttention, financeCurrencies, financeLedger, financeOverview, groupPayments } from "../lib/finance-overview";
import { LAUNCH_HOLD_MS, SAVINGS_TAGLINE, launchHoldTime } from "../lib/launch";
import type { SubscriptionRecord } from "../lib/subscription-types";

const reference = new Date(2026, 1, 1, 12);
const record: SubscriptionRecord = {
  id: "base", serviceId: "custom", planName: "My plan", amount: 12, currency: "USD", cadence: "monthly",
  renewalDate: "2026-02-03", status: "active", billingSource: "provider", reminderEnabled: false,
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
};
const source = (path: string) => readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", path), "utf8");
const { themeColors } = createRequire(import.meta.url)("../theme.config.js") as { themeColors: Record<string, { light: string; dark: string }> };
const luminance = (hex: string) => [1, 3, 5].map((position) => parseInt(hex.slice(position, position + 2), 16) / 255)
  .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  .reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
const contrast = (foreground: string, background: string) => {
  const [low, high] = [luminance(foreground), luminance(background)].sort((left, right) => left - right);
  return (high + 0.05) / (low + 0.05);
};

describe("finance overview", () => {
  it("keeps currencies separate and prefers a currency actually in use", () => {
    const records = [record, { ...record, id: "eur", currency: "EUR", amount: 120, cadence: "yearly" as const }];
    expect(financeCurrencies(records, "EUR")).toEqual(["EUR", "USD"]);
    expect(financeCurrencies(records, "INR")).toEqual(["EUR", "USD"]);
    expect(financeOverview(records, "USD", reference)).toMatchObject({ monthly: 12, dueThisMonth: 12, dueCount: 1, activeCount: 1 });
    expect(financeOverview(records, "EUR", reference)).toMatchObject({ monthly: 10, dueThisMonth: 120, dueCount: 1, activeCount: 1 });
  });
  it("does not call a yearly equivalent an actual upcoming charge", () => {
    const overview = financeOverview([{ ...record, cadence: "yearly", amount: 120, renewalDate: "2026-09-10" }], "USD", reference);
    expect(overview.monthly).toBe(10);
    expect(overview.dueThisMonth).toBe(0);
    expect(overview.payments[0].due).toBe("2026-09-10");
  });
  it("counts all remaining weekly payments but only one next-payment row", () => {
    const overview = financeOverview([{ ...record, cadence: "weekly", amount: 5 }], "USD", reference);
    expect(overview.dueCount).toBe(4);
    expect(overview.dueThisMonth).toBe(20);
    expect(overview.payments).toHaveLength(1);
  });
  it("uses the expected next price once, not for every future payment", () => {
    const overview = financeOverview([{ ...record, cadence: "weekly", amount: 5, expectedNextCharge: 8 }], "USD", reference);
    expect(overview.dueThisMonth).toBe(23);
    expect(overview.monthly).toBe(21.67);
  });
  it("excludes archived plans and does not project a past non-renewing plan", () => {
    const overview = financeOverview([
      { ...record, status: "cancelled" },
      { ...record, id: "stopped", renewalDate: "2026-01-01", autoRenewStatus: "off" },
    ], "USD", reference);
    expect(overview.dueThisMonth).toBe(0);
    expect(overview.payments).toEqual([]);
    expect(overview.activeCount).toBe(1);
  });
  it("provides a real zero state without a fake currency conversion", () => {
    expect(financeCurrencies([], "INR")).toEqual(["INR"]);
    expect(financeOverview([], "INR", reference)).toMatchObject({ currency: "INR", monthly: 0, dueThisMonth: 0, payments: [] });
  });
  it("can show the chosen country's zero total while preserving other currencies", () => {
    expect(financeCurrencies([record], "INR", true)).toEqual(["INR", "USD"]);
    expect(financeOverview([record], "INR", reference)).toMatchObject({ monthly: 0, dueThisMonth: 0, activeCount: 0 });
    expect(financeOverview([record], "USD", reference).monthly).toBe(12);
  });
  it("groups payments by their due date", () => {
    const payments = financeOverview([record, { ...record, id: "second" }], "USD", reference).payments;
    expect(groupPayments(payments)).toHaveLength(1);
    expect(groupPayments(payments)[0].payments).toHaveLength(2);
  });
});

describe("subscription ledger", () => {
  it("sorts projected payments and trial deadlines, not stale anchor dates", () => {
    const records = [
      { ...record, id: "old-anchor", renewalDate: "2025-12-31" },
      { ...record, id: "near-trial", status: "trial" as const, trialEndDate: "2026-02-02" },
      record,
    ];
    expect(financeLedger(records, "current", "", reference).map((item) => item.id)).toEqual(["near-trial", "base", "old-anchor"]);
  });
  it("searches both known service names and user-entered plan names", () => {
    const known = { ...record, serviceId: "netflix", planName: "Standard" };
    expect(financeLedger([known], "current", " NETFLIX ", reference)).toEqual([known]);
    expect(financeLedger([known], "current", "standard", reference)).toEqual([known]);
  });
  it("keeps uncertain records current and archived records out of the default view", () => {
    const records = [record, { ...record, id: "pending", status: "uncertain" as const }, { ...record, id: "archived", status: "cancelled" as const }];
    expect(financeLedger(records, "current", "", reference).map((item) => item.id)).toEqual(["base", "pending"]);
    expect(financeLedger(records, "cancelled", "", reference).map((item) => item.id)).toEqual(["archived"]);
  });
});

describe("deadline-led attention", () => {
  it("ranks an overdue cancellation above a near trial and higher next charge", () => {
    const items = financeAttention([
      { ...record, id: "price", expectedNextCharge: 20, renewalDate: "2026-02-04" },
      { ...record, id: "trial", status: "trial", trialEndDate: "2026-02-02" },
      { ...record, id: "archived", status: "cancelled", cancellationState: "pending", cancellationFollowUpDate: "2026-01-25" },
    ], reference);
    expect(items.map((item) => [item.record.id, item.reason])).toEqual([["archived", "cancellation"], ["trial", "trial"], ["price", "price"]]);
  });
  it("does not clutter attention with ordinary renewals or far-future trials", () => {
    expect(financeAttention([record, { ...record, id: "later", status: "trial", trialEndDate: "2026-06-01" }], reference)).toEqual([]);
  });
  it("keeps overdue trials visible until the user updates their status", () => {
    expect(financeAttention([{ ...record, status: "trial", trialEndDate: "2026-01-28" }], reference)[0].reason).toBe("trial");
  });
  it("uses recorded decisions and check-ins, not invented usage data", () => {
    expect(financeAttention([{ ...record, valueCheckIn: { useLevel: "rare", wouldBuyAgain: "no", checkedAt: record.updatedAt } }], reference)[0].reason).toBe("value");
    expect(financeAttention([{ ...record, renewalDecisionPlan: { action: "downgrade", decidedAt: record.updatedAt } }], reference)[0].reason).toBe("decision");
  });
  it("does not duplicate a pending cancellation with its renewal warning", () => {
    const items = financeAttention([{ ...record, expectedNextCharge: 20, cancellationState: "pending", cancellationFollowUpDate: "2026-02-03" }], reference);
    expect(items.map((item) => item.reason)).toEqual(["cancellation"]);
  });
});

describe("app-launch experience", () => {
  it("holds every fresh launch, except with reduced motion", () => {
    expect(launchHoldTime(false)).toBe(LAUNCH_HOLD_MS);
    expect(LAUNCH_HOLD_MS).toBe(1600);
    expect(launchHoldTime(true)).toBe(0);
  });
  it("uses a savings tagline without making a savings claim", () => {
    expect(SAVINGS_TAGLINE).toBe("Spend on what matters. Save the rest.");
    expect(source("components/launch-screen.tsx")).not.toContain("LAUNCH_SEEN_KEY");
  });
  it("waits for local data and privacy readiness, with a font-error fallback", () => {
    expect(source("app/_layout.tsx")).toContain("store.isReady || !!store.storageError");
    expect(source("app/_layout.tsx")).toContain("privacyReady");
    expect(source("app/_layout.tsx")).toContain("fontsLoaded || !!fontError");
    expect(source("lib/privacy.tsx")).toContain('label="Retry"');
  });
  it("hands off the static native splash before presenting the animated brand", () => {
    expect(source("components/launch-screen.tsx")).toContain("opacity: !presented ? 0");
    expect(source("components/launch-screen.tsx")).toContain("await SplashScreen.hideAsync()");
    expect(source("app/_layout.tsx")).toContain("SplashScreen.setOptions({ duration: 0, fade: false })");
  });
});

describe("finance text contrast", () => {
  it.each(["light", "dark"] as const)("keeps %s supporting text legible on canvas, surfaces, and tints", (scheme) => {
    for (const background of [themeColors.background[scheme], themeColors.surface[scheme], scheme === "light" ? "#EDF6F1" : "#20372F"]) {
      expect(contrast(themeColors.muted[scheme], background)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(scheme === "light" ? "#FFFFFF" : "#0D2B22", themeColors.primary[scheme])).toBeGreaterThanOrEqual(4.5);
  });
  it("keeps hero labels legible on the lightest decorative blend", () => {
    expect(contrast("#C5EBDE", "#097259")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#FFFFFF", "#227F6A")).toBeGreaterThanOrEqual(4.5);
  });
});
