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
  trialEndDate?: string;
  billingSource: BillingSource;
  status: SubscriptionStatus;
  notes?: string;
  reminderEnabled: boolean;
  reminderIdentifier?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  reminderDays: number;
  notificationsEnabled: boolean;
  dashboardSort: DashboardSort;
}

export interface SubscriptionDraft {
  serviceId: string;
  planId?: string;
  planName: string;
  amount: number;
  currency: string;
  cadence: BillingCadence;
  renewalDate: string;
  trialEndDate?: string;
  billingSource: BillingSource;
  status: SubscriptionStatus;
  notes?: string;
  reminderEnabled: boolean;
}
