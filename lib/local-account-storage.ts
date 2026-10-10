import { BACKUP_KEY, STORAGE_KEY } from "./data-safety";
import type { StorageAdapter } from "./local-state-repository";

export const LOCAL_DATA_OWNER_KEY = "subtrack.local-data.owner.v1";
export const ACTIVE_LOCAL_ACCOUNT_KEY = "subtrack.local-data.active-account.v1";
export const UNREADABLE_STATE_KEY = "subtrack.unreadable-state.v1";
const accountKeys = new Set([STORAGE_KEY, BACKUP_KEY, UNREADABLE_STATE_KEY]);
let ownerClaimTail: Promise<unknown> = Promise.resolve();

export function accountStorageKey(key: string, accountId: string) {
  if (!accountId || !/^[A-Za-z0-9_-]{1,200}$/.test(accountId)) throw new Error("A valid account is required to open local records.");
  return `${key}.account.${accountId}`;
}

/** Keep an existing device dataset with its first account; never move or erase it. */
export async function localAccountStorage(storage: StorageAdapter, accountId: string): Promise<StorageAdapter> {
  accountStorageKey(STORAGE_KEY, accountId);
  const claim = ownerClaimTail.catch(() => undefined).then(async () => {
    const existing = await storage.getItem(LOCAL_DATA_OWNER_KEY);
    if (existing) return existing;
    await storage.setItem(LOCAL_DATA_OWNER_KEY, accountId);
    return accountId;
  });
  ownerClaimTail = claim;
  const owner = await claim;
  const localKey = (key: string) => accountKeys.has(key) && owner !== accountId ? accountStorageKey(key, accountId) : key;
  return {
    getItem: (key) => storage.getItem(localKey(key)),
    setItem: (key, value) => storage.setItem(localKey(key), value),
  };
}

export async function localStateKeyForAccount(storage: StorageAdapter, accountId: string) {
  return (await storage.getItem(LOCAL_DATA_OWNER_KEY)) === accountId ? STORAGE_KEY : accountStorageKey(STORAGE_KEY, accountId);
}
