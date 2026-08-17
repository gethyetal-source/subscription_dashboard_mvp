import { billingSourceMeta, getService } from "./catalog";
import type { BillingCadence, HouseholdMember, ServiceCategory, SubscriptionRecord } from "./subscription-types";

const cadenceMonths: Record<BillingCadence, number> = { weekly: 0.23, monthly: 1, quarterly: 3, yearly: 12 };

export function monthlyAmount(amount: number, cadence: BillingCadence) {
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Number((amount / cadenceMonths[cadence]).toFixed(2));
}

export function annualAmount(amount: number, cadence: BillingCadence) { return Number((monthlyAmount(amount, cadence) * 12).toFixed(2)); }
export function totalMonthly(subscriptions: SubscriptionRecord[]) { return Number(subscriptions.filter((item) => item.status !== "cancelled").reduce((sum, item) => sum + monthlyAmount(item.amount, item.cadence), 0).toFixed(2)); }
export function totalAnnual(subscriptions: SubscriptionRecord[]) { return Number(subscriptions.filter((item) => item.status !== "cancelled").reduce((sum, item) => sum + annualAmount(item.amount, item.cadence), 0).toFixed(2)); }

export interface HouseholdContribution {
  member: HouseholdMember;
  monthly: number;
  sharedPlanCount: number;
}

export function getHouseholdAllocation(memberIds: string[], customShares?: Record<string, number>) {
  const participants = Array.from(new Set(["owner", ...memberIds]));
  const raw = participants.map((id) => Number(customShares?.[id] ?? 0));
  const total = raw.reduce((sum, value) => sum + value, 0);
  if (total > 0 && Math.abs(total - 100) < 0.01 && raw.every((value) => Number.isFinite(value) && value >= 0)) {
    return Object.fromEntries(participants.map((id, index) => [id, raw[index]]));
  }
  const equal = Number((100 / participants.length).toFixed(2));
  const allocation = Object.fromEntries(participants.map((id) => [id, equal]));
  allocation.owner = Number((100 - Object.entries(allocation).filter(([id]) => id !== "owner").reduce((sum, [, value]) => sum + value, 0)).toFixed(2));
  return allocation;
}

/**
 * Distributes each active subscription by its saved local household allocation, falling back to equal shares.
 * Records without an assignment remain fully attributed to the device owner.
 */
export function getHouseholdContributions(subscriptions: SubscriptionRecord[], members: HouseholdMember[]): HouseholdContribution[] {
  const memberIds = new Set(members.map((member) => member.id));
  const totals = new Map(members.map((member) => [member.id, { monthly: 0, sharedPlanCount: 0 }]));
  subscriptions.filter((item) => item.status !== "cancelled").forEach((item) => {
    const assigned = Array.from(new Set(["owner", ...(item.sharedMemberIds ?? [])])).filter((id) => memberIds.has(id));
    const participantIds = assigned.length ? assigned : [members[0]?.id].filter(Boolean) as string[];
    if (!participantIds.length) return;
    const allocation = getHouseholdAllocation(participantIds, item.sharedMemberShares);
    const monthly = monthlyAmount(item.amount, item.cadence);
    participantIds.forEach((memberId) => {
      const current = totals.get(memberId);
      if (!current) return;
      current.monthly += monthly * ((allocation[memberId] ?? 0) / 100);
      current.sharedPlanCount += 1;
    });
  });
  return members.map((member) => {
    const total = totals.get(member.id) ?? { monthly: 0, sharedPlanCount: 0 };
    return { member, monthly: Number(total.monthly.toFixed(2)), sharedPlanCount: total.sharedPlanCount };
  });
}

export function startOfDay(date: Date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
export function daysUntil(dateValue: string, reference = new Date()) { return Math.ceil((startOfDay(new Date(`${dateValue}T00:00:00`)).getTime() - startOfDay(reference).getTime()) / 86_400_000); }
export function formatCurrency(amount: number, currency = "USD") { try { return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount); } catch { return `${currency} ${amount.toFixed(2)}`; } }
export function formatDate(value: string) { const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? "Date not set" : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date); }
export function formatRelativeRenewal(value: string) { const delta = daysUntil(value); if (delta === 0) return "Renews today"; if (delta === 1) return "Renews tomorrow"; if (delta > 1) return `Renews in ${delta} days`; return `Renewal was ${Math.abs(delta)} days ago`; }

export function getUpcomingSubscriptions(subscriptions: SubscriptionRecord[]) { return [...subscriptions].filter((item) => item.status !== "cancelled").sort((a, b) => new Date(`${a.renewalDate}T00:00:00`).getTime() - new Date(`${b.renewalDate}T00:00:00`).getTime()); }
export type DashboardSort = "upcoming" | "highest-cost";
export function sortDashboardSubscriptions(subscriptions: SubscriptionRecord[], sort: DashboardSort) { const active = subscriptions.filter((item) => item.status !== "cancelled"); return sort === "highest-cost" ? [...active].sort((a, b) => b.amount - a.amount) : getUpcomingSubscriptions(active); }

export type ReviewReason = "trial" | "renewal" | "high-cost";
export interface ReviewQueueItem { subscription: SubscriptionRecord; reasons: ReviewReason[]; monthly: number; annual: number; }

export function getReviewQueue(subscriptions: SubscriptionRecord[], reference = new Date()): ReviewQueueItem[] {
  const active = subscriptions.filter((item) => item.status !== "cancelled");
  const costs = active.map((item) => monthlyAmount(item.amount, item.cadence)).sort((a, b) => b - a);
  const highCostThreshold = costs.length > 2 ? costs[Math.min(2, costs.length - 1)] : costs[0] ?? 0;
  return active.map((subscription) => {
    const reasons: ReviewReason[] = [];
    const renewalDays = daysUntil(subscription.renewalDate, reference);
    if (subscription.status === "trial") reasons.push("trial");
    if (renewalDays >= 0 && renewalDays <= 14) reasons.push("renewal");
    if (monthlyAmount(subscription.amount, subscription.cadence) >= highCostThreshold && highCostThreshold > 0) reasons.push("high-cost");
    return { subscription, reasons, monthly: monthlyAmount(subscription.amount, subscription.cadence), annual: annualAmount(subscription.amount, subscription.cadence) };
  }).filter((item) => item.reasons.length > 0).sort((a, b) => b.reasons.length - a.reasons.length || b.monthly - a.monthly);
}

export function getAttentionScore(subscription: SubscriptionRecord, reference = new Date()) {
  let score = 0;
  if (subscription.status === "trial") score += 45;
  const renewalDays = daysUntil(subscription.renewalDate, reference);
  if (renewalDays >= 0 && renewalDays <= 7) score += 35;
  else if (renewalDays >= 0 && renewalDays <= 30) score += 20;
  const monthly = monthlyAmount(subscription.amount, subscription.cadence);
  if (monthly >= 50) score += 20;
  else if (monthly >= 20) score += 10;
  return Math.min(100, score);
}

export function getSavingsImpact(subscriptions: SubscriptionRecord[], selectedIds: string[]) {
  const selected = subscriptions.filter((item) => selectedIds.includes(item.id) && item.status !== "cancelled");
  return { monthly: Number(selected.reduce((sum, item) => sum + monthlyAmount(item.amount, item.cadence), 0).toFixed(2)), annual: Number(selected.reduce((sum, item) => sum + annualAmount(item.amount, item.cadence), 0).toFixed(2)) };
}

export interface CategorySpend { category: ServiceCategory | "Other"; monthly: number; percentage: number; subscriptionCount: number; }
export interface SpendInsight { id: "empty" | "concentration" | "renewals" | "trial" | "currency"; title: string; body: string; subscriptionId?: string; }
export interface SpendSummary { monthly: number; annual: number; activeCount: number; currency: string; categories: CategorySpend[]; upcomingSevenDays: SubscriptionRecord[]; trials: SubscriptionRecord[]; insights: SpendInsight[]; }
export interface MonthlyTrendPoint { label: string; amount: number; }
export interface CategoryTrend { category: ServiceCategory | "Other"; points: MonthlyTrendPoint[]; }

export function getSpendSummary(subscriptions: SubscriptionRecord[], reference = new Date()): SpendSummary {
  const active = subscriptions.filter((item) => item.status !== "cancelled");
  const monthly = totalMonthly(active);
  const annual = totalAnnual(active);
  const currency = active[0]?.currency ?? "USD";
  const grouped = active.reduce<Record<string, { monthly: number; subscriptionCount: number }>>((accumulator, item) => {
    const category = getService(item.serviceId)?.category ?? "Other";
    const current = accumulator[category] ?? { monthly: 0, subscriptionCount: 0 };
    current.monthly += monthlyAmount(item.amount, item.cadence);
    current.subscriptionCount += 1;
    accumulator[category] = current;
    return accumulator;
  }, {});
  const categories = Object.entries(grouped).map(([category, value]) => ({ category: category as ServiceCategory | "Other", monthly: Number(value.monthly.toFixed(2)), percentage: monthly ? Math.round((value.monthly / monthly) * 100) : 0, subscriptionCount: value.subscriptionCount })).sort((a, b) => b.monthly - a.monthly);
  const upcomingSevenDays = getUpcomingSubscriptions(active).filter((item) => { const days = daysUntil(item.renewalDate, reference); return days >= 0 && days <= 7; });
  const trials = active.filter((item) => item.status === "trial");
  const insights: SpendInsight[] = [];
  if (!active.length) {
    insights.push({ id: "empty", title: "Your summary will appear here", body: "Add subscriptions with their actual prices and renewal dates to see spend patterns and renewal reminders." });
  } else {
    const leadingCategory = categories[0];
    const leadingRecord = leadingCategory ? active.find((item) => getService(item.serviceId)?.category === leadingCategory.category) : undefined;
    if (leadingCategory && leadingCategory.percentage >= 40) insights.push({ id: "concentration", title: `${leadingCategory.category} leads your spend`, body: `${leadingCategory.percentage}% of your estimated monthly subscription spend is in this category.`, subscriptionId: leadingRecord?.id });
    if (upcomingSevenDays.length) insights.push({ id: "renewals", title: `${upcomingSevenDays.length} renewal${upcomingSevenDays.length === 1 ? "" : "s"} in the next 7 days`, body: "Review upcoming charges in your dashboard before their renewal dates.", subscriptionId: upcomingSevenDays[0]?.id });
    if (trials.length) insights.push({ id: "trial", title: `${trials.length} active trial${trials.length === 1 ? "" : "s"}`, body: "Check trial end dates so you can decide whether to continue before a paid renewal.", subscriptionId: trials[0]?.id });
    if (new Set(active.map((item) => item.currency)).size > 1) insights.push({ id: "currency", title: "Multiple currencies detected", body: "Monthly and annual totals combine saved amounts across currencies, so treat them as a directional estimate." });
  }
  return { monthly, annual, activeCount: active.length, currency, categories, upcomingSevenDays, trials, insights };
}

function addCadence(date: Date, cadence: BillingCadence) {
  const next = new Date(date);
  if (cadence === "weekly") next.setDate(next.getDate() + 7);
  else next.setMonth(next.getMonth() + (cadence === "monthly" ? 1 : cadence === "quarterly" ? 3 : 12));
  return next;
}

export function getMonthlySpendTrend(subscriptions: SubscriptionRecord[], reference = new Date(), months = 6): MonthlyTrendPoint[] {
  const active = subscriptions.filter((item) => item.status !== "cancelled");
  return Array.from({ length: months }, (_, index) => {
    const monthStart = new Date(reference.getFullYear(), reference.getMonth() + index, 1);
    const monthEnd = new Date(reference.getFullYear(), reference.getMonth() + index + 1, 1);
    const amount = active.reduce((total, item) => {
      let chargeDate = new Date(`${item.renewalDate}T00:00:00`);
      let safety = 0;
      while (chargeDate < monthStart && safety < 600) { chargeDate = addCadence(chargeDate, item.cadence); safety += 1; }
      while (chargeDate < monthEnd && safety < 700) {
        if (chargeDate >= monthStart) total += item.amount;
        chargeDate = addCadence(chargeDate, item.cadence);
        safety += 1;
      }
      return total;
    }, 0);
    return { label: new Intl.DateTimeFormat(undefined, { month: "short" }).format(monthStart), amount: Number(amount.toFixed(2)) };
  });
}

export function getCategorySpendTrend(subscriptions: SubscriptionRecord[], reference = new Date(), months = 6): CategoryTrend[] {
  const categories = Array.from(new Set(subscriptions.filter((item) => item.status !== "cancelled").map((item) => getService(item.serviceId)?.category ?? "Other")));
  return categories.map((category) => ({
    category: category as ServiceCategory | "Other",
    points: getMonthlySpendTrend(subscriptions.filter((item) => (getService(item.serviceId)?.category ?? "Other") === category), reference, months),
  }));
}

export function resolveManagementUrl(subscription: SubscriptionRecord) { const billingMeta = billingSourceMeta[subscription.billingSource]; return billingMeta.url ?? getService(subscription.serviceId)?.managementUrl ?? getService(subscription.serviceId)?.officialUrl ?? "https://www.google.com/"; }
export function getBillingAuthorityLabel(subscription: SubscriptionRecord) { return billingSourceMeta[subscription.billingSource].label; }
export function isValidDateString(value: string) { const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value); if (!match) return false; const [, year, month, day] = match; const date = new Date(Number(year), Number(month) - 1, Number(day)); return date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day); }
