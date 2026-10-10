import { act } from "react";
import { create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SubscriptionProvider, useSubscriptions } from "../lib/subscription-store";
import { STORAGE_KEY } from "../lib/data-safety";
import { emptySnapshot } from "../lib/local-state-repository";
import type { SubscriptionDraft } from "../lib/subscription-types";

const mocks = vi.hoisted(() => ({
  values: new Map<string, string>(), account: { accountId: undefined as string | undefined, canAccessApp: false },
  cancel: vi.fn(), schedule: vi.fn(), suspend: vi.fn(),
}));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (key: string) => mocks.values.get(key) ?? null,
    setItem: async (key: string, value: string) => { mocks.values.set(key, value); },
    removeItem: async (key: string) => { mocks.values.delete(key); },
  },
}));
vi.mock("../lib/account", () => ({ useAccount: () => mocks.account }));
vi.mock("react-native", () => ({ Platform: { OS: "web" } }));
vi.mock("../lib/reminders", () => ({
  cancelSubscriptionReminders: mocks.cancel, scheduleSubscriptionReminders: mocks.schedule,
  suspendRenewalReminders: mocks.suspend, serializeAccountReminders: (operation: () => Promise<unknown>) => operation(),
}));
let current: ReturnType<typeof useSubscriptions>;
let renderer: ReactTestRenderer | undefined;
function Probe() { current = useSubscriptions(); return null; }
const render = () => <SubscriptionProvider><Probe /></SubscriptionProvider>;
async function mount() { await act(async () => { renderer = create(render()); }); }
async function changeAccount(id?: string) {
  mocks.account = { accountId: id, canAccessApp: !!id };
  await act(async () => renderer!.update(render()));
}
const draft: SubscriptionDraft = {
  serviceId: "custom", planName: "Private plan", amount: 12, currency: "USD", cadence: "monthly",
  renewalDate: "2026-10-20", billingSource: "provider", status: "active", reminderEnabled: false,
};
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  mocks.values.clear(); mocks.account = { accountId: undefined, canAccessApp: false };
  mocks.cancel.mockReset().mockResolvedValue(undefined);
  mocks.schedule.mockReset().mockResolvedValue([]);
  mocks.suspend.mockReset().mockResolvedValue(undefined);
});
afterEach(async () => {
  if (renderer) await act(async () => renderer!.unmount());
  renderer = undefined; vi.unstubAllGlobals(); vi.restoreAllMocks();
});

describe("account-gated subscription store", () => {
  it("does not load or change legacy financial data before login", async () => {
    const saved = JSON.stringify({ ...emptySnapshot(), settings: { ...emptySnapshot().settings, monthlyBudget: 99 } });
    mocks.values.set(STORAGE_KEY, saved);
    await mount();
    expect(current.subscriptions).toEqual([]);
    expect(current.settings.monthlyBudget).toBe(0);
    await act(async () => { await expect(current.addSubscription(draft)).rejects.toThrow("Sign in"); });
    expect(mocks.schedule).not.toHaveBeenCalled();
    expect(mocks.values.get(STORAGE_KEY)).toBe(saved);
  });
  it("preserves local records across logout and the same account's next login", async () => {
    mocks.account = { accountId: "account-one", canAccessApp: true };
    await mount();
    await act(async () => { await current.addSubscription(draft); });
    expect(current.subscriptions).toHaveLength(1);
    await changeAccount();
    expect(current.subscriptions).toHaveLength(0);
    await changeAccount("account-one");
    expect(current.subscriptions[0].planName).toBe("Private plan");
  });
  it("does not expose the previous account's records after account switching", async () => {
    mocks.account = { accountId: "account-one", canAccessApp: true };
    await mount();
    await act(async () => { await current.addSubscription(draft); });
    await changeAccount("account-two");
    expect(current.subscriptions).toHaveLength(0);
    await act(async () => { await current.addSubscription({ ...draft, planName: "Other account plan" }); });
    await changeAccount("account-one");
    expect(current.subscriptions.map((record) => record.planName)).toEqual(["Private plan"]);
  });
  it("denies stale action callbacks after their account is logged out", async () => {
    mocks.account = { accountId: "account-one", canAccessApp: true };
    await mount();
    const oldAdd = current.addSubscription;
    await changeAccount();
    await act(async () => { await expect(oldAdd(draft)).rejects.toThrow("Sign in"); });
    expect(mocks.schedule).not.toHaveBeenCalled();
  });
});
