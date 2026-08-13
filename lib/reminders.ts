import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import type { SubscriptionRecord } from "@/lib/subscription-types";
import { daysUntil } from "@/lib/subscription-utils";
import { getService } from "@/lib/catalog";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function prepareNotifications() {
  if (Platform.OS === "web") return false;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("renewals", {
      name: "Renewal reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180],
      lightColor: "#0E9F8A",
    });
  }
  const current = await Notifications.getPermissionsAsync();
  const status = current.status === "granted" ? current.status : (await Notifications.requestPermissionsAsync()).status;
  return status === "granted";
}

export async function scheduleRenewalReminder(subscription: SubscriptionRecord, daysBefore: number) {
  if (Platform.OS === "web" || !subscription.reminderEnabled || subscription.status === "cancelled") return undefined;
  const hasPermission = await prepareNotifications();
  if (!hasPermission) return undefined;

  const triggerDate = new Date(`${subscription.renewalDate}T09:00:00`);
  triggerDate.setDate(triggerDate.getDate() - daysBefore);
  if (triggerDate.getTime() <= Date.now() || daysUntil(subscription.renewalDate) < 0) return undefined;

  const service = getService(subscription.serviceId);
  return Notifications.scheduleNotificationAsync({
    content: {
      title: `${service?.name ?? "Subscription"} renews soon`,
      body: `Your ${subscription.planName} plan renews on ${subscription.renewalDate}.`,
      data: { subscriptionId: subscription.id, url: `/subscription/${subscription.id}` },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: "renewals",
    },
  });
}

export async function cancelRenewalReminder(identifier?: string) {
  if (!identifier || Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // The operating system may have already removed an expired reminder.
  }
}
