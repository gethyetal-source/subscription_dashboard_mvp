import { describe, expect, it } from "vitest";

import { getCancellationEvidenceTimeline, getExpectedChargeContext } from "../lib/subscription-utils";
import type { SubscriptionRecord } from "../lib/subscription-types";

const baseRecord: SubscriptionRecord = {
  id: "sub_decision",
  serviceId: "chatgpt",
  planId: "plus",
  planName: "Plus",
  amount: 20,
  currency: "USD",
  cadence: "monthly",
  renewalDate: "2026-10-10",
  billingSource: "provider",
  status: "active",
  reminderEnabled: true,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

describe("subscription decision safeguards", () => {
  it("distinguishes a user-entered expected charge from the saved price", () => {
    expect(getExpectedChargeContext({ ...baseRecord, expectedNextCharge: 25, costChangeReason: "Introductory price ends" })).toEqual({
      expected: 25,
      savedAmount: 20,
      difference: 5,
      direction: "higher",
      reason: "Introductory price ends",
    });
    expect(getExpectedChargeContext(baseRecord)).toBeUndefined();
  });

  it("orders local cancellation evidence chronologically and keeps the provider boundary clear", () => {
    const events = getCancellationEvidenceTimeline({
      ...baseRecord,
      cancellationState: "confirmed",
      cancellationRequestedAt: "2026-08-10T10:00:00.000Z",
      cancellationConfirmationReference: "CASE-42",
      cancellationExpectedEndDate: "2026-08-20",
      cancellationFollowUpDate: "2026-08-18",
      cancellationFollowUpCompletedAt: "2026-08-18T15:00:00.000Z",
      cancellationConfirmedAt: "2026-08-21T09:00:00.000Z",
    });
    expect(events.map((event) => event.kind)).toEqual(["official-attempt", "confirmation-reference", "follow-up", "provider-end-date", "confirmed"]);
    expect(events.find((event) => event.kind === "confirmation-reference")?.detail).toBe("CASE-42");
  });
});
