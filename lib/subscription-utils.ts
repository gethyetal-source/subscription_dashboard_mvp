import { billingSourceMeta, getService } from "./catalog";
import type { BillingCadence, BillingSource, ChargeRecognitionDraft, HouseholdMember, RenewalDecisionAction, ServiceCategory, SubscriptionRecord } from "./subscription-types";

const cadenceMonths: Record<BillingCadence, number> = { weekly: 0.23, monthly: 1, quarterly: 3, yearly: 12 };

export function monthlyAmount(amount: number, cadence: BillingCadence) {
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Number((amount / cadenceMonths[cadence]).toFixed(2));
}

export function annualAmount(amount: number, cadence: BillingCadence) { return Number((monthlyAmount(amount, cadence) * 12).toFixed(2)); }
export function totalMonthly(subscriptions: SubscriptionRecord[]) { return Number(subscriptions.filter((item) => item.status !== "cancelled").reduce((sum, item) => sum + monthlyAmount(item.amount, item.cadence), 0).toFixed(2)); }
export function totalAnnual(subscriptions: SubscriptionRecord[]) { return Number(subscriptions.filter((item) => item.status !== "cancelled").reduce((sum, item) => sum + annualAmount(item.amount, item.cadence), 0).toFixed(2)); }

export interface CurrencySpendGroup { currency: string; monthly: number; annual: number; subscriptionCount: number; }

export function getCurrencySpendGroups(subscriptions: SubscriptionRecord[]): CurrencySpendGroup[] {
  const groups = new Map<string, CurrencySpendGroup>();
  subscriptions.filter((item) => item.status !== "cancelled").forEach((item) => {
    const currency = item.currency.toUpperCase();
    const current = groups.get(currency) ?? { currency, monthly: 0, annual: 0, subscriptionCount: 0 };
    current.monthly += monthlyAmount(item.amount, item.cadence);
    current.annual += annualAmount(item.amount, item.cadence);
    current.subscriptionCount += 1;
    groups.set(currency, current);
  });
  return Array.from(groups.values()).map((group) => ({ ...group, monthly: Number(group.monthly.toFixed(2)), annual: Number(group.annual.toFixed(2)) })).sort((a, b) => a.currency.localeCompare(b.currency));
}

export function formatCurrencySpendGroups(groups: Array<Pick<CurrencySpendGroup, "currency" | "monthly">>) {
  return groups.map((group) => formatCurrency(group.monthly, group.currency)).join(" · ");
}

export interface HouseholdContribution {
  member: HouseholdMember;
  monthly: number;
  monthlyByCurrency: CurrencySpendGroup[];
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
  const totals = new Map(members.map((member) => [member.id, { currencies: new Map<string, number>(), sharedPlanCount: 0 }]));
  subscriptions.filter((item) => item.status !== "cancelled").forEach((item) => {
    const assigned = Array.from(new Set(["owner", ...(item.sharedMemberIds ?? [])])).filter((id) => memberIds.has(id));
    const participantIds = assigned.length ? assigned : [members[0]?.id].filter(Boolean) as string[];
    if (!participantIds.length) return;
    const allocation = getHouseholdAllocation(participantIds, item.sharedMemberShares);
    const monthly = monthlyAmount(item.amount, item.cadence);
    participantIds.forEach((memberId) => {
      const current = totals.get(memberId);
      if (!current) return;
      const currency = item.currency.toUpperCase();
      current.currencies.set(currency, (current.currencies.get(currency) ?? 0) + monthly * ((allocation[memberId] ?? 0) / 100));
      current.sharedPlanCount += 1;
    });
  });
  return members.map((member) => {
    const total = totals.get(member.id) ?? { currencies: new Map<string, number>(), sharedPlanCount: 0 };
    const monthlyByCurrency = Array.from(total.currencies.entries()).map(([currency, monthly]) => ({ currency, monthly: Number(monthly.toFixed(2)), annual: Number((monthly * 12).toFixed(2)), subscriptionCount: total.sharedPlanCount }));
    return { member, monthly: monthlyByCurrency.length === 1 ? monthlyByCurrency[0].monthly : 0, monthlyByCurrency, sharedPlanCount: total.sharedPlanCount };
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

export interface RenewalDecisionPrompt {
  subscription: SubscriptionRecord;
  dueInDays: number;
  action?: RenewalDecisionAction;
  title: string;
  body: string;
}

/** Returns local decision prompts. It never assumes a provider-side plan change has happened. */
export function getRenewalDecisionPrompts(subscriptions: SubscriptionRecord[], reference = new Date()): RenewalDecisionPrompt[] {
  return subscriptions
    .filter((item) => item.status !== "cancelled")
    .map((subscription) => {
      const decisionDate = subscription.status === "trial" ? subscription.trialEndDate ?? subscription.renewalDate : subscription.renewalDate;
      const dueInDays = daysUntil(decisionDate, reference);
      const action = subscription.renewalDecisionPlan?.action;
      const serviceName = getService(subscription.serviceId)?.name ?? subscription.planName;
      if (dueInDays < 0 || dueInDays > 30) return undefined;
      if (!action) return { subscription, dueInDays, title: `Decide on ${serviceName}`, body: `Review your next ${formatCurrency(subscription.expectedNextCharge ?? subscription.amount, subscription.currency)} charge before ${formatDate(decisionDate)}.`, action };
      return { subscription, dueInDays, title: `${serviceName}: ${action.replace("-", " ")}`, body: "You recorded this as a local decision. Use the official billing page if an external change is needed.", action };
    })
    .filter((item): item is RenewalDecisionPrompt => Boolean(item))
    .sort((left, right) => left.dueInDays - right.dueInDays);
}

export interface ValueCheckPrompt { subscription: SubscriptionRecord; title: string; body: string; }

export function getValueCheckPrompts(subscriptions: SubscriptionRecord[], reference = new Date()): ValueCheckPrompt[] {
  const staleAfter = new Date(reference.getTime() - 90 * 24 * 60 * 60 * 1000).getTime();
  return subscriptions.filter((item) => item.status !== "cancelled").flatMap((subscription) => {
    const check = subscription.valueCheckIn;
    const stale = !check || new Date(check.checkedAt).getTime() < staleAfter;
    const lowValue = check?.useLevel === "rare" || check?.wouldBuyAgain === "no";
    if (!stale && !lowValue) return [];
    const name = getService(subscription.serviceId)?.name ?? subscription.planName;
    return [{ subscription, title: lowValue ? `Reconsider ${name}` : `Check ${name}'s value`, body: lowValue ? "Your local check-in suggests this subscription may no longer be worth renewing." : "Record whether you still use it and would choose it again today." }];
  });
}

export interface ChargeRecognitionMatch { subscription: SubscriptionRecord; score: number; reasons: string[]; }

function normalizeRecognitionText(value: string | undefined) { return value?.trim().toLowerCase().replace(/[^a-z0-9]/g, "") ?? ""; }
function recognitionTerms(value: string | undefined) { return (value?.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).filter((term) => term !== "com" && term !== "www"); }

/**
 * Suggests only possible local matches using the user's own fields. It does not inspect financial data,
 * identify a merchant, or assert that any suggestion is the charged service.
 */
export function getChargeRecognitionMatches(draft: Pick<ChargeRecognitionDraft, "merchantLabel" | "amount" | "currency" | "billingSource">, subscriptions: SubscriptionRecord[]): ChargeRecognitionMatch[] {
  const merchant = normalizeRecognitionText(draft.merchantLabel);
  const merchantTerms = recognitionTerms(draft.merchantLabel);
  const currency = draft.currency?.toUpperCase();
  return subscriptions.filter((item) => item.status !== "cancelled").map((subscription) => {
    const reasons: string[] = [];
    let score = 0;
    const billingIdentity = normalizeRecognitionText(subscription.billingIdentity);
    const billingTerms = recognitionTerms(subscription.billingIdentity);
    const plan = normalizeRecognitionText(subscription.planName);
    const service = normalizeRecognitionText(getService(subscription.serviceId)?.name);
    if (merchant && billingIdentity && (billingIdentity.includes(merchant) || merchant.includes(billingIdentity) || (merchantTerms.length > 0 && merchantTerms.every((term) => billingTerms.includes(term))))) { score += 60; reasons.push("local billing label is similar"); }
    if (merchant && (service.includes(merchant) || merchant.includes(service) || plan.includes(merchant) || merchant.includes(plan))) { score += 35; reasons.push("service or plan name is similar"); }
    if (draft.billingSource !== "unknown" && subscription.billingSource === draft.billingSource) { score += 15; reasons.push("billing source matches"); }
    if (draft.amount !== undefined && Number.isFinite(draft.amount) && Math.abs(subscription.amount - draft.amount) < 0.01 && (!currency || subscription.currency.toUpperCase() === currency)) { score += 25; reasons.push("amount and currency match"); }
    return { subscription, score, reasons };
  }).filter((match) => match.score > 0).sort((left, right) => right.score - left.score || left.subscription.renewalDate.localeCompare(right.subscription.renewalDate)).slice(0, 5);
}

export function getChargeRecognitionSupportCopy(source: BillingSource) {
  if (source === "apple") return "Check your Apple purchase history and subscriptions, then use Apple’s official subscription page for the next step.";
  if (source === "google") return "Check Google Play order history and subscriptions, then use Google Play’s official subscription page for the next step.";
  if (source === "carrier") return "Check the carrier or bundle account that appears on your own statement or receipt before contacting its official support.";
  if (source === "reseller") return "Check the marketplace or reseller shown on your own record, then use its official support route.";
  if (source === "provider") return "Check the provider account or receipt you used to subscribe, then contact the provider through its official support route.";
  return "Start with your own receipt, statement label, wallet activity, and account email. If the charge remains unknown, use the official support or unauthorized-charge route for the billing source you identify.";
}

export type SubscriptionControlIssueKind = "cancellation-follow-up" | "possible-duplicate" | "annual-renewal" | "trial-deadline" | "renewal-setting" | "billing-identity" | "billing-source" | "uncertain-status";

export interface SubscriptionControlIssue {
  id: string;
  kind: SubscriptionControlIssueKind;
  priority: number;
  title: string;
  body: string;
  subscriptionIds: string[];
}

export interface PotentialDuplicateGroup {
  key: string;
  subscriptions: SubscriptionRecord[];
}

function normalizedDuplicateKey(subscription: SubscriptionRecord) {
  return `${subscription.serviceId.trim().toLowerCase()}::${subscription.planName.trim().toLowerCase()}`;
}

/**
 * Finds local records that appear to describe the same service and plan. This is a prompt to review,
 * not a claim that a provider has charged the user twice.
 */
export function getPotentialDuplicateGroups(subscriptions: SubscriptionRecord[]): PotentialDuplicateGroup[] {
  const grouped = new Map<string, SubscriptionRecord[]>();
  subscriptions.filter((item) => item.status !== "cancelled").forEach((item) => {
    const key = normalizedDuplicateKey(item);
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  });
  return Array.from(grouped.entries())
    .filter(([, items]) => items.length > 1)
    .map(([key, subscriptions]) => ({ key, subscriptions }));
}

/**
 * Produces transparent, local-only prompts for the subscription problems users can verify themselves.
 * It never attempts merchant discovery, bank access, inbox parsing, or provider-side cancellation.
 */
export function getSubscriptionControlIssues(subscriptions: SubscriptionRecord[], reference = new Date()): SubscriptionControlIssue[] {
  const active = subscriptions.filter((item) => item.status !== "cancelled");
  const issues: SubscriptionControlIssue[] = [];
  active.forEach((subscription) => {
    const serviceName = getService(subscription.serviceId)?.name ?? subscription.planName;
    const renewalDays = daysUntil(subscription.renewalDate, reference);
    if (subscription.cancellationState === "pending") {
      issues.push({ id: `cancel-${subscription.id}`, kind: "cancellation-follow-up", priority: 100, title: `Confirm ${serviceName} cancellation`, body: "You marked an official cancellation request as pending. Check the provider’s confirmation before treating this charge as stopped.", subscriptionIds: [subscription.id] });
    }
    if (subscription.status === "uncertain") {
      issues.push({ id: `status-${subscription.id}`, kind: "uncertain-status", priority: 85, title: `Verify ${serviceName} is still active`, body: "This record is marked uncertain. Check the billing source and official account before the next renewal.", subscriptionIds: [subscription.id] });
    }
    if (subscription.billingSource === "unknown") {
      issues.push({ id: `source-${subscription.id}`, kind: "billing-source", priority: 70, title: `Identify who bills ${serviceName}`, body: "Record whether the charge comes through a store, provider, carrier, reseller, or another source so you know where to manage it.", subscriptionIds: [subscription.id] });
    }
    if (!subscription.billingIdentity?.trim()) {
      issues.push({ id: `identity-${subscription.id}`, kind: "billing-identity", priority: 65, title: `Add a billing label for ${serviceName}`, body: "Save the exact local merchant label, account alias, or receipt clue that helps you recognize the charge later.", subscriptionIds: [subscription.id] });
    }
    if (subscription.status === "trial" && renewalDays >= 0 && renewalDays <= 7) {
      issues.push({ id: `trial-${subscription.id}`, kind: "trial-deadline", priority: 80, title: `${serviceName} trial ends soon`, body: `Decide before ${formatDate(subscription.trialEndDate ?? subscription.renewalDate)} so a short trial does not become an unplanned paid renewal.`, subscriptionIds: [subscription.id] });
    }
    if (subscription.cadence === "yearly" && renewalDays >= 0 && renewalDays <= 45) {
      issues.push({ id: `annual-${subscription.id}`, kind: "annual-renewal", priority: 75, title: `Review ${serviceName}'s annual renewal`, body: `${formatCurrency(subscription.amount, subscription.currency)} is scheduled for ${formatDate(subscription.renewalDate)}. Confirm the plan and auto-renew setting while there is time to act.`, subscriptionIds: [subscription.id] });
    }
    if (subscription.autoRenewStatus !== "off" && renewalDays >= 0 && renewalDays <= 14) {
      issues.push({ id: `renewal-${subscription.id}`, kind: "renewal-setting", priority: 60, title: `Check ${serviceName}'s renewal setting`, body: subscription.autoRenewStatus === "on" ? "You recorded auto-renew as on. Use the official billing page if you want to change it." : "Your auto-renew setting is not recorded. Check it on the official billing page before the next charge.", subscriptionIds: [subscription.id] });
    }
  });
  getPotentialDuplicateGroups(active).forEach((group) => {
    const serviceName = getService(group.subscriptions[0]?.serviceId ?? "")?.name ?? group.subscriptions[0]?.planName ?? "A subscription";
    issues.push({ id: `duplicate-${group.key}`, kind: "possible-duplicate", priority: 90, title: `Review possible duplicate: ${serviceName}`, body: `${group.subscriptions.length} active local records have the same service and plan. Compare billing sources and dates before deleting or cancelling anything.`, subscriptionIds: group.subscriptions.map((item) => item.id) });
  });
  return issues.sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title));
}

export function getSavingsImpact(subscriptions: SubscriptionRecord[], selectedIds: string[]) {
  const selected = subscriptions.filter((item) => selectedIds.includes(item.id) && item.status !== "cancelled");
  return { monthly: Number(selected.reduce((sum, item) => sum + monthlyAmount(item.amount, item.cadence), 0).toFixed(2)), annual: Number(selected.reduce((sum, item) => sum + annualAmount(item.amount, item.cadence), 0).toFixed(2)) };
}

export interface ExpectedChargeContext {
  expected: number;
  savedAmount: number;
  difference: number;
  direction: "higher" | "lower" | "unchanged";
  reason?: string;
}

/** Returns only user-entered local expectations; it never implies an invoice was checked. */
export function getExpectedChargeContext(subscription: SubscriptionRecord): ExpectedChargeContext | undefined {
  if (subscription.expectedNextCharge === undefined || !Number.isFinite(subscription.expectedNextCharge)) return undefined;
  const difference = Number((subscription.expectedNextCharge - subscription.amount).toFixed(2));
  return {
    expected: subscription.expectedNextCharge,
    savedAmount: subscription.amount,
    difference,
    direction: difference === 0 ? "unchanged" : difference > 0 ? "higher" : "lower",
    reason: subscription.costChangeReason?.trim() || undefined,
  };
}

export type CancellationEvidenceKind = "official-attempt" | "confirmation-reference" | "provider-end-date" | "follow-up" | "confirmed";
export interface CancellationEvidenceEvent { id: string; kind: CancellationEvidenceKind; date: string; title: string; detail: string; }

/** Builds a local evidence timeline. Entries are not provider verification or proof of a refund. */
export function getCancellationEvidenceTimeline(subscription: SubscriptionRecord): CancellationEvidenceEvent[] {
  const events: CancellationEvidenceEvent[] = [];
  if (subscription.cancellationRequestedAt) events.push({ id: "official-attempt", kind: "official-attempt", date: subscription.cancellationRequestedAt, title: "Official request tracked", detail: "You recorded an official cancellation attempt." });
  if (subscription.cancellationConfirmationReference) events.push({ id: "confirmation-reference", kind: "confirmation-reference", date: subscription.cancellationRequestedAt ?? subscription.updatedAt, title: "Local confirmation reference", detail: subscription.cancellationConfirmationReference });
  if (subscription.cancellationExpectedEndDate) events.push({ id: "provider-end-date", kind: "provider-end-date", date: `${subscription.cancellationExpectedEndDate}T00:00:00.000Z`, title: "Provider-stated end date", detail: subscription.cancellationExpectedEndDate });
  if (subscription.cancellationFollowUpDate) events.push({ id: "follow-up", kind: "follow-up", date: `${subscription.cancellationFollowUpDate}T00:00:00.000Z`, title: subscription.cancellationFollowUpCompletedAt ? "Follow-up completed" : "Follow up with provider", detail: subscription.cancellationFollowUpCompletedAt ? `Completed ${subscription.cancellationFollowUpCompletedAt}` : subscription.cancellationFollowUpDate });
  if (subscription.cancellationConfirmedAt) events.push({ id: "confirmed", kind: "confirmed", date: subscription.cancellationConfirmedAt, title: "Cancellation marked confirmed", detail: "Marked locally after provider confirmation." });
  return events.sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());
}

export interface CategorySpend { category: ServiceCategory | "Other"; monthly: number; percentage: number; subscriptionCount: number; }
export interface SpendInsight { id: "empty" | "concentration" | "renewals" | "trial" | "currency"; title: string; body: string; subscriptionId?: string; }
export interface SpendSummary { monthly: number; annual: number; activeCount: number; currency: string; currencyGroups: CurrencySpendGroup[]; hasMixedCurrencies: boolean; categories: CategorySpend[]; upcomingSevenDays: SubscriptionRecord[]; trials: SubscriptionRecord[]; insights: SpendInsight[]; }
export interface MonthlyTrendPoint { label: string; amount: number; }
export interface CategoryTrend { category: ServiceCategory | "Other"; points: MonthlyTrendPoint[]; }

export function getSpendSummary(subscriptions: SubscriptionRecord[], reference = new Date()): SpendSummary {
  const active = subscriptions.filter((item) => item.status !== "cancelled");
  const currencyGroups = getCurrencySpendGroups(active);
  const hasMixedCurrencies = currencyGroups.length > 1;
  const monthly = hasMixedCurrencies ? 0 : currencyGroups[0]?.monthly ?? 0;
  const annual = hasMixedCurrencies ? 0 : currencyGroups[0]?.annual ?? 0;
  const currency = currencyGroups[0]?.currency ?? "USD";
  const grouped = active.reduce<Record<string, { monthly: number; subscriptionCount: number }>>((accumulator, item) => {
    const category = getService(item.serviceId)?.category ?? "Other";
    const current = accumulator[category] ?? { monthly: 0, subscriptionCount: 0 };
    current.monthly += monthlyAmount(item.amount, item.cadence);
    current.subscriptionCount += 1;
    accumulator[category] = current;
    return accumulator;
  }, {});
  const categories = hasMixedCurrencies ? [] : Object.entries(grouped).map(([category, value]) => ({ category: category as ServiceCategory | "Other", monthly: Number(value.monthly.toFixed(2)), percentage: monthly ? Math.round((value.monthly / monthly) * 100) : 0, subscriptionCount: value.subscriptionCount })).sort((a, b) => b.monthly - a.monthly);
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
    if (hasMixedCurrencies) insights.push({ id: "currency", title: "Multiple currencies detected", body: "Spend is shown separately for each currency. SubTrack does not convert or combine currencies without a user-selected exchange-rate source." });
  }
  return { monthly, annual, activeCount: active.length, currency, currencyGroups, hasMixedCurrencies, categories, upcomingSevenDays, trials, insights };
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
export function localDateKey(reference = new Date()) { return `${reference.getFullYear()}-${String(reference.getMonth() + 1).padStart(2, "0")}-${String(reference.getDate()).padStart(2, "0")}`; }
export function isTodayOrFutureDate(value: string, reference = new Date()) { return isValidDateString(value) && new Date(`${value}T00:00:00`).getTime() >= startOfDay(reference).getTime(); }
export function nextLocalDateKey(reference = new Date()) { const next = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() + 1); return localDateKey(next); }
export function isFutureDate(value: string, reference = new Date()) { return isValidDateString(value) && new Date(`${value}T00:00:00`).getTime() > startOfDay(reference).getTime(); }
