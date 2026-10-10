import { addBillingPeriod, billingOccurrences } from "./renewal-engine";
import { localDateKey } from "./subscription-utils";
import type { SubscriptionRecord } from "./subscription-types";

export interface RenewalQueueItem {
  record: SubscriptionRecord;
  due: string;
  kind: "renewal" | "trial" | "cancellation";
}

export function getRenewalQueue(records: SubscriptionRecord[], today = localDateKey()): RenewalQueueItem[] {
  const horizon = addBillingPeriod(today, "yearly", 6);
  const items: RenewalQueueItem[] = [];
  for (const record of records) {
    if (record.cancellationState === "pending" && record.cancellationFollowUpDate && !record.cancellationFollowUpCompletedAt) {
      items.push({ record, due: record.cancellationFollowUpDate, kind: "cancellation" });
    }
    if (record.status === "cancelled") continue;
    if (record.status === "trial") {
      items.push({ record, due: record.trialEndDate ?? record.renewalDate, kind: "trial" });
    } else {
      const due = billingOccurrences(record, today, horizon, 1)[0];
      if (due) items.push({ record, due, kind: "renewal" });
    }
  }
  return items.sort((left, right) => left.due.localeCompare(right.due) || left.record.id.localeCompare(right.record.id));
}
