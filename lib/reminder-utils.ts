export type ReminderPermissionState = "unsupported" | "undetermined" | "denied" | "granted";

export function getReminderPermissionGuidance(state: ReminderPermissionState) {
  switch (state) {
    case "granted":
      return "This device can schedule local renewal reminders.";
    case "undetermined":
      return "Allow device notifications before SubTrack can schedule renewal reminders.";
    case "denied":
      return "Notifications are blocked in device settings. Enable SubTrack notifications there to schedule reminders.";
    case "unsupported":
      return "The web preview cannot deliver native local notifications. Check this on an iOS or Android device.";
  }
}
