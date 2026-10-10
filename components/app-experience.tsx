import { useEffect, useRef, type PropsWithChildren } from "react";
import { AppState, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { useSubscriptions } from "@/lib/subscription-store";
import { usePrivacy } from "@/lib/privacy";
import { usePalette } from "@/lib/ui-theme";
import { refreshWidget } from "@/lib/widget-entry";
import { useAccount } from "@/lib/account";

export function AppExperience({ children }: PropsWithChildren) {
  const store = useSubscriptions(); const privacy = usePrivacy(); const colors = usePalette();
  const account = useAccount();
  const latest = useRef(store); latest.current = store;
  const unlocked = useRef(account.canAccessApp); unlocked.current = account.canAccessApp;
  const handled = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!store.isReady || !account.canAccessApp) return;
    const openNotification = (response: Notifications.NotificationResponse | null) => {
      if (!response || !unlocked.current) return;
      const identifier = response.notification.request.identifier;
      if (handled.current === identifier) return;
      const id = response.notification.request.content.data?.subscriptionId;
      if (typeof id !== "string" || !latest.current.subscriptions.some((record) => record.id === id)) return;
      handled.current = identifier;
      router.push({ pathname: "/subscription/[id]", params: { id } });
      void Notifications.clearLastNotificationResponseAsync();
    };
    void Notifications.getLastNotificationResponseAsync().then(openNotification).catch(() => undefined);
    const listener = Notifications.addNotificationResponseReceivedListener(openNotification);
    return () => listener.remove();
  }, [store.isReady, account.canAccessApp]);
  useEffect(() => { void refreshWidget().catch(() => undefined); }, [store.subscriptions, store.isReady, privacy.hideAmounts, privacy.appLockEnabled, account.canAccessApp]);
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshWidget().catch(() => undefined);
    });
    return () => listener.remove();
  }, []);
  return <View style={{ flex: 1 }}>
    {store.storageError && account.canAccessApp ? <Pressable accessibilityRole="button" onPress={() => router.push("/backup" as never)} style={{ backgroundColor: colors.elevated, padding: 16 }}><Text style={{ color: colors.danger }}>Saved data needs recovery. Open Backup & restore.</Text></Pressable> : null}
    {children}
  </View>;
}
