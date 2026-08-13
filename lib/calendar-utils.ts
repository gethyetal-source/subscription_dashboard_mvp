import type { SubscriptionRecord } from "./subscription-types";

export interface CalendarDay {
  key: string;
  day: number;
  isCurrentMonth: boolean;
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function monthStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

export function shiftMonth(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

export function buildCalendarDays(month: Date): CalendarDay[] {
  const firstDay = monthStart(month);
  const gridStart = new Date(firstDay.getFullYear(), firstDay.getMonth(), 1 - firstDay.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    return { key: toDateKey(date), day: date.getDate(), isCurrentMonth: date.getMonth() === firstDay.getMonth() };
  });
}

export function renewalsForMonth(subscriptions: SubscriptionRecord[], month: Date) {
  const prefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  return subscriptions.filter((item) => item.status !== "cancelled" && item.renewalDate.startsWith(prefix));
}

export function groupRenewalsByDate(subscriptions: SubscriptionRecord[]) {
  return subscriptions.reduce<Record<string, SubscriptionRecord[]>>((groups, subscription) => {
    groups[subscription.renewalDate] = [...(groups[subscription.renewalDate] ?? []), subscription];
    return groups;
  }, {});
}
