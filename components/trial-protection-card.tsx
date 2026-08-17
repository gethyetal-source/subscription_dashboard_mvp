import { Pressable, StyleSheet, Text, View } from "react-native";

import { ServiceBadge } from "@/components/subscription-ui";
import { getService } from "@/lib/catalog";
import type { SubscriptionRecord } from "@/lib/subscription-types";
import { daysUntil, formatCurrency, formatDate, formatRelativeRenewal } from "@/lib/subscription-utils";

const type = { regular: "Poppins-Regular", semi: "Poppins-SemiBold", bold: "Poppins-Bold" };

function deadlineLabel(days: number) {
  if (days < 0) return "Trial ended — review now";
  if (days === 0) return "Trial ends today";
  if (days === 1) return "Trial ends tomorrow";
  return `Trial ends in ${days} days`;
}

export function TrialProtectionCard({ trial, renewal, onOpen }: { trial?: SubscriptionRecord; renewal?: SubscriptionRecord; onOpen: (record: SubscriptionRecord) => void }) {
  if (!trial && !renewal) return null;
  const service = getService((trial ?? renewal)!.serviceId);
  const trialDays = trial?.trialEndDate ? daysUntil(trial.trialEndDate) : undefined;
  const trialIsUrgent = trialDays !== undefined && trialDays <= 7;
  const record = trial ?? renewal!;

  return (
    <View style={[styles.card, trialIsUrgent && styles.cardUrgent]}>
      <View style={styles.header}>
        <View style={[styles.icon, trialIsUrgent ? styles.iconUrgent : styles.iconRenewal]}><Text style={styles.iconText}>{trial ? "!" : "✓"}</Text></View>
        <View style={styles.flex}><Text style={styles.title}>{trial ? "Protect your trial" : "Review your next renewal"}</Text><Text style={styles.caption}>{trial ? "Decide before a paid charge begins." : "Keep upcoming subscription charges intentional."}</Text></View>
      </View>
      <View style={styles.recordRow}>
        <ServiceBadge serviceId={record.serviceId} size="small" />
        <View style={styles.flex}><Text style={styles.serviceName}>{service?.name ?? "Subscription"}</Text><Text style={styles.serviceMeta}>{trial ? (trialDays === undefined ? "Trial date not set" : deadlineLabel(trialDays)) : formatRelativeRenewal(record.renewalDate)}</Text></View>
        <Text style={styles.amount}>{formatCurrency(trial ? record.amount : record.amount, record.currency)}</Text>
      </View>
      <Text style={styles.date}>{trial?.trialEndDate ? `Ends ${formatDate(trial.trialEndDate)}` : renewal ? `Next charge ${formatDate(renewal.renewalDate)}` : "Review this record"}</Text>
      <Pressable onPress={() => onOpen(record)} style={({ pressed }) => [styles.action, pressed && styles.pressed]}><Text style={styles.actionText}>{trial ? "Review trial" : "Review renewal"}</Text><Text style={styles.chevron}>›</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF", borderColor: "#DADCE0", borderRadius: 16, borderWidth: 1, marginTop: 10, padding: 14 },
  cardUrgent: { backgroundColor: "#FFF8E1", borderColor: "#F9AB00" },
  header: { alignItems: "center", flexDirection: "row", gap: 10 },
  icon: { alignItems: "center", borderRadius: 12, height: 26, justifyContent: "center", width: 26 },
  iconUrgent: { backgroundColor: "#F9AB00" },
  iconRenewal: { backgroundColor: "#E8F0FE" },
  iconText: { color: "#FFFFFF", fontFamily: type.bold, fontSize: 14 },
  flex: { flex: 1 },
  title: { color: "#202124", fontFamily: type.semi, fontSize: 13 },
  caption: { color: "#5F6368", fontFamily: type.regular, fontSize: 10, lineHeight: 15, marginTop: 2 },
  recordRow: { alignItems: "center", borderTopColor: "#E8EAED", borderTopWidth: 1, flexDirection: "row", gap: 9, marginTop: 12, paddingTop: 12 },
  serviceName: { color: "#202124", fontFamily: type.semi, fontSize: 12 },
  serviceMeta: { color: "#C5221F", fontFamily: type.semi, fontSize: 10, marginTop: 2 },
  amount: { color: "#202124", fontFamily: type.semi, fontSize: 12 },
  date: { color: "#5F6368", fontFamily: type.regular, fontSize: 10, marginLeft: 35, marginTop: 6 },
  action: { alignItems: "center", borderTopColor: "#E8EAED", borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", marginTop: 11, paddingTop: 11 },
  actionText: { color: "#1A73E8", fontFamily: type.semi, fontSize: 11 },
  chevron: { color: "#1A73E8", fontFamily: type.regular, fontSize: 22, lineHeight: 18 },
  pressed: { opacity: 0.75 },
});
