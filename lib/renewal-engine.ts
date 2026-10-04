import type { BillingCadence, SubscriptionRecord } from "./subscription-types";

const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const utcDate = (key: string) => new Date(`${key}T12:00:00Z`);
export function addBillingPeriod(anchor: string, cadence: BillingCadence, periods = 1) {
  const date = utcDate(anchor);
  if (cadence === "weekly") { date.setUTCDate(date.getUTCDate() + 7 * periods); return dateKey(date); }
  const months = periods * (cadence === "yearly" ? 12 : cadence === "quarterly" ? 3 : 1);
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1, 12));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return dateKey(target);
}
export function billingOccurrences(record: SubscriptionRecord, from: string, through: string, max = 1000) {
  if (record.status === "cancelled") return [];
  const result: string[] = [];
  let period = 0;
  // Jump near the requested range while retaining the original month-end anchor.
  if (record.renewalDate < from) {
    const dayDifference = (utcDate(from).getTime() - utcDate(record.renewalDate).getTime()) / 86400000;
    const approximateDays = record.cadence === "weekly" ? 7 : record.cadence === "monthly" ? 31 : record.cadence === "quarterly" ? 93 : 366;
    period = Math.max(0, Math.floor(dayDifference / approximateDays) - 1);
  }
  for (let attempts = 0; attempts < 5000 && result.length < max; attempts++, period++) {
    const due = addBillingPeriod(record.renewalDate, record.cadence, period);
    if (due > through) break;
    if (due >= from) result.push(due);
    if (record.autoRenewStatus === "off") break;
  }
  return result;
}
export interface ReminderPlan { kind: "renewal" | "trial" | "cancellation"; dueDate: string; fireAt: Date; }
export function buildReminderPlans(record: SubscriptionRecord, leadDays: number, reference = new Date()): ReminderPlan[] {
  if (!record.reminderEnabled) return [];
  const plans: ReminderPlan[] = [];
  const add = (kind: ReminderPlan["kind"], dueDate: string, lead: number) => {
    const deadline = new Date(`${dueDate}T23:59:59`);
    if (deadline <= reference) return;
    const fireAt = new Date(`${dueDate}T09:00:00`);
    fireAt.setDate(fireAt.getDate() - lead);
    if (fireAt <= reference) fireAt.setTime(reference.getTime() + 60_000);
    if (fireAt <= deadline) plans.push({ kind, dueDate, fireAt });
  };
  if (record.status !== "cancelled") {
    const today = `${reference.getFullYear()}-${String(reference.getMonth() + 1).padStart(2, "0")}-${String(reference.getDate()).padStart(2, "0")}`;
    const horizon = addBillingPeriod(today, "yearly", 6);
    for (const due of billingOccurrences(record, today, horizon, 6)) add("renewal", due, leadDays);
    if (record.status === "trial" && record.trialEndDate) {
      // A trial and renewal on the same date need one notification, not two.
      const sameDate = plans.findIndex((plan) => plan.dueDate === record.trialEndDate);
      if (sameDate >= 0) plans.splice(sameDate, 1);
      add("trial", record.trialEndDate, leadDays);
    }
  }
  if (record.cancellationState === "pending" && record.cancellationFollowUpDate && !record.cancellationFollowUpCompletedAt) {
    add("cancellation", record.cancellationFollowUpDate, 0);
  }
  return plans;
}
