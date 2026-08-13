import { billingSourceMeta, getService } from "./catalog";
import type { BillingCadence, SubscriptionRecord } from "./subscription-types";

const cadenceMonths: Record<BillingCadence, number> = {
  weekly: 0.23,
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

export function monthlyAmount(amount: number, cadence: BillingCadence) {
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Number((amount / cadenceMonths[cadence]).toFixed(2));
}

export function annualAmount(amount: number, cadence: BillingCadence) {
  return Number((monthlyAmount(amount, cadence) * 12).toFixed(2));
}

export function totalMonthly(subscriptions: SubscriptionRecord[]) {
  return Number(subscriptions.filter((item) => item.status !== "cancelled").reduce((sum, item) => sum + monthlyAmount(item.amount, item.cadence), 0).toFixed(2));
}

export function totalAnnual(subscriptions: SubscriptionRecord[]) {
  return Number(subscriptions.filter((item) => item.status !== "cancelled").reduce((sum, item) => sum + annualAmount(item.amount, item.cadence), 0).toFixed(2));
}

export function daysUntil(dateValue: string, reference = new Date()) {
  const target = startOfDay(new Date(`${dateValue}T00:00:00`));
  const today = startOfDay(reference);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatCurrency(amount: number, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Date not set";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function formatRelativeRenewal(value: string) {
  const delta = daysUntil(value);
  if (delta === 0) return "Renews today";
  if (delta === 1) return "Renews tomorrow";
  if (delta > 1) return `Renews in ${delta} days`;
  return `Renewal was ${Math.abs(delta)} days ago`;
}

export function getUpcomingSubscriptions(subscriptions: SubscriptionRecord[]) {
  return [...subscriptions]
    .filter((item) => item.status !== "cancelled")
    .sort((a, b) => new Date(`${a.renewalDate}T00:00:00`).getTime() - new Date(`${b.renewalDate}T00:00:00`).getTime());
}

export type DashboardSort = "upcoming" | "highest-cost";

export function sortDashboardSubscriptions(subscriptions: SubscriptionRecord[], sort: DashboardSort) {
  const active = subscriptions.filter((item) => item.status !== "cancelled");
  if (sort === "highest-cost") {
    return [...active].sort((a, b) => b.amount - a.amount);
  }
  return getUpcomingSubscriptions(active);
}

export function resolveManagementUrl(subscription: SubscriptionRecord) {
  const billingMeta = billingSourceMeta[subscription.billingSource];
  if (billingMeta.url) return billingMeta.url;
  return getService(subscription.serviceId)?.managementUrl ?? getService(subscription.serviceId)?.officialUrl ?? "https://www.google.com/";
}

export function getBillingAuthorityLabel(subscription: SubscriptionRecord) {
  return billingSourceMeta[subscription.billingSource].label;
}

export function isValidDateString(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day);
}
