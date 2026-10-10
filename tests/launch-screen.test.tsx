import { act } from "react";
import { create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LaunchScreen } from "../components/launch-screen";
import { LAUNCH_HOLD_MS } from "../lib/launch";

const native = vi.hoisted(() => ({
  hide: vi.fn(),
  motion: vi.fn(),
  timings: vi.fn(),
  loops: vi.fn(),
  platform: { OS: "android" },
}));

vi.mock("expo-splash-screen", () => ({ hideAsync: native.hide }));
vi.mock("../components/brand-mark", () => ({ BrandMark: "BrandMark" }));
vi.mock("react-native-svg", () => ({ default: "Svg", Circle: "Circle", Defs: "Defs", RadialGradient: "RadialGradient", Stop: "Stop" }));
vi.mock("react-native", () => {
  class Value {
    constructor(public value: number) {}
    setValue(value: number) { this.value = value; }
    interpolate() { return this.value; }
  }
  return {
    AccessibilityInfo: { isReduceMotionEnabled: native.motion },
    Platform: native.platform,
    StyleSheet: { create: (styles: unknown) => styles, absoluteFillObject: {} },
    Text: "Text",
    View: "View",
    Animated: {
      Value,
      View: "AnimatedView",
      timing: (value: Value, config: { toValue: number; duration: number; useNativeDriver: boolean }) => {
        native.timings(config);
        let timer: ReturnType<typeof setTimeout> | undefined;
        return {
          start: (callback?: (result: { finished: boolean }) => void) => {
            timer = setTimeout(() => { value.setValue(config.toValue); callback?.({ finished: true }); }, config.duration);
          },
          stop: () => clearTimeout(timer),
        };
      },
      sequence: () => ({ start: vi.fn(), stop: vi.fn() }),
      loop: () => {
        const animation = { start: vi.fn(), stop: vi.fn() };
        native.loops(animation);
        return animation;
      },
    },
  };
});

let renderer: ReactTestRenderer | undefined;
const advance = async (milliseconds: number) => {
  await act(async () => { await vi.advanceTimersByTimeAsync(milliseconds); });
};
const hasOverlay = () => renderer!.root.findAllByProps({ testID: "launch-screen" }).length > 0;
async function mount(props: { ready: boolean; fontsLoaded?: boolean; fontsReady?: boolean } = { ready: true }) {
  await act(async () => { renderer = create(<LaunchScreen {...props}><div>Private app content</div></LaunchScreen>); });
  await act(async () => { renderer!.root.findByProps({ testID: "launch-screen" }).props.onLayout(); });
}
async function present() {
  await advance(16);
  await advance(16);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 16));
  vi.stubGlobal("cancelAnimationFrame", (id: ReturnType<typeof setTimeout>) => clearTimeout(id));
  const reportError = console.error;
  vi.spyOn(console, "error").mockImplementation((...args) => {
    if (String(args[0]).startsWith("react-test-renderer is deprecated")) return;
    reportError(...args);
  });
  native.platform.OS = "android";
  native.hide.mockReset().mockResolvedValue(undefined);
  native.motion.mockReset().mockResolvedValue(false);
  native.timings.mockClear();
  native.loops.mockClear();
});

afterEach(async () => {
  if (renderer) await act(async () => renderer!.unmount());
  renderer = undefined;
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("native launch handoff", () => {
  it("starts the animation and full visible hold only after the native splash hides", async () => {
    let hide!: () => void;
    native.hide.mockReturnValue(new Promise<void>((resolve) => { hide = resolve; }));
    await mount();
    await advance(5000);
    expect(hasOverlay()).toBe(true);
    expect(native.timings).not.toHaveBeenCalled();
    await act(async () => { hide(); });
    await present();
    expect(native.timings).toHaveBeenCalledWith({ toValue: 1, duration: 500, useNativeDriver: true });
    await advance(LAUNCH_HOLD_MS - 1);
    expect(hasOverlay()).toBe(true);
    await advance(1);
    expect(hasOverlay()).toBe(true);
    await advance(180);
    expect(hasOverlay()).toBe(false);
  });
  it("plays again on every fresh mount instead of remembering a one-time intro", async () => {
    for (let launch = 0; launch < 2; launch++) {
      await mount();
      await present();
      expect(hasOverlay()).toBe(true);
      await advance(LAUNCH_HOLD_MS);
      await advance(180);
      expect(hasOverlay()).toBe(false);
      await act(async () => renderer!.unmount());
      renderer = undefined;
    }
    expect(native.hide).toHaveBeenCalledTimes(2);
    expect(native.loops).toHaveBeenCalledTimes(2);
  });
  it("waits for fonts before hiding the native splash or starting the intro", async () => {
    await mount({ ready: false, fontsLoaded: false, fontsReady: false });
    await advance(5000);
    expect(native.hide).not.toHaveBeenCalled();
    expect(native.timings).not.toHaveBeenCalled();
    await act(async () => renderer!.update(<LaunchScreen ready fontsLoaded fontsReady><div>Ready</div></LaunchScreen>));
    await present();
    await advance(LAUNCH_HOLD_MS);
    await advance(180);
    expect(hasOverlay()).toBe(false);
  });
  it("keeps private content hidden while local storage or privacy is not ready", async () => {
    await mount({ ready: false });
    await present();
    await advance(LAUNCH_HOLD_MS + 1000);
    expect(hasOverlay()).toBe(true);
    const hidden = renderer!.root.findAll((view) => view.props.importantForAccessibility === "no-hide-descendants")[0];
    expect(hidden?.props.style.display).toBe("none");
    await act(async () => renderer!.update(<LaunchScreen ready><div>Ready</div></LaunchScreen>));
    await advance(180);
    expect(hasOverlay()).toBe(false);
  });
  it("supports a font-error fallback without hanging the app", async () => {
    await mount({ ready: true, fontsLoaded: false, fontsReady: true });
    await present();
    await advance(LAUNCH_HOLD_MS);
    await advance(180);
    expect(hasOverlay()).toBe(false);
  });
  it("skips entrance, pulsing, and the visible hold when reduced motion is enabled", async () => {
    native.motion.mockResolvedValue(true);
    await mount();
    await present();
    await advance(0);
    await advance(0);
    expect(hasOverlay()).toBe(false);
    expect(native.loops).not.toHaveBeenCalled();
    expect(native.timings.mock.calls.every(([config]) => config.duration === 0)).toBe(true);
  });
  it("continues safely if the system splash is already hidden", async () => {
    native.hide.mockRejectedValue(new Error("Already hidden"));
    await mount();
    await present();
    await advance(LAUNCH_HOLD_MS);
    await advance(180);
    expect(hasOverlay()).toBe(false);
  });
  it("does not start animations after an unmount during the native handoff", async () => {
    let hide!: () => void;
    native.hide.mockReturnValue(new Promise<void>((resolve) => { hide = resolve; }));
    await mount();
    await act(async () => renderer!.unmount());
    renderer = undefined;
    await act(async () => { hide(); });
    await advance(100);
    expect(native.timings).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("uses the web handoff without calling native splash APIs", async () => {
    native.platform.OS = "web";
    await mount();
    await present();
    await advance(LAUNCH_HOLD_MS);
    await advance(180);
    expect(hasOverlay()).toBe(false);
    expect(native.hide).not.toHaveBeenCalled();
    expect(native.timings.mock.calls.every(([config]) => config.useNativeDriver === false)).toBe(true);
  });
});
