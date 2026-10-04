import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import type { SubscriptionRecord } from "@/lib/subscription-types";
import { getRenewalReminderCopy } from "@/lib/subscription-utils";
import { getService } from "@/lib/catalog";
import type { ReminderPermissionState } from "@/lib/reminder-utils";
import { buildReminderPlans } from "@/lib/renewal-engine";

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

export async function cancelRenewalReminder(identifier?: string) {
  if (!identifier || Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // The operating system may have already removed an expired reminder.
  }
}

export async function cancelSubscriptionReminders(record: SubscriptionRecord) {
  const identifiers = [...new Set([record.reminderIdentifier, ...(record.reminderIdentifiers ?? [])].filter((id): id is string => Boolean(id)))];
  await Promise.all(identifiers.map(cancelRenewalReminder));
}

export async function scheduleSubscriptionReminders(record: SubscriptionRecord, daysBefore: number) {
  if (Platform.OS === "web" || !(await prepareNotifications())) return [];
  const plans = buildReminderPlans(record, daysBefore);
  const identifiers: string[] = [];
  try {
    for (const plan of plans) {
      identifiers.push(await Notifications.scheduleNotificationAsync({
        content: {
          title: plan.kind === "cancellation" ? "Check your cancellation outcome" : plan.kind === "trial" ? "Your trial may become paid" : `${getService(record.serviceId)?.name ?? record.planName} renews soon`,
          body: plan.kind === "cancellation" ? "Review the provider confirmation and check for further charges. This reminder does not verify cancellation." : getRenewalReminderCopy(record),
          data: { subscriptionId: record.id, kind: plan.kind, dueDate: plan.dueDate, url: `/subscription/${record.id}` },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: plan.fireAt, channelId: "renewals" },
      }));
    }
    return identifiers;
  } catch {
    await Promise.all(identifiers.map(cancelRenewalReminder));
    // Saving a subscription must remain possible when the OS refuses notifications.
    return [];
  }
}
