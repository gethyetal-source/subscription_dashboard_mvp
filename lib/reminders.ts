import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import type { SubscriptionRecord } from "@/lib/subscription-types";
import { daysUntil } from "@/lib/subscription-utils";
import { getService } from "@/lib/catalog";
import type { ReminderPermissionState } from "@/lib/reminder-utils";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensureRenewalChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("renewals", {
    name: "Renewal reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180],
    lightColor: "#0E9F8A",
  });
}

export async function getReminderPermissionState(): Promise<ReminderPermissionState> {
  if (Platform.OS === "web") return "unsupported";
  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return "granted";
  return current.status === "denied" ? "denied" : "undetermined";
}

export async function requestReminderPermission(): Promise<ReminderPermissionState> {
  if (Platform.OS === "web") return "unsupported";
  await ensureRenewalChannel();
  const current = await getReminderPermissionState();
  if (current === "granted" || current === "denied") return current;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted" ? "granted" : requested.status === "denied" ? "denied" : "undetermined";
}

export async function getScheduledRenewalReminderCount() {
  if (Platform.OS === "web") return undefined;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.filter((notification) => typeof notification.content.data?.subscriptionId === "string").length;
  } catch {
    return undefined;
  }
}

export async function prepareNotifications() {
  if (Platform.OS === "web") return false;
  await ensureRenewalChannel();
  return (await getReminderPermissionState()) === "granted";
}

export async function scheduleRenewalReminder(subscription: SubscriptionRecord, daysBefore: number) {
  if (Platform.OS === "web" || !subscription.reminderEnabled || subscription.status === "cancelled") return undefined;
  const hasPermission = await prepareNotifications();
  if (!hasPermission) return undefined;
  await ensureRenewalChannel();
  
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

/*
 * Kept as the local scheduling entry point for the subscription store. It no
 * longer opens the operating-system permission prompt; that prompt now occurs
 * only when the user explicitly asks for reminders in Settings.
 */
export async function scheduleRenewalReminderLegacy(subscription: SubscriptionRecord, daysBefore: number) {
  return scheduleRenewalReminder(subscription, daysBefore);
}

export async function cancelRenewalReminder(identifier?: string) {
  if (!identifier || Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // The operating system may have already removed an expired reminder.
  }
}
