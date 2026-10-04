import { z } from "zod";

const text = z.string().max(10_000);
const id = z.string().trim().min(1).max(200);
const money = z.number().finite().min(0).max(1_000_000_000);
const timestamp = z.string().datetime({ offset: true });
export const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Enter a real YYYY-MM-DD date.");
const cadence = z.enum(["weekly", "monthly", "quarterly", "yearly"]);
const currency = z.string().trim().regex(/^[A-Za-z]{3}$/).transform((value) => value.toUpperCase());
const billingSource = z.enum(["apple", "google", "provider", "carrier", "reseller", "unknown"]);
const decision = z.object({
  action: z.enum(["keep", "downgrade", "pause", "cancel-officially", "review-later"]),
  note: text.optional(), decidedAt: timestamp,
});
const valueCheck = z.object({
  useLevel: z.enum(["frequent", "occasional", "rare", "unknown"]),
  wouldBuyAgain: z.enum(["yes", "maybe", "no"]), note: text.optional(), checkedAt: timestamp,
});
const planChange = z.object({
  id, changedAt: timestamp, previousPlanName: text, nextPlanName: text,
  previousAmount: money, nextAmount: money, previousCurrency: currency, nextCurrency: currency,
  previousCadence: cadence, nextCadence: cadence,
});
export const subscriptionSchema = z.object({
  id, serviceId: id, planId: id.optional(), planName: text.trim().min(1),
  amount: money, currency, cadence, renewalDate: localDateSchema,
  expectedNextCharge: money.optional(), costChangeReason: text.optional(),
  intentTags: z.array(z.enum(["essential", "seasonal", "work", "learning", "family", "testing", "backup"])).max(7).optional(),
  renewalDecisionPlan: decision.optional(), valueCheckIn: valueCheck.optional(),
  planChangeHistory: z.array(planChange).max(50).optional(),
  trialEndDate: localDateSchema.optional(), billingSource, billingIdentity: text.optional(),
  autoRenewStatus: z.enum(["on", "off", "unknown"]).optional(),
  cancellationState: z.enum(["none", "pending", "confirmed"]).optional(),
  cancellationRequestedAt: timestamp.optional(), cancellationConfirmedAt: timestamp.optional(),
  cancellationConfirmationReference: text.optional(), cancellationExpectedEndDate: localDateSchema.optional(),
  cancellationFollowUpDate: localDateSchema.optional(), cancellationFollowUpCompletedAt: timestamp.optional(),
  status: z.enum(["active", "trial", "cancelled", "uncertain"]), notes: text.optional(),
  reminderEnabled: z.boolean(), reminderIdentifier: id.optional(),
  reminderIdentifiers: z.array(id).max(20).optional(),
  sharedMemberIds: z.array(id).max(100).optional(),
  sharedMemberShares: z.record(id, z.number().finite().min(0).max(100)).optional(),
  createdAt: timestamp, updatedAt: timestamp,
});
export const settingsSchema = z.object({
  reminderDays: z.number().int().min(0).max(90),
  notificationsEnabled: z.boolean(), dashboardSort: z.enum(["upcoming", "highest-cost"]),
  monthlyBudget: money, budgetCurrency: currency.optional(),
  onboardingCompleted: z.boolean().optional(),
});
export const memberSchema = z.object({
  id, name: text.trim().min(1), color: z.string().regex(/^#[0-9a-f]{6}$/i),
  isOwner: z.boolean().optional(), createdAt: timestamp,
});
const chargeSchema = z.object({
  id, merchantLabel: text.trim().min(1), amount: money.optional(), currency: currency.optional(),
  chargeDate: localDateSchema.optional(), billingSource,
  paymentRail: z.enum(["card", "wallet", "carrier", "bank", "unknown"]),
  accountAlias: text.optional(), notes: text.optional(), matchedSubscriptionId: id.optional(),
  createdAt: timestamp, updatedAt: timestamp,
});
const correctionSchema = z.object({
  id, serviceId: id.optional(), serviceName: text.trim().min(1), country: text.trim().min(1),
  planName: text.optional(), observedPrice: text.optional(), sourceUrl: text.optional(),
  note: text.optional(), createdAt: timestamp,
});
const savingsSchema = z.object({
  id, subscriptionId: id.optional(), amount: money, currency,
  occurredOn: localDateSchema, note: text.trim().min(1),
});
export const snapshotSchema = z.object({
  subscriptions: z.array(subscriptionSchema).max(5000),
  settings: settingsSchema,
  householdMembers: z.array(memberSchema).max(100),
  chargeRecognitionCases: z.array(chargeSchema).max(5000).optional(),
  catalogCorrectionRequests: z.array(correctionSchema).max(5000).optional(),
  savingsEntries: z.array(savingsSchema).max(5000).optional(),
}).superRefine((snapshot, context) => {
  for (const key of ["subscriptions", "householdMembers", "chargeRecognitionCases", "catalogCorrectionRequests", "savingsEntries"] as const) {
    const ids = (snapshot[key] ?? []).map((record) => record.id);
    if (new Set(ids).size !== ids.length) context.addIssue({ code: "custom", path: [key], message: "Duplicate record IDs are not allowed." });
  }
});
export type ValidatedSnapshot = z.infer<typeof snapshotSchema>;
export const defaultAppSettings = { reminderDays: 3, notificationsEnabled: true, dashboardSort: "upcoming" as const, monthlyBudget: 0, budgetCurrency: "USD" };
export const defaultOwner = { id: "owner", name: "You", color: "#1A73E8", isOwner: true, createdAt: "2026-01-01T00:00:00.000Z" };
export const STORAGE_KEY = "subtrack.mvp.local-state.v1";
export const BACKUP_KEY = "subtrack.local-backups.v2";

/** Migrate legacy data without modifying the original storage key on a failed read. */
export function migrateLocalState(value: unknown): ValidatedSnapshot {
  const envelope = z.object({ schemaVersion: z.number().optional() }).passthrough().parse(value);
  if (envelope.schemaVersion !== undefined && ![1, 2].includes(envelope.schemaVersion)) {
    throw new Error("This data was created by a newer SubTrack version. Update the app first.");
  }
  return snapshotSchema.parse({
    ...envelope,
    subscriptions: envelope.subscriptions ?? [],
    householdMembers: envelope.householdMembers ?? [defaultOwner],
    settings: { ...defaultAppSettings, ...(typeof envelope.settings === "object" && envelope.settings ? envelope.settings : {}) },
    chargeRecognitionCases: envelope.chargeRecognitionCases ?? [],
    catalogCorrectionRequests: envelope.catalogCorrectionRequests ?? [],
    savingsEntries: envelope.savingsEntries ?? [],
  });
}

export function portableSnapshot(value: unknown): ValidatedSnapshot {
  const snapshot = snapshotSchema.parse(value);
  return {
    ...snapshot,
    subscriptions: snapshot.subscriptions.map(({ reminderIdentifier: _one, reminderIdentifiers: _many, ...record }) => record),
  };
}

export function createBackup(value: unknown, now = new Date()) {
  return { format: "subtrack-backup" as const, schemaVersion: 2 as const, exportedAt: now.toISOString(), data: portableSnapshot(value) };
}

export function parseBackup(serialized: string): ValidatedSnapshot {
  if (serialized.length > 10_000_000) throw new Error("Backup is too large. The limit is 10 MB.");
  const value: unknown = JSON.parse(serialized);
  const envelope = z.object({ format: z.literal("subtrack-backup"), schemaVersion: z.literal(2), exportedAt: timestamp, data: snapshotSchema }).safeParse(value);
  if (envelope.success) return portableSnapshot(envelope.data.data);
  if (value && typeof value === "object" && "format" in value) throw new Error("Unsupported or invalid backup format.");
  return portableSnapshot(migrateLocalState(value));
}

export function describeDataError(error: unknown) {
  return error instanceof z.ZodError
    ? `Invalid data: ${error.issues[0]?.path.join(".") || "backup"} (${error.issues[0]?.message}). Your existing records have not been changed.`
    : error instanceof Error ? error.message : "Data could not be read. Your existing records have not been changed.";
}
