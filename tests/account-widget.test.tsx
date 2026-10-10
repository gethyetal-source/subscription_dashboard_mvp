import { act } from "react";
import { create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LOGOUT_PENDING_KEY, RECOVERY_PENDING_KEY } from "../lib/account-utils";
import { ACTIVE_LOCAL_ACCOUNT_KEY, accountStorageKey, LOCAL_DATA_OWNER_KEY } from "../lib/local-account-storage";
import { STORAGE_KEY } from "../lib/data-safety";
import { emptySnapshot } from "../lib/local-state-repository";
import { refreshWidget } from "../lib/widget-entry.native";

const mocks = vi.hoisted(() => ({ values: new Map<string, string>(), getItem: vi.fn(), register: vi.fn(), update: vi.fn() }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: mocks.getItem } }));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("react-native-android-widget", () => ({
  FlexWidget: "FlexWidget", TextWidget: "TextWidget", registerWidgetTaskHandler: mocks.register,
  requestWidgetUpdate: mocks.update, requestPinWidget: vi.fn(),
}));
let renderer: ReactTestRenderer | undefined;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  mocks.values.clear(); mocks.getItem.mockReset().mockImplementation(async (key: string) => mocks.values.get(key) ?? null);
  mocks.update.mockReset().mockImplementation(async ({ renderWidget }: { renderWidget: () => Promise<React.ReactElement> }) => {
    await act(async () => { renderer = create(await renderWidget()); });
  });
});
afterEach(async () => {
  if (renderer) await act(async () => renderer!.unmount());
  renderer = undefined;
  vi.unstubAllGlobals(); vi.restoreAllMocks();
});
const displayed = () => renderer!.root.findAllByType("TextWidget" as React.ElementType).map((node) => node.props.text).join(" ");
const data = (planName: string) => JSON.stringify({ ...emptySnapshot(), subscriptions: [{
  id: "test", serviceId: "custom", planName, amount: 12, currency: "USD", cadence: "monthly", status: "active",
  renewalDate: "2026-10-20", billingSource: "provider", reminderEnabled: false,
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
}] });

describe("widget account privacy", () => {
  it("never reads financial records when the device has no signed-in account", async () => {
    mocks.values.set(STORAGE_KEY, data("Private legacy plan"));
    await refreshWidget();
    expect(displayed()).toContain("Sign in");
    expect(displayed()).not.toContain("Private legacy plan");
    expect(mocks.getItem).not.toHaveBeenCalledWith(STORAGE_KEY);
  });
  it.each([LOGOUT_PENDING_KEY, RECOVERY_PENDING_KEY])("hides records behind the %s marker", async (marker) => {
    mocks.values.set(ACTIVE_LOCAL_ACCOUNT_KEY, "account-one");
    mocks.values.set(marker, "true");
    mocks.values.set(STORAGE_KEY, data("Private plan"));
    await refreshWidget();
    expect(displayed()).toContain("Sign in");
    expect(mocks.getItem).not.toHaveBeenCalledWith(STORAGE_KEY);
  });
  it("reads only the active account's local dataset", async () => {
    mocks.values.set(LOCAL_DATA_OWNER_KEY, "account-one");
    mocks.values.set(ACTIVE_LOCAL_ACCOUNT_KEY, "account-two");
    mocks.values.set(STORAGE_KEY, data("First account plan"));
    mocks.values.set(accountStorageKey(STORAGE_KEY, "account-two"), data("Second account plan"));
    await refreshWidget();
    expect(displayed()).toContain("Second account plan");
    expect(displayed()).not.toContain("First account plan");
    expect(mocks.getItem).not.toHaveBeenCalledWith(STORAGE_KEY);
  });
  it("does not read plan records when device app lock is enabled", async () => {
    mocks.values.set(ACTIVE_LOCAL_ACCOUNT_KEY, "account-one");
    mocks.values.set("subtrack.device-privacy.v1", JSON.stringify({ appLockEnabled: true }));
    await refreshWidget();
    expect(displayed()).toContain("App lock is enabled");
    expect(mocks.getItem).not.toHaveBeenCalledWith(STORAGE_KEY);
  });
});
