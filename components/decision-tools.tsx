import { Pressable, StyleSheet, Text, View } from "react-native";

import { getService } from "@/lib/catalog";
import { formatCurrency, formatCurrencySpendGroups, getAttentionScore, getCurrencySpendGroups, getReviewQueue, getSavingsImpact } from "@/lib/subscription-utils";
import type { SubscriptionRecord } from "@/lib/subscription-types";

const type = { regular: "Poppins-Regular", semi: "Poppins-SemiBold", bold: "Poppins-Bold" };

const reasonLabels = { trial: "Trial", renewal: "Due soon", "high-cost": "High cost" } as const;

export function DecisionTools({ subscriptions, onOpen }: { subscriptions: SubscriptionRecord[]; onOpen: (record: SubscriptionRecord) => void }) {
  const queue = getReviewQueue(subscriptions).slice(0, 4);
  const selectedIds = queue.slice(0, 2).map((item) => item.subscription.id);
  const impact = getSavingsImpact(subscriptions, selectedIds);
  const impactGroups = getCurrencySpendGroups(subscriptions.filter((subscription) => selectedIds.includes(subscription.id)));
  if (!queue.length) return null;
  return <View style={styles.stack}>
    <View style={styles.card}>
      <View style={styles.header}><View style={styles.icon}><Text style={styles.iconText}>!</Text></View><View style={styles.flex}><Text style={styles.title}>Subscriptions worth reviewing</Text><Text style={styles.caption}>A short list of plans that may need your attention.</Text></View><Text style={styles.count}>{queue.length}</Text></View>
      {queue.map((item) => { const service = getService(item.subscription.serviceId); return <Pressable key={item.subscription.id} onPress={() => onOpen(item.subscription)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><View style={styles.flex}><Text style={styles.service}>{service?.name ?? item.subscription.planName}</Text><View style={styles.reasonRow}>{item.reasons.map((reason) => <View key={reason} style={styles.reason}><Text style={styles.reasonText}>{reasonLabels[reason]}</Text></View>)}</View></View><View style={styles.amountWrap}><Text style={styles.amount}>{formatCurrency(item.monthly, item.subscription.currency)}</Text><Text style={styles.review}>Attention {getAttentionScore(item.subscription)}/100 · Review ›</Text></View></Pressable>; })}
    </View>
    <View style={styles.savingsCard}><View style={styles.header}><View style={styles.savingsIcon}><Text style={styles.savingsIconText}>$</Text></View><View style={styles.flex}><Text style={styles.title}>Savings simulator</Text><Text style={styles.caption}>If you review the top two items, the estimate is:</Text></View></View><View style={styles.savingsNumbers}><View><Text style={styles.savingsLabel}>Monthly</Text><Text style={styles.savingsAmount}>{impactGroups.length > 1 ? formatCurrencySpendGroups(impactGroups) : formatCurrency(impact.monthly, impactGroups[0]?.currency)}</Text></View><View><Text style={styles.savingsLabel}>Annual</Text><Text style={styles.savingsAmount}>{impactGroups.length > 1 ? "Review per currency" : formatCurrency(impact.annual, impactGroups[0]?.currency)}</Text></View></View><Text style={styles.savingsNote}>{impactGroups.length > 1 ? "Currencies are shown separately; SubTrack does not combine them or apply exchange rates." : "This is an estimate only. SubTrack never cancels a provider subscription for you."}</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  stack: { gap: 10, marginTop: 10 }, card: { backgroundColor: "#FFFFFF", borderColor: "#DADCE0", borderRadius: 16, borderWidth: 1, padding: 14 }, savingsCard: { backgroundColor: "#E8F0FE", borderRadius: 16, padding: 14 }, header: { alignItems: "center", flexDirection: "row", gap: 10 }, icon: { alignItems: "center", backgroundColor: "#FEF7E0", borderRadius: 12, height: 28, justifyContent: "center", width: 28 }, iconText: { color: "#B06000", fontFamily: type.bold, fontSize: 15 }, savingsIcon: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 12, height: 28, justifyContent: "center", width: 28 }, savingsIconText: { color: "#1A73E8", fontFamily: type.bold, fontSize: 15 }, flex: { flex: 1 }, title: { color: "#202124", fontFamily: type.semi, fontSize: 13 }, caption: { color: "#5F6368", fontFamily: type.regular, fontSize: 10, lineHeight: 15, marginTop: 2 }, count: { color: "#B06000", fontFamily: type.bold, fontSize: 18 }, row: { alignItems: "center", borderTopColor: "#E8EAED", borderTopWidth: 1, flexDirection: "row", gap: 8, marginTop: 10, paddingTop: 10 }, service: { color: "#202124", fontFamily: type.semi, fontSize: 11 }, reasonRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 5 }, reason: { backgroundColor: "#F1F3F4", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 }, reasonText: { color: "#5F6368", fontFamily: type.semi, fontSize: 8 }, amountWrap: { alignItems: "flex-end" }, amount: { color: "#202124", fontFamily: type.semi, fontSize: 11 }, review: { color: "#1A73E8", fontFamily: type.semi, fontSize: 9, marginTop: 3 }, savingsNumbers: { flexDirection: "row", gap: 38, marginTop: 14 }, savingsLabel: { color: "#5F6368", fontFamily: type.regular, fontSize: 10 }, savingsAmount: { color: "#174EA6", fontFamily: type.bold, fontSize: 20, marginTop: 2 }, savingsNote: { color: "#3C4043", fontFamily: type.regular, fontSize: 9, lineHeight: 14, marginTop: 12 }, pressed: { opacity: 0.7 },
});
