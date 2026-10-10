import { Redirect, router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { Button, Card, Copy, Notice } from "@/components/app-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useAccount } from "@/lib/account";
import { usePalette } from "@/lib/ui-theme";

export default function OAuthCallback() {
  const account = useAccount();
  const colors = usePalette();
  useEffect(() => {
    if (Platform.OS !== "web" || !account.authCallbackMessage || account.isLoading) return;
    // Clean after the router's initial commit, which can restore the original URL.
    let secondFrame: number;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => window.history.replaceState(null, "", "/oauth/callback"));
    });
    return () => { cancelAnimationFrame(firstFrame); if (secondFrame) cancelAnimationFrame(secondFrame); };
  }, [account.authCallbackMessage, account.isLoading]);
  if (!account.isLoading && !account.isCompletingCallback) {
    if (account.authCallbackMessage) return <ScreenContainer><View style={{ padding: 24, flex: 1, justifyContent: "center" }}><Card title="Sign-in needs attention">
      <Notice error>{account.authCallbackMessage}</Notice>
      <Button label="Back to sign in" onPress={() => { account.clearAuthCallbackMessage(); router.replace("/login"); }} />
    </Card></View></ScreenContainer>;
    if (account.recoveryRequired && account.isSignedIn) return <Redirect href="/password-reset" />;
    if (account.canAccessApp) return <Redirect href="/(tabs)" />;
    return <Redirect href="/login" />;
  }
  return <ScreenContainer><View style={{ alignItems: "center", justifyContent: "center", flex: 1, gap: 12 }}>
    <ActivityIndicator color={colors.primary} /><Copy muted>Completing your sign-in…</Copy>
  </View></ScreenContainer>;
}
