import type { LocalSubscriptionSnapshot } from "./subscription-store";
import { portableSnapshot, snapshotSchema } from "./data-safety";

export type CloudSnapshot = LocalSubscriptionSnapshot & {
  schemaVersion: 1;
  syncedAt: string;
};

export type CloudRestorePreview = {
  syncedAt: string;
  cloudSubscriptionCount: number;
  cloudActiveSubscriptionCount: number;
  cloudHouseholdMemberCount: number;
  localSubscriptionCount: number;
  localHouseholdMemberCount: number;
};

export function prepareCloudSnapshot(snapshot: LocalSubscriptionSnapshot): CloudSnapshot {
  return {
    schemaVersion: 1,
    syncedAt: new Date().toISOString(),
    ...portableSnapshot(snapshot),
  };
}

export function isCloudSnapshot(value: unknown): value is CloudSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CloudSnapshot>;
  return candidate.schemaVersion === 1 && typeof candidate.syncedAt === "string" && Number.isFinite(Date.parse(candidate.syncedAt)) && snapshotSchema.safeParse(candidate).success;
}

export function createCloudRestorePreview(cloud: CloudSnapshot, local: LocalSubscriptionSnapshot): CloudRestorePreview {
  return {
    syncedAt: cloud.syncedAt,
    cloudSubscriptionCount: cloud.subscriptions.length,
    cloudActiveSubscriptionCount: cloud.subscriptions.filter((subscription) => subscription.status !== "cancelled").length,
    cloudHouseholdMemberCount: cloud.householdMembers.length,
    localSubscriptionCount: local.subscriptions.length,
    localHouseholdMemberCount: local.householdMembers.length,
  };
}
