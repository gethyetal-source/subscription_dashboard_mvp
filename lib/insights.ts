import type { AppSettings, PlanChangeEvent, SubscriptionRecord } from "./subscription-types";
import { addBillingPeriod, billingOccurrences } from "./renewal-engine";
import { localDateKey, monthlyAmount } from "./subscription-utils";

export function cashFlowForecast(records: SubscriptionRecord[], reference = new Date(), months = 6) {
  const start = localDateKey(reference);
  const buckets = Array.from({ length: Math.max(1, Math.min(24, months)) }, (_, index) => {
    const date = new Date(reference.getFullYear(), reference.getMonth() + index, 1);
    return { month: localDateKey(date).slice(0, 7), amounts: {} as Record<string, number>, charges: 0 };
  });
  const horizon = addBillingPeriod(`${buckets[buckets.length - 1].month}-01`, "monthly");
  for (const record of records) {
    if (record.status === "cancelled") continue;
    billingOccurrences(record, start, horizon).forEach((date, index) => {
      const bucket = buckets.find((candidate) => candidate.month === date.slice(0, 7));
      if (!bucket) return;
      const amount = index === 0 ? record.expectedNextCharge ?? record.amount : record.amount;
      bucket.amounts[record.currency] = Math.round(((bucket.amounts[record.currency] ?? 0) + amount) * 100) / 100;
      bucket.charges++;
    });
  }
  return buckets;
}
export function priceChangeImpact(event: PlanChangeEvent) {
  if (event.previousCurrency !== event.nextCurrency) return null;
  const before = monthlyAmount(event.previousAmount, event.previousCadence);
  const after = monthlyAmount(event.nextAmount, event.nextCadence);
  const monthlyChange = Math.round((after - before) * 100) / 100;
  return { currency: event.nextCurrency, monthlyChange, annualChange: Math.round(monthlyChange * 1200) / 100 };
}
export function budgetPosition(records: SubscriptionRecord[], settings: AppSettings) {
  const currency = settings.budgetCurrency ?? "USD";
  const monthly = records.filter((record) => record.status !== "cancelled" && record.currency === currency)
    .reduce((total, record) => total + monthlyAmount(record.amount, record.cadence), 0);
  return { currency, monthly: Math.round(monthly * 100) / 100, budget: settings.monthlyBudget,
    remaining: Math.round((settings.monthlyBudget - monthly) * 100) / 100,
    excludedCurrencyCount: new Set(records.filter((record) => record.status !== "cancelled" && record.currency !== currency).map((record) => record.currency)).size };
}
