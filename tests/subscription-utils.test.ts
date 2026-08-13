import { describe, expect, it } from "vitest";

import { annualAmount, getSpendSummary, getUpcomingSubscriptions, isValidDateString, monthlyAmount, resolveManagementUrl, sortDashboardSubscriptions, totalAnnual, totalMonthly } from "../lib/subscription-utils";
import type { SubscriptionRecord } from "../lib/subscription-types";

const baseRecord: SubscriptionRecord = { id: "sub_1", serviceId: "chatgpt", planId: "plus", planName: "Plus", amount: 20, currency: "USD", cadence: "monthly", renewalDate: "2026-10-10", billingSource: "provider", status: "active", reminderEnabled: true, createdAt: "2026-08-13T00:00:00.000Z", updatedAt: "2026-08-13T00:00:00.000Z" };

describe("subscription calculations", () => {
  it("normalizes monthly, quarterly, and annual amounts", () => { expect(monthlyAmount(20, "monthly")).toBe(20); expect(monthlyAmount(30, "quarterly")).toBe(10); expect(monthlyAmount(120, "yearly")).toBe(10); expect(annualAmount(120, "yearly")).toBe(120); });
  it("excludes cancelled records from totals", () => { const cancelled = { ...baseRecord, id: "sub_2", amount: 100, cadence: "yearly" as const, status: "cancelled" as const }; expect(totalMonthly([baseRecord, cancelled])).toBe(20); expect(totalAnnual([baseRecord, cancelled])).toBe(240); });
  it("orders upcoming records by renewal date", () => { const later = { ...baseRecord, id: "sub_later", renewalDate: "2026-12-01" }; const earlier = { ...baseRecord, id: "sub_earlier", renewalDate: "2026-09-01" }; expect(getUpcomingSubscriptions([later, earlier]).map((item) => item.id)).toEqual(["sub_earlier", "sub_later"]); });
  it("sorts active dashboard records by next billing date or scheduled charge amount", () => { const later = { ...baseRecord, id: "sub_later", renewalDate: "2026-12-01", amount: 20 }; const earlier = { ...baseRecord, id: "sub_earlier", renewalDate: "2026-09-01", amount: 10 }; const annualHighCost = { ...baseRecord, id: "sub_annual", renewalDate: "2026-10-01", amount: 240, cadence: "yearly" as const }; expect(sortDashboardSubscriptions([later, earlier, annualHighCost], "upcoming").map((item) => item.id)).toEqual(["sub_earlier", "sub_annual", "sub_later"]); expect(sortDashboardSubscriptions([later, earlier, annualHighCost], "highest-cost").map((item) => item.id)).toEqual(["sub_annual", "sub_later", "sub_earlier"]); });
  it("summarizes monthly spend, category concentration, and near-term renewals", () => { const entertainment = { ...baseRecord, id: "sub_netflix", serviceId: "netflix", amount: 30, renewalDate: "2026-08-15" }; const summary = getSpendSummary([baseRecord, entertainment], new Date("2026-08-13T12:00:00")); expect(summary.monthly).toBe(50); expect(summary.categories[0]).toMatchObject({ category: "Entertainment", monthly: 30, percentage: 60 }); expect(summary.upcomingSevenDays.map((item) => item.id)).toEqual(["sub_netflix"]); expect(summary.insights.map((item) => item.id)).toContain("concentration"); expect(summary.insights.map((item) => item.id)).toContain("renewals"); });
});

describe("subscription safety helpers", () => {
  it("accepts only real YYYY-MM-DD dates", () => { expect(isValidDateString("2026-09-15")).toBe(true); expect(isValidDateString("15-09-2026")).toBe(false); expect(isValidDateString("2026-02-31")).toBe(false); });
  it("routes store-billed subscriptions to the correct official management authority", () => { expect(resolveManagementUrl({ ...baseRecord, billingSource: "apple" })).toContain("apple.com"); expect(resolveManagementUrl({ ...baseRecord, billingSource: "google" })).toContain("play.google.com"); expect(resolveManagementUrl(baseRecord)).toContain("chatgpt.com"); });
});
