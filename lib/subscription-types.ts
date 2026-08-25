export type ServiceCategory =
  | "AI & work"
  | "Entertainment"
  | "Music"
  | "Productivity"
  | "Cloud"
  | "Fitness"
  | "Learning"
  | "Gaming";

export type BillingSource = "apple" | "google" | "provider" | "carrier" | "reseller" | "unknown";
export type SubscriptionStatus = "active" | "trial" | "cancelled" | "uncertain";
export type BillingCadence = "weekly" | "monthly" | "quarterly" | "yearly";
export type DashboardSort = "upcoming" | "highest-cost";
export type AutoRenewStatus = "on" | "off" | "unknown";
export type CancellationState = "none" | "pending" | "confirmed";

export interface HouseholdMember {
  id: string;
  name: string;
  color: string;
  isOwner?: boolean;
  createdAt: string;
}

export interface CatalogPlan {
  id: string;
  name: string;
  cadence: BillingCadence;
  priceLabel: string;
  summary: string;
  features: string[];
}

export interface ServiceDefinition {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  accent: string;
  initials: string;
  officialUrl: string;
  managementUrl: string;
  managementHint: string;
  plans: CatalogPlan[];
}

export interface SubscriptionRecord {
  id: string;
  serviceId: string;
  planId?: string;
  planName: string;
  amount: number;
  currency: string;
  cadence: BillingCadence;
  renewalDate: string;
  /** User-entered amount expected at the next renewal, in this record's currency. */
  expectedNextCharge?: number;
  /** User-entered local context for an expected or observed price change. */
  costChangeReason?: string;
  trialEndDate?: string;
  billingSource: BillingSource;
  /** A local label copied from a receipt, statement, wallet, or provider account. */
  billingIdentity?: string;
  /** User-reported renewal setting. SubTrack never reads or changes this at the provider. */
  autoRenewStatus?: AutoRenewStatus;
  /** Local follow-up state after the user opens an official cancellation flow. */
  cancellationState?: CancellationState;
  cancellationRequestedAt?: string;
  cancellationConfirmedAt?: string;
  /** User-entered provider confirmation or case reference. */
  cancellationConfirmationReference?: string;
  /** User-entered end date stated by the provider. */
  cancellationExpectedEndDate?: string;
  /** Local date to check the provider outcome. */
  cancellationFollowUpDate?: string;
  cancellationFollowUpCompletedAt?: string;
  status: SubscriptionStatus;
  notes?: string;
  reminderEnabled: boolean;
  reminderIdentifier?: string;
  /** Local household members who share this plan. The device owner is always included. */
  sharedMemberIds?: string[];
  /** Local percentage allocations for the assigned household members. Must total 100 when customized. */
  sharedMemberShares?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  reminderDays: number;
  notificationsEnabled: boolean;
  dashboardSort: DashboardSort;
  monthlyBudget: number;
}

export interface SubscriptionDraft {
  serviceId: string;
  planId?: string;
  planName: string;
  amount: number;
  currency: string;
  cadence: BillingCadence;
  renewalDate: string;
  expectedNextCharge?: number;
  costChangeReason?: string;
  trialEndDate?: string;
  billingSource: BillingSource;
  billingIdentity?: string;
  autoRenewStatus?: AutoRenewStatus;
  cancellationState?: CancellationState;
  cancellationRequestedAt?: string;
  cancellationConfirmedAt?: string;
  cancellationConfirmationReference?: string;
  cancellationExpectedEndDate?: string;
  cancellationFollowUpDate?: string;
  cancellationFollowUpCompletedAt?: string;
  status: SubscriptionStatus;
  notes?: string;
  reminderEnabled: boolean;
  sharedMemberIds?: string[];
  sharedMemberShares?: Record<string, number>;
}
