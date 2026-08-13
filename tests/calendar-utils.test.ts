import { describe, expect, it } from "vitest";

import { buildCalendarDays, groupRenewalsByDate, renewalsForMonth, toDateKey } from "../lib/calendar-utils";
import type { SubscriptionRecord } from "../lib/subscription-types";

const base: SubscriptionRecord = {
  id: "sub_1",
  serviceId: "spotify",
  planName: "Premium",
  amount: 12,
  currency: "USD",
  cadence: "monthly",
  renewalDate: "2026-09-15",
  billingSource: "provider",
  status: "active",
  reminderEnabled: true,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

describe("renewal calendar helpers", () => {
  it("creates a six-week grid with ISO date keys", () => {
    const days = buildCalendarDays(new Date(2026, 8, 1));
    expect(days).toHaveLength(42);
    expect(days.find((item) => item.key === "2026-09-01")?.isCurrentMonth).toBe(true);
    expect(toDateKey(new Date(2026, 8, 15))).toBe("2026-09-15");
  });

  it("shows only active renewal records in the visible month", () => {
    const nextMonth = { ...base, id: "sub_2", renewalDate: "2026-10-15" };
    const cancelled = { ...base, id: "sub_3", status: "cancelled" as const };
    expect(renewalsForMonth([base, nextMonth, cancelled], new Date(2026, 8, 1))).toEqual([base]);
  });

  it("groups multiple charges under the same renewal date", () => {
    const sameDay = { ...base, id: "sub_4", serviceId: "netflix" };
    const grouped = groupRenewalsByDate([base, sameDay]);
    expect(grouped["2026-09-15"].map((item) => item.id)).toEqual(["sub_1", "sub_4"]);
  });
});
