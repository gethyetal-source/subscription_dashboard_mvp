import { describe, expect, it } from "vitest";

import type { SubscriptionRecord } from "../lib/subscription-types";
import { getChargeRecognitionMatches, getChargeRecognitionSupportCopy, getRenewalDecisionPrompts, getValueCheckPrompts } from "../lib/subscription-utils";

const baseRecord: SubscriptionRecord = {
  id: "sub_1",
  serviceId: "netflix",
  planName: "Standard",
  amount: 15.49,
  currency: "USD",
  cadence: "monthly",
  renewalDate: "2026-09-10",
  billingSource: "apple",
  billingIdentity: "APPLE.COM/BILL Netflix",
  autoRenewStatus: "on",
  cancellationState: "none",
  status: "active",
  reminderEnabled: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("Subscription Decision System", () => {
  it("prompts for a local decision before a near renewal and preserves a recorded decision", () => {
    const reference = new Date("2026-09-01T12:00:00.000Z");
    const undecided = getRenewalDecisionPrompts([baseRecord], reference);
    expect(undecided).toHaveLength(1);
    expect(undecided[0]?.title).toContain("Decide");
    expect(undecided[0]?.body).toContain("$15.49");

    const decided = getRenewalDecisionPrompts([{ ...baseRecord, renewalDecisionPlan: { action: "downgrade", decidedAt: "2026-09-01T12:00:00.000Z" } }], reference);
    expect(decided[0]?.action).toBe("downgrade");
    expect(decided[0]?.title).toContain("downgrade");
  });

  it("asks for value context when no check-in exists or the user records low value", () => {
    const reference = new Date("2026-09-01T12:00:00.000Z");
    expect(getValueCheckPrompts([baseRecord], reference)).toHaveLength(1);
    const lowValue = getValueCheckPrompts([{ ...baseRecord, valueCheckIn: { useLevel: "rare", wouldBuyAgain: "no", checkedAt: "2026-08-31T12:00:00.000Z" } }], reference);
    expect(lowValue[0]?.title).toContain("Reconsider");
    expect(lowValue[0]?.body).toContain("local check-in");
  });

  it("suggests only possible local matches from user-entered fields", () => {
    const matches = getChargeRecognitionMatches({ merchantLabel: "apple bill", amount: 15.49, currency: "usd", billingSource: "apple" }, [baseRecord]);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.subscription.id).toBe("sub_1");
    expect(matches[0]?.reasons).toContain("local billing label is similar");
    expect(matches[0]?.reasons).toContain("amount and currency match");
  });

  it("keeps unknown-charge support guidance within an official and local boundary", () => {
    expect(getChargeRecognitionMatches({ merchantLabel: "completely unrelated", billingSource: "unknown" }, [baseRecord])).toHaveLength(0);
    expect(getChargeRecognitionSupportCopy("unknown")).toContain("official support");
  });
});
