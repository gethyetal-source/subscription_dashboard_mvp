import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Button } from "@/components/app-ui";
import { EmptyIllustration, FinancePage, MetricLabel, SectionHeading, Surface, financeType } from "@/components/finance-ui";
import { ServiceBadge } from "@/components/subscription-ui";
import { deadlineLabel, financeAttention, groupPayments, subscriptionName } from "@/lib/finance-overview";
import { useMoneyFormatter } from "@/lib/privacy";
import { getRenewalQueue } from "@/lib/renewal-queue";
import { useSubscriptions } from "@/lib/subscription-store";
import { localDateKey } from "@/lib/subscription-utils";
import { usePalette } from "@/lib/ui-theme";

export default function RenewalsScreen() {
  const store = useSubscriptions();
  const money = useMoneyFormatter();
  const colors = usePalette();
  const queue = getRenewalQueue(store.subscriptions);
  const attention = financeAttention(store.subscriptions);
  const groups = groupPayments(queue.filter((item) => item.kind !== "cancellation" && item.due >= localDateKey()));
  const otherFollowUps = queue.filter((item) => item.kind === "cancellation" && !attention.some((attentionItem) => attentionItem.record.id === item.record.id && attentionItem.kind === "cancellation"));
  return <FinancePage title="Renewals">
    {attention.length ? <View style={{ gap: 12 }}>
      <SectionHeading title="Needs attention" />
      {attention.map((item) => <Pressable key={`${item.record.id}-${item.reason}`} accessibilityRole="button" accessibilityLabel={`Review ${subscriptionName(item.record)}`} onPress={() => router.push(`/subscription/${item.record.id}` as never)} style={({ pressed }) => ({ flexDirection: "row", gap: 12, padding: 16, borderRadius: 18, alignItems: "center", backgroundColor: colors.elevated, opacity: pressed ? 0.7 : 1 })}>
        <ServiceBadge serviceId={item.record.serviceId} label={item.record.planName} />
        <View style={{ flex: 1 }}><Text style={{ color: colors.foreground, fontFamily: financeType.semi, fontSize: 14 }}>{subscriptionName(item.record)}</Text><Text style={{ color: colors.warning, fontFamily: financeType.regular, fontSize: 11, marginTop: 4 }}>{item.reason === "cancellation" ? "Cancellation follow-up" : item.reason === "trial" ? "Trial ends" : "Review renewal"} · {deadlineLabel(item.due)}</Text></View>
        <Text style={{ color: colors.primary, fontSize: 20 }}>›</Text>
      </Pressable>)}
    </View> : null}
    {groups.length ? <View style={{ gap: 16 }}>
      <SectionHeading title="Payment timeline" />
      {groups.map((group) => <View key={group.date} style={{ gap: 8 }}>
        <MetricLabel>{deadlineLabel(group.date)}</MetricLabel>
        <Surface>{group.payments.map((item) => <Pressable key={item.record.id} accessibilityRole="button" accessibilityLabel={`View ${subscriptionName(item.record)}`} onPress={() => router.push(`/subscription/${item.record.id}` as never)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, opacity: pressed ? 0.7 : 1 })}>
          <ServiceBadge serviceId={item.record.serviceId} label={item.record.planName} />
          <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={{ color: colors.foreground, fontFamily: financeType.medium, fontSize: 14 }}>{subscriptionName(item.record)}</Text><Text style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 11, marginTop: 3 }}>{item.kind === "trial" ? "Expected after trial" : `${item.record.cadence} payment`}</Text></View>
          <Text style={{ color: colors.foreground, fontFamily: financeType.semi, fontSize: 13, maxWidth: "42%", textAlign: "right" }}>{money(item.record.expectedNextCharge ?? item.record.amount, item.record.currency)}</Text>
        </Pressable>)}</Surface>
      </View>)}
      <MetricLabel>Next saved payment for each plan. Future recurring payments are estimates.</MetricLabel>
    </View> : !attention.length && !otherFollowUps.length ? <EmptyIllustration title="Nothing coming up." body="Your next payments and trial deadlines will appear here." action={<Button label="Add a subscription" onPress={() => router.push("/quick-add")} />} /> : null}
    {otherFollowUps.map((item) => <Pressable key={`${item.record.id}-followup`} accessibilityRole="button" accessibilityLabel={`Cancellation follow-up for ${subscriptionName(item.record)}`} onPress={() => router.push(`/subscription/${item.record.id}` as never)} style={{ padding: 16, borderRadius: 18, backgroundColor: colors.elevated, gap: 5 }}><Text style={{ color: colors.foreground, fontFamily: financeType.medium, fontSize: 14 }}>{subscriptionName(item.record)}</Text><MetricLabel>Cancellation follow-up · {deadlineLabel(item.due)}</MetricLabel></Pressable>)}
  </FinancePage>;
}
