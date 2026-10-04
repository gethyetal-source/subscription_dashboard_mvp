import { describe, expect, it } from "vitest";
import { BACKUP_KEY, STORAGE_KEY, createBackup, migrateLocalState, parseBackup, portableSnapshot } from "../lib/data-safety";
import { LocalStateRepository, emptySnapshot } from "../lib/local-state-repository";
import { addBillingPeriod, billingOccurrences, buildReminderPlans } from "../lib/renewal-engine";
import type { SubscriptionRecord } from "../lib/subscription-types";

const record: SubscriptionRecord = {
  id: "one", serviceId: "netflix", planName: "Standard", amount: 10, currency: "USD",
  cadence: "monthly", renewalDate: "2026-01-31", billingSource: "provider",
  status: "active", reminderEnabled: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
};
function memoryStorage() {
  const values = new Map<string, string>();
  return { values, getItem: async (key: string) => values.get(key) ?? null, setItem: async (key: string, value: string) => { values.set(key, value); } };
}
describe("data safety", () => {
  it("migrates legacy exports without losing worksheets or correction drafts", () => {
    const source = { ...emptySnapshot(), subscriptions: [record] };
    const result = parseBackup(JSON.stringify(source));
    expect(result.subscriptions[0].id).toBe("one");
    expect(result.settings.budgetCurrency).toBe("USD");
    expect(parseBackup(JSON.stringify(createBackup(source)))).toEqual(portableSnapshot(source));
  });
  it("rejects malformed nested records, duplicates, impossible dates, and newer versions", () => {
    expect(() => migrateLocalState({ ...emptySnapshot(), subscriptions: [{ ...record, amount: -1 }] })).toThrow();
    expect(() => migrateLocalState({ ...emptySnapshot(), subscriptions: [record, record] })).toThrow();
    expect(() => migrateLocalState({ ...emptySnapshot(), subscriptions: [{ ...record, renewalDate: "2026-02-30" }] })).toThrow();
    expect(() => migrateLocalState({ ...emptySnapshot(), schemaVersion: 99 })).toThrow();
  });
  it("removes all device notification identifiers from portable files", () => {
    const source = { ...emptySnapshot(), subscriptions: [{ ...record, reminderIdentifier: "old", reminderIdentifiers: ["old", "trial"] }] };
    expect(createBackup(source).data.subscriptions[0].reminderIdentifier).toBeUndefined();
    expect(createBackup(source).data.subscriptions[0].reminderIdentifiers).toBeUndefined();
  });
  it("serializes rapid mutations instead of overwriting the preceding edit", async () => {
    const storage = memoryStorage();
    const repository = new LocalStateRepository(storage, () => undefined);
    await Promise.all([
      repository.update((current) => ({ ...current, subscriptions: [record, ...current.subscriptions] })),
      repository.update((current) => ({ ...current, subscriptions: [{ ...record, id: "two" }, ...current.subscriptions] })),
    ]);
    expect(repository.current.subscriptions.map((item) => item.id)).toEqual(["two", "one"]);
    expect(JSON.parse(storage.values.get(STORAGE_KEY)!).schemaVersion).toBe(2);
  });
  it("preserves unreadable storage and blocks silent replacement", async () => {
    const storage = memoryStorage(); storage.values.set(STORAGE_KEY, "{broken");
    const repository = new LocalStateRepository(storage, () => undefined);
    await repository.load();
    await expect(repository.update(() => emptySnapshot())).rejects.toThrow("has not been erased");
    expect(storage.values.get(STORAGE_KEY)).toBe("{broken");
    await repository.update(() => emptySnapshot(), true);
    expect(storage.values.get("subtrack.unreadable-state.v1")).toBe("{broken");
  });
  it("does not publish a new state if writing it fails", async () => {
    const storage = memoryStorage();
    const repository = new LocalStateRepository({ ...storage, setItem: async (key, value) => {
      if (key === STORAGE_KEY) throw new Error("Disk full");
      await storage.setItem(key, value);
    } }, () => undefined);
    await expect(repository.update((current) => ({ ...current, subscriptions: [record] }))).rejects.toThrow("Disk full");
    expect(repository.current.subscriptions).toEqual([]);
  });
  it("keeps no more than five rolling snapshots", async () => {
    const storage = memoryStorage(); const repository = new LocalStateRepository(storage, () => undefined);
    for (let i = 0; i < 8; i++) await repository.update((current) => ({ ...current, settings: { ...current.settings, monthlyBudget: i } }));
    expect(JSON.parse(storage.values.get(BACKUP_KEY)!)).toHaveLength(5);
  });
});
describe("renewal scheduling", () => {
  it("retains month-end and leap-year anchors without overflowing", () => {
    expect(addBillingPeriod("2026-01-31", "monthly", 1)).toBe("2026-02-28");
    expect(addBillingPeriod("2026-01-31", "monthly", 2)).toBe("2026-03-31");
    expect(addBillingPeriod("2024-02-29", "yearly", 1)).toBe("2025-02-28");
    expect(addBillingPeriod("2024-02-29", "yearly", 4)).toBe("2028-02-29");
  });
  it("rolls past renewal dates forward and excludes cancelled subscriptions", () => {
    expect(billingOccurrences(record, "2026-03-01", "2026-04-30")).toEqual(["2026-03-31", "2026-04-30"]);
    expect(billingOccurrences({ ...record, status: "cancelled" }, "2026-03-01", "2026-04-30")).toEqual([]);
  });
  it("schedules trial end separately from renewal, and follows up on cancellation", () => {
    const trial = { ...record, status: "trial" as const, trialEndDate: "2026-01-20", cancellationState: "pending" as const, cancellationFollowUpDate: "2026-01-18" };
    const plans = buildReminderPlans(trial, 3, new Date("2026-01-15T12:00:00"));
    expect(plans.some((plan) => plan.kind === "trial" && plan.dueDate === "2026-01-20")).toBe(true);
    expect(plans.some((plan) => plan.kind === "cancellation")).toBe(true);
    expect(plans.every((plan) => plan.fireAt > new Date("2026-01-15T12:00:00"))).toBe(true);
  });
  it("does not repeat a record with auto-renew explicitly off", () => {
    expect(billingOccurrences({ ...record, autoRenewStatus: "off" }, "2026-01-01", "2027-01-01")).toEqual(["2026-01-31"]);
  });
});
