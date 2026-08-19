import type { LocalSubscriptionSnapshot } from "./subscription-store";

export type CloudSnapshot = LocalSubscriptionSnapshot & {
  schemaVersion: 1;
  syncedAt: string;
};

export function prepareCloudSnapshot(snapshot: LocalSubscriptionSnapshot): CloudSnapshot {
  return {
    schemaVersion: 1,
    syncedAt: new Date().toISOString(),
    settings: snapshot.settings,
    householdMembers: snapshot.householdMembers,
    subscriptions: snapshot.subscriptions.map(({ reminderIdentifier: _reminderIdentifier, ...record }) => record),
  };
}

export function isCloudSnapshot(value: unknown): value is CloudSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CloudSnapshot>;
  return candidate.schemaVersion === 1 && Array.isArray(candidate.subscriptions) && Array.isArray(candidate.householdMembers) && Boolean(candidate.settings);
}
