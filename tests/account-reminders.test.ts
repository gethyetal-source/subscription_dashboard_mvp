import { beforeEach, describe, expect, it, vi } from "vitest";
import { serializeAccountReminders, suspendRenewalReminders } from "../lib/reminders";

const native = vi.hoisted(() => ({
  scheduled: vi.fn(), delivered: vi.fn(), cancel: vi.fn(), dismiss: vi.fn(), clearResponse: vi.fn(),
}));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("expo-notifications", () => ({
  setNotificationHandler: vi.fn(), getAllScheduledNotificationsAsync: native.scheduled,
  getPresentedNotificationsAsync: native.delivered, cancelScheduledNotificationAsync: native.cancel,
  dismissNotificationAsync: native.dismiss, clearLastNotificationResponseAsync: native.clearResponse,
}));
beforeEach(() => {
  native.scheduled.mockReset().mockResolvedValue([]);
  native.delivered.mockReset().mockResolvedValue([]);
  native.cancel.mockReset().mockResolvedValue(undefined);
  native.dismiss.mockReset().mockResolvedValue(undefined);
  native.clearResponse.mockReset().mockResolvedValue(undefined);
});

describe("logged-out notification privacy", () => {
  it("cancels and dismisses renewal notifications without touching unrelated notices", async () => {
    native.scheduled.mockResolvedValue([
      { identifier: "renewal", content: { data: { subscriptionId: "private" } } },
      { identifier: "other", content: { data: {} } },
    ]);
    native.delivered.mockResolvedValue([
      { request: { identifier: "delivered-renewal", content: { data: { subscriptionId: "private" } } } },
      { request: { identifier: "other", content: { data: {} } } },
    ]);
    await suspendRenewalReminders();
    expect(native.cancel).toHaveBeenCalledTimes(1);
    expect(native.cancel).toHaveBeenCalledWith("renewal");
    expect(native.dismiss).toHaveBeenCalledTimes(1);
    expect(native.dismiss).toHaveBeenCalledWith("delivered-renewal");
    expect(native.clearResponse).toHaveBeenCalledTimes(1);
  });
  it("serializes cleanup before scheduling another account's reminders", async () => {
    const order: string[] = [];
    let release!: () => void;
    const first = serializeAccountReminders(async () => {
      order.push("old cleanup started");
      await new Promise<void>((resolve) => { release = resolve; });
      order.push("old cleanup finished");
    });
    const second = serializeAccountReminders(async () => { order.push("new account prepared"); });
    await Promise.resolve(); await Promise.resolve();
    expect(order).toEqual(["old cleanup started"]);
    release(); await Promise.all([first, second]);
    expect(order).toEqual(["old cleanup started", "old cleanup finished", "new account prepared"]);
  });
});
