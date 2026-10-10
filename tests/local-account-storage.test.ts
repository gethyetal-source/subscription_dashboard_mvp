import { describe, expect, it } from "vitest";
import { BACKUP_KEY, STORAGE_KEY } from "../lib/data-safety";
import { accountStorageKey, localAccountStorage, localStateKeyForAccount, LOCAL_DATA_OWNER_KEY, UNREADABLE_STATE_KEY } from "../lib/local-account-storage";
import { emptySnapshot, LocalStateRepository } from "../lib/local-state-repository";

function storage() {
  const values = new Map<string, string>();
  return { values, getItem: async (key: string) => values.get(key) ?? null, setItem: async (key: string, value: string) => { values.set(key, value); } };
}

describe("device-local account isolation", () => {
  it("keeps every legacy dataset and backup in place for the first account", async () => {
    const device = storage();
    const original = JSON.stringify({ ...emptySnapshot(), settings: { ...emptySnapshot().settings, monthlyBudget: 90 } });
    device.values.set(STORAGE_KEY, original);
    device.values.set(BACKUP_KEY, "existing backup");
    device.values.set(UNREADABLE_STATE_KEY, "existing unreadable data");
    const account = await localAccountStorage(device, "account-one");
    expect(await account.getItem(STORAGE_KEY)).toBe(original);
    expect(await account.getItem(BACKUP_KEY)).toBe("existing backup");
    expect(await account.getItem(UNREADABLE_STATE_KEY)).toBe("existing unreadable data");
    expect(device.values.get(LOCAL_DATA_OWNER_KEY)).toBe("account-one");
  });
  it("gives another account separate records and recovery snapshots", async () => {
    const device = storage();
    const first = await localAccountStorage(device, "account-one");
    const second = await localAccountStorage(device, "account-two");
    await first.setItem(STORAGE_KEY, "private one");
    await first.setItem(BACKUP_KEY, "backup one");
    expect(await second.getItem(STORAGE_KEY)).toBeNull();
    await second.setItem(STORAGE_KEY, "private two");
    await second.setItem(BACKUP_KEY, "backup two");
    expect(await first.getItem(STORAGE_KEY)).toBe("private one");
    expect(await second.getItem(STORAGE_KEY)).toBe("private two");
    expect(await second.getItem(BACKUP_KEY)).toBe("backup two");
    expect(device.values.get(STORAGE_KEY)).toBe("private one");
    expect(device.values.get(accountStorageKey(STORAGE_KEY, "account-two"))).toBe("private two");
  });
  it("serializes first-account claims when a session changes during startup", async () => {
    const device = storage();
    device.values.set(STORAGE_KEY, "legacy private");
    const [first, second] = await Promise.all([localAccountStorage(device, "account-one"), localAccountStorage(device, "account-two")]);
    expect(await first.getItem(STORAGE_KEY)).toBe("legacy private");
    expect(await second.getItem(STORAGE_KEY)).toBeNull();
    expect(device.values.get(LOCAL_DATA_OWNER_KEY)).toBe("account-one");
  });
  it("reopens the same account's data without reassigning an earlier owner's records", async () => {
    const device = storage();
    const first = await localAccountStorage(device, "account-one");
    await first.setItem(STORAGE_KEY, "original");
    const second = await localAccountStorage(device, "account-two");
    await second.setItem(STORAGE_KEY, "other");
    const reopened = await localAccountStorage(device, "account-one");
    expect(await reopened.getItem(STORAGE_KEY)).toBe("original");
    expect(await localStateKeyForAccount(device, "account-one")).toBe(STORAGE_KEY);
    expect(await localStateKeyForAccount(device, "account-two")).toBe(accountStorageKey(STORAGE_KEY, "account-two"));
  });
  it("limits resets to the current account, including recovery data", async () => {
    const device = storage();
    const first = await localAccountStorage(device, "account-one");
    const second = await localAccountStorage(device, "account-two");
    await first.setItem(BACKUP_KEY, "first backup");
    await first.setItem(UNREADABLE_STATE_KEY, "first unreadable");
    await second.setItem(BACKUP_KEY, "second backup");
    await second.setItem(UNREADABLE_STATE_KEY, "second unreadable");
    await second.setItem(BACKUP_KEY, "[]");
    await second.setItem(UNREADABLE_STATE_KEY, "");
    expect(await first.getItem(BACKUP_KEY)).toBe("first backup");
    expect(await first.getItem(UNREADABLE_STATE_KEY)).toBe("first unreadable");
  });
  it("never reassigns legacy records after a storage failure or invalid account identifier", async () => {
    const device = storage();
    device.values.set(STORAGE_KEY, "legacy private");
    await expect(localAccountStorage({ ...device, setItem: async () => { throw new Error("Disk full"); } }, "account-one")).rejects.toThrow("Disk full");
    expect(device.values.get(STORAGE_KEY)).toBe("legacy private");
    await expect(localAccountStorage(device, "../other")).rejects.toThrow("valid account");
  });
  it("preserves recovery points when only device reminder bookkeeping changes", async () => {
    const device = storage();
    const account = await localAccountStorage(device, "account-one");
    const repository = new LocalStateRepository(account, () => undefined);
    await repository.update((current) => ({ ...current, settings: { ...current.settings, monthlyBudget: 1 } }));
    const backups = await account.getItem(BACKUP_KEY);
    await repository.update((current) => ({ ...current, settings: { ...current.settings, monthlyBudget: 2 } }), false, false);
    expect(await account.getItem(BACKUP_KEY)).toBe(backups);
  });
});
