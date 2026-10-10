import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import Head from "expo-router/head";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, Text, TextInput } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";
import { SubscriptionProvider, useSubscriptions } from "@/lib/subscription-store";
import { AccountProvider, useAccount } from "@/lib/account";
import { PrivacyProvider } from "@/lib/privacy";
import { AppExperience } from "@/components/app-experience";
import { LaunchScreen } from "@/components/launch-screen";
import * as SplashScreen from "expo-splash-screen";

if (Platform.OS !== "web") {
  SplashScreen.setOptions({ duration: 0, fade: false });
  void SplashScreen.preventAutoHideAsync().catch(() => undefined);
}

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

const defaultTextProps = (Text as typeof Text & { defaultProps?: { style?: unknown } }).defaultProps ?? {};
(Text as typeof Text & { defaultProps?: { style?: unknown } }).defaultProps = {
  ...defaultTextProps,
  style: [defaultTextProps.style, { fontFamily: "Poppins-Regular" }],
};

const defaultTextInputProps = (TextInput as typeof TextInput & { defaultProps?: { style?: unknown } }).defaultProps ?? {};
(TextInput as typeof TextInput & { defaultProps?: { style?: unknown } }).defaultProps = {
  ...defaultTextInputProps,
  style: [defaultTextInputProps.style, { fontFamily: "Poppins-Regular" }],
};

export const unstable_settings = {
  anchor: "(tabs)",
};

function PreparedApp({ fontsReady, onReady, children }: React.PropsWithChildren<{ fontsReady: boolean; onReady: () => void }>) {
  const store = useSubscriptions();
  const [privacyReady, setPrivacyReady] = useState(false);
  const onPrivacyReady = useCallback(() => setPrivacyReady(true), []);
  useEffect(() => { if ((store.isReady || !!store.storageError) && privacyReady) onReady(); }, [store.isReady, store.storageError, privacyReady, onReady]);
  return <PrivacyProvider onReady={onPrivacyReady}>{fontsReady ? children : null}</PrivacyProvider>;
}

function AccountApp({ fontsLoaded, fontsReady }: { fontsLoaded: boolean; fontsReady: boolean }) {
  const account = useAccount();
  const [prepared, setPrepared] = useState(false);
  const onReady = useCallback(() => setPrepared(true), []);
  return <LaunchScreen ready={fontsReady && prepared && !account.isLoading} fontsLoaded={fontsLoaded} fontsReady={fontsReady}>
    <SubscriptionProvider>
      <PreparedApp fontsReady={fontsReady} onReady={onReady}>
        <AppExperience>
          <Head><title>SubTrack</title><meta name="description" content="Track subscriptions privately on your device. Sign in with Google or email." /><meta name="referrer" content="no-referrer" /></Head>
          <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
            <Stack.Protected guard={account.canAccessApp}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="service/[id]" />
              <Stack.Screen name="compare/[serviceId]" />
              <Stack.Screen name="subscription/[id]" />
              <Stack.Screen name="subscription/edit" options={{ presentation: "modal" }} />
              <Stack.Screen name="subscription/custom" />
              <Stack.Screen name="household" />
              <Stack.Screen name="control-center" />
              <Stack.Screen name="decision-plan" />
              <Stack.Screen name="charge-recognition" />
              <Stack.Screen name="catalog-updates" />
              <Stack.Screen name="catalog-correction" />
              <Stack.Screen name="evidence-index" />
              <Stack.Screen name="archive-insights" />
              <Stack.Screen name="backup" />
              <Stack.Screen name="quick-add" />
              <Stack.Screen name="import" />
              <Stack.Screen name="renewals" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="privacy-controls" />
              <Stack.Screen name="regional-plans" />
              <Stack.Screen name="shared-household" />
              <Stack.Screen name="tools" />
            </Stack.Protected>
            <Stack.Screen name="login" />
            <Stack.Screen name="oauth/callback" />
            <Stack.Screen name="password-reset" />
            <Stack.Screen name="privacy-policy" />
            <Stack.Screen name="delete-account" />
            <Stack.Screen name="cloud-sync" />
          </Stack>
          <StatusBar style="auto" />
        </AppExperience>
      </PreparedApp>
    </SubscriptionProvider>
  </LaunchScreen>;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "Poppins-Regular": require("../assets/fonts/Poppins-Regular.ttf"),
    "Poppins-Medium": require("../assets/fonts/Poppins-Medium.ttf"),
    "Poppins-SemiBold": require("../assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-Bold": require("../assets/fonts/Poppins-Bold.ttf"),
  });
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  // Initialize Manus runtime for cookie injection from parent container
  useEffect(() => {
    initManusRuntime();
  }, []);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  // Create clients once and reuse them
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Disable automatic refetching on window focus for mobile
            refetchOnWindowFocus: false,
            // Retry failed requests once
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  // Ensure minimum 8px padding for top and bottom on mobile
  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <AccountProvider><AccountApp fontsLoaded={fontsLoaded} fontsReady={fontsLoaded || !!fontError} /></AccountProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}
