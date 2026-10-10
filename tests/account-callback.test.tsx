import { act } from "react";
import { create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OAuthCallback from "../app/oauth/callback";

const mocks = vi.hoisted(() => ({
  account: { authCallbackMessage: undefined as string | undefined, isLoading: false, isCompletingCallback: false, recoveryRequired: false, isSignedIn: false, canAccessApp: false, clearAuthCallbackMessage: vi.fn() },
  platform: { OS: "web" }, replace: vi.fn(), history: vi.fn(),
}));
vi.mock("../lib/account", () => ({ useAccount: () => mocks.account }));
vi.mock("../lib/ui-theme", () => ({ usePalette: () => ({ primary: "#087F69" }) }));
vi.mock("../components/app-ui", () => ({ Button: "Button", Card: "Card", Copy: "Copy", Notice: "Notice" }));
vi.mock("../components/screen-container", () => ({ ScreenContainer: "ScreenContainer" }));
vi.mock("react-native", () => ({ ActivityIndicator: "ActivityIndicator", Platform: mocks.platform, View: "View" }));
vi.mock("expo-router", () => ({ Redirect: "Redirect", router: { replace: mocks.replace } }));
let renderer: ReactTestRenderer | undefined;
let frames: FrameRequestCallback[];
beforeEach(() => {
  frames = [];
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.stubGlobal("window", { history: { replaceState: mocks.history } });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  mocks.account.authCallbackMessage = undefined;
  mocks.account.isLoading = false; mocks.account.isSignedIn = false; mocks.account.canAccessApp = false;
  mocks.account.recoveryRequired = false; mocks.platform.OS = "web";
  mocks.replace.mockClear(); mocks.history.mockClear();
});
afterEach(async () => {
  if (renderer) await act(async () => renderer!.unmount());
  renderer = undefined; vi.unstubAllGlobals(); vi.restoreAllMocks();
});

describe("safe callback error screens", () => {
  it("cleans the failed web callback after router paint without losing its error state", async () => {
    mocks.account.authCallbackMessage = "Google sign-in was cancelled.";
    await act(async () => { renderer = create(<OAuthCallback />); });
    expect(mocks.history).not.toHaveBeenCalled();
    await act(async () => { frames[0](0); frames[1](16); });
    expect(mocks.history).toHaveBeenCalledWith(null, "", "/oauth/callback");
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(renderer!.root.findByType("Notice" as React.ElementType).children).toContain("Google sign-in was cancelled.");
  });
  it("routes a recovery session to password reset instead of financial screens", async () => {
    mocks.account.isSignedIn = true; mocks.account.recoveryRequired = true;
    await act(async () => { renderer = create(<OAuthCallback />); });
    expect(renderer!.root.findByType("Redirect" as React.ElementType).props.href).toBe("/password-reset");
    expect(mocks.history).not.toHaveBeenCalled();
  });
  it("does not manipulate native browser history", async () => {
    mocks.platform.OS = "android"; mocks.account.authCallbackMessage = "Sign-in needs attention.";
    await act(async () => { renderer = create(<OAuthCallback />); });
    expect(frames).toHaveLength(0);
    expect(mocks.history).not.toHaveBeenCalled();
  });
});
