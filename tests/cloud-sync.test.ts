import { describe, expect, it } from "vitest";

import { isCloudSnapshot, prepareCloudSnapshot } from "../lib/cloud-sync-utils";
import type { LocalSubscriptionSnapshot } from "../lib/subscription-store";

const snapshot: LocalSubscriptionSnapshot = {
  settings: {
    dashboardSort: "upcoming",
    monthlyBudget: 60,
    notificationsEnabled: true,
    reminderDays: 7,
  },
  householdMembers: [
    { id: "owner", name: "You", color: "#1A73E8", isOwner: true, createdAt: "2026-01-01T00:00:00.000Z" },
  ],
  subscriptions: [
    {
      id: "sub_netflix",
      serviceId: "netflix",
      planName: "Standard",
      amount: 15.49,
      currency: "USD",
      cadence: "monthly",
      renewalDate: "2026-09-18",
      billingSource: "provider",
      status: "active",
      reminderEnabled: true,
      reminderIdentifier: "local-notification-id",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-10T00:00:00.000Z",
    },
  ],
};

describe("cloud snapshot safeguards", () => {
  it("keeps user-entered records but excludes device-only reminder identifiers", () => {
    const result = prepareCloudSnapshot(snapshot);

    expect(result.schemaVersion).toBe(1);
    expect(result.subscriptions).toHaveLength(1);
    expect(result.subscriptions[0].reminderIdentifier).toBeUndefined();
    expect(result.subscriptions[0].planName).toBe("Standard");
    expect(result.householdMembers).toEqual(snapshot.householdMembers);
  });

  it("accepts only a complete supported cloud snapshot", () => {
    expect(isCloudSnapshot(prepareCloudSnapshot(snapshot))).toBe(true);
    expect(isCloudSnapshot({ schemaVersion: 1, subscriptions: [] })).toBe(false);
    expect(isCloudSnapshot({ schemaVersion: 2, subscriptions: [], settings: {}, householdMembers: [] })).toBe(false);
  });
});
