import { getService } from "./catalog";
import { cashFlowForecast } from "./insights";
import { getRenewalQueue, type RenewalQueueItem } from "./renewal-queue";
import type { SubscriptionRecord } from "./subscription-types";
import { daysUntil, getCurrencySpendGroups, getSpendSummary, localDateKey } from "./subscription-utils";

export function financeCurrencies(records: SubscriptionRecord[], preferred = "USD", includePreferred = false) {
  const currencies = getCurrencySpendGroups(records).map((group) => group.currency);
  if (includePreferred) return [preferred, ...currencies.filter((code) => code !== preferred)];
  return currencies.length ? currencies.includes(preferred) ? [preferred, ...currencies.filter((code) => code !== preferred)] : currencies : [preferred];
}

export function financeOverview(records: SubscriptionRecord[], currency: string, reference = new Date()) {
  const today = localDateKey(reference);
  const selected = records.filter((record) => record.currency === currency);
  const spend = getSpendSummary(selected, reference);
  const dueThisMonth = cashFlowForecast(selected, reference, 1)[0];
  const payments = getRenewalQueue(selected, today).filter((item) => item.kind !== "cancellation" && item.due >= today);
  return { ...spend, currency, payments, dueThisMonth: dueThisMonth.amounts[currency] ?? 0, dueCount: dueThisMonth.charges };
}

export type AttentionReason = "cancellation" | "trial" | "price" | "decision" | "value";
export interface AttentionItem extends RenewalQueueItem { reason: AttentionReason; }

/** Decisions are ranked by their deadline, never by a currency-independent cost score. */
export function financeAttention(records: SubscriptionRecord[], reference = new Date()): AttentionItem[] {
  const today = localDateKey(reference);
  const queue = getRenewalQueue(records, today);
  const items: AttentionItem[] = [];
  for (const item of queue) {
    const days = daysUntil(item.due, reference);
    if (days > 7) continue;
    if (item.kind === "cancellation") { items.push({ ...item, reason: "cancellation" }); continue; }
    if (item.record.cancellationState === "pending") continue;
    if (item.kind === "trial") { items.push({ ...item, reason: "trial" }); continue; }
    if (item.record.expectedNextCharge !== undefined && item.record.expectedNextCharge > item.record.amount) {
      items.push({ ...item, reason: "price" });
    } else if (item.record.renewalDecisionPlan && item.record.renewalDecisionPlan.action !== "keep") {
      items.push({ ...item, reason: "decision" });
    } else if (item.record.valueCheckIn?.useLevel === "rare" || item.record.valueCheckIn?.wouldBuyAgain === "no") {
      items.push({ ...item, reason: "value" });
    }
  }
  return items.sort((left, right) => left.due.localeCompare(right.due) || left.record.id.localeCompare(right.record.id));
}

export function subscriptionName(record: SubscriptionRecord) { return getService(record.serviceId)?.name ?? record.planName; }
export function shortDate(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
export function deadlineLabel(value: string, reference = new Date()) {
  const days = daysUntil(value, reference);
  if (days < 0) return `${Math.abs(days)} day${days === -1 ? "" : "s"} overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return shortDate(value);
}

export function groupPayments(items: RenewalQueueItem[]) {
  const groups = new Map<string, RenewalQueueItem[]>();
  for (const item of items) groups.set(item.due, [...(groups.get(item.due) ?? []), item]);
  return Array.from(groups, ([date, payments]) => ({ date, payments }));
}

export function financeLedger(records: SubscriptionRecord[], filter: "current" | "trial" | "cancelled", query = "", reference = new Date()) {
  const dueDates = new Map(getRenewalQueue(records, localDateKey(reference)).filter((item) => item.kind !== "cancellation").map((item) => [item.record.id, item.due]));
  const term = query.trim().toLowerCase();
  return records.filter((record) => (filter === "current" ? record.status !== "cancelled" : record.status === filter) &&
    `${subscriptionName(record)} ${record.planName}`.toLowerCase().includes(term))
    .sort((left, right) => (dueDates.get(left.id) ?? "9999").localeCompare(dueDates.get(right.id) ?? "9999") || subscriptionName(left).localeCompare(subscriptionName(right)));
}
