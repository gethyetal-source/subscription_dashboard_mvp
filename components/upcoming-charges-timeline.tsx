import { Pressable, StyleSheet, Text, View } from "react-native";

import { ServiceBadge } from "@/components/subscription-ui";
import { getService } from "@/lib/catalog";
import { daysUntil, formatCurrency, formatDate, getUpcomingSubscriptions } from "@/lib/subscription-utils";
import type { SubscriptionRecord } from "@/lib/subscription-types";

const type = { regular: "Poppins-Regular", semi: "Poppins-SemiBold", bold: "Poppins-Bold" };

type ChargeGroup = { label: string; caption: string; items: SubscriptionRecord[] };

function monthEnd(reference: Date) {
  return new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
}

function groupsFor(subscriptions: SubscriptionRecord[], reference = new Date()): ChargeGroup[] {
  const upcoming = getUpcomingSubscriptions(subscriptions).filter((item) => daysUntil(item.renewalDate, reference) >= 0);
  const endOfMonth = monthEnd(reference);
  const groups: ChargeGroup[] = [
    { label: "Today", caption: "Due today", items: [] },
    { label: "This week", caption: "Due in the next 7 days", items: [] },
    { label: "This month", caption: "Later this month", items: [] },
  ];
  upcoming.forEach((item) => {
    const due = new Date(`${item.renewalDate}T00:00:00`);
    const days = daysUntil(item.renewalDate, reference);
    if (days === 0) groups[0].items.push(item);
    else if (days <= 7) groups[1].items.push(item);
    else if (due <= endOfMonth) groups[2].items.push(item);
  });
  return groups.filter((group) => group.items.length > 0);
}

export function UpcomingChargesTimeline({ subscriptions, onOpen }: { subscriptions: SubscriptionRecord[]; onOpen: (record: SubscriptionRecord) => void }) {
  const groups = groupsFor(subscriptions);
  if (!groups.length) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerIcon}><Text style={styles.headerIconText}>$</Text></View>
        <View style={styles.flex}><Text style={styles.title}>Upcoming charges</Text><Text style={styles.caption}>Know what is due before it renews.</Text></View>
      </View>
      {groups.map((group) => (
        <View key={group.label} style={styles.group}>
          <View style={styles.groupHeader}><Text style={styles.groupTitle}>{group.label}</Text><Text style={styles.groupCaption}>{group.caption}</Text></View>
          {group.items.slice(0, 4).map((item) => {
            const service = getService(item.serviceId);
            return <Pressable key={item.id} onPress={() => onOpen(item)} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
              <ServiceBadge serviceId={item.serviceId} size="small" />
              <View style={styles.flex}><Text style={styles.serviceName}>{service?.name ?? "Subscription"}</Text><Text style={styles.date}>{formatDate(item.renewalDate)}</Text></View>
              <View style={styles.amountWrap}><Text style={styles.amount}>{formatCurrency(item.amount, item.currency)}</Text><Text style={styles.edit}>Review</Text></View>
            </Pressable>;
          })}
          {group.items.length > 4 ? <Text style={styles.more}>+{group.items.length - 4} more upcoming</Text> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF", borderColor: "#DADCE0", borderRadius: 16, borderWidth: 1, marginTop: 10, padding: 14 },
  header: { alignItems: "center", flexDirection: "row", gap: 10 },
  headerIcon: { alignItems: "center", backgroundColor: "#E8F0FE", borderRadius: 12, height: 28, justifyContent: "center", width: 28 },
  headerIconText: { color: "#1A73E8", fontFamily: type.bold, fontSize: 15 },
  flex: { flex: 1 },
  title: { color: "#202124", fontFamily: type.semi, fontSize: 13 },
  caption: { color: "#5F6368", fontFamily: type.regular, fontSize: 10, marginTop: 2 },
  group: { borderTopColor: "#E8EAED", borderTopWidth: 1, marginTop: 13, paddingTop: 10 },
  groupHeader: { alignItems: "baseline", flexDirection: "row", justifyContent: "space-between" },
  groupTitle: { color: "#202124", fontFamily: type.semi, fontSize: 11 },
  groupCaption: { color: "#80868B", fontFamily: type.regular, fontSize: 9 },
  item: { alignItems: "center", flexDirection: "row", gap: 9, paddingVertical: 9 },
  serviceName: { color: "#202124", fontFamily: type.semi, fontSize: 11 },
  date: { color: "#5F6368", fontFamily: type.regular, fontSize: 9, marginTop: 2 },
  amountWrap: { alignItems: "flex-end" },
  amount: { color: "#202124", fontFamily: type.semi, fontSize: 11 },
  edit: { color: "#1A73E8", fontFamily: type.semi, fontSize: 9, marginTop: 2 },
  more: { color: "#1A73E8", fontFamily: type.semi, fontSize: 10, paddingTop: 3 },
  pressed: { opacity: 0.7 },
});
