import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Button, Copy } from "@/components/app-ui";
import { ActionSheet, EmptyIllustration, FinanceHeader, FinanceLink, HeroBackdrop, RoundAction, RowDivider, SectionHeading, Surface, financeType } from "@/components/finance-ui";
import { ScreenContainer } from "@/components/screen-container";
import { ServiceBadge } from "@/components/subscription-ui";
import { defaultCurrency } from "@/lib/countries";
import { deadlineLabel, financeAttention, financeCurrencies, financeOverview, groupPayments, subscriptionName } from "@/lib/finance-overview";
import { useMoneyFormatter, usePrivacy } from "@/lib/privacy";
import { useSubscriptions } from "@/lib/subscription-store";
import { usePalette } from "@/lib/ui-theme";

export default function OverviewScreen() {
  const colors = usePalette();
  const money = useMoneyFormatter();
  const privacy = usePrivacy();
  const store = useSubscriptions();
  const preferredCurrency = defaultCurrency(store.settings);
  const [selection, setSelection] = useState<{ currency: string; preferred: string }>();
  const selectCurrency = (currency: string) => setSelection({ currency, preferred: preferredCurrency });
  const [currencyVisible, setCurrencyVisible] = useState(false);
  const currencies = financeCurrencies(store.subscriptions, preferredCurrency, !!store.settings.countryCode);
  const currency = selection?.preferred === preferredCurrency && currencies.includes(selection.currency) ? selection.currency : currencies[0];
  const overview = financeOverview(store.subscriptions, currency);
  const attention = financeAttention(store.subscriptions);
  const payments = groupPayments(overview.payments.slice(0, 4));
  const hasRecords = store.subscriptions.length > 0;
  const budget = currency === store.settings.budgetCurrency ? store.settings.monthlyBudget : 0;

  if (!store.isReady && !store.storageError) return <ScreenContainer><View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.primary} /></View></ScreenContainer>;

  return <ScreenContainer>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 22, gap: 24, paddingBottom: 32 }}>
      <FinanceHeader title="Overview" eyebrow="SubTrack" trailing={<View style={{ flexDirection: "row", gap: 8 }}>
        {hasRecords ? <RoundAction primary icon="add" label="Add a subscription" onPress={() => router.push("/quick-add")} /> : null}
        <RoundAction icon="settings-outline" label="Settings" onPress={() => router.push("/(tabs)/settings")} />
      </View>} />
      {!hasRecords ? <EmptyIllustration title="Small subscriptions. Big picture." body="See your recurring costs in one place. Catch the next charge before it catches you." action={<Button label="Add your first subscription" onPress={() => router.push("/quick-add")} />} /> : <>
        <View style={{ borderRadius: 24, overflow: "hidden", backgroundColor: "#064B3B", padding: 20, gap: 10 }}>
          <HeroBackdrop />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text style={{ color: "#C5EBDE", fontFamily: financeType.medium, fontSize: 12, flex: 1 }}>Monthly equivalent</Text>
            {currencies.length > 1 ? <Pressable accessibilityRole="button" accessibilityLabel={`Change overview currency, currently ${currency}`} onPress={() => setCurrencyVisible(true)} style={{ minHeight: 44, paddingHorizontal: 10, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ color: "#FFFFFF", fontFamily: financeType.medium, fontSize: 11 }}>{currency}</Text><Ionicons name="chevron-down" size={13} color="#D9F6EB" aria-hidden />
            </Pressable> : <Text style={{ color: "#D9F6EB", fontFamily: financeType.medium, fontSize: 11 }}>{currency}</Text>}
            <Pressable accessibilityRole="button" accessibilityLabel={privacy.hideAmounts ? "Show amounts" : "Hide amounts"} onPress={() => void privacy.setHideAmounts(!privacy.hideAmounts).catch(() => undefined)} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", margin: -10 }}>
              <Ionicons name={privacy.hideAmounts ? "eye-off-outline" : "eye-outline"} size={20} color="#D9F6EB" aria-hidden />
            </Pressable>
          </View>
          <Text adjustsFontSizeToFit minimumFontScale={0.6} numberOfLines={1} style={{ color: "#FFFFFF", fontFamily: financeType.bold, fontSize: 38, letterSpacing: -1.3 }}>{money(overview.monthly, currency)}</Text>
          <Text style={{ color: "#C5EBDE", fontFamily: financeType.regular, fontSize: 11, marginTop: -10 }}>{overview.activeCount} tracked plan{overview.activeCount === 1 ? "" : "s"} · estimated recurring cost</Text>
          <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.15)" }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#C5EBDE", fontFamily: financeType.regular, fontSize: 11 }}>Still due this month</Text>
              <Text style={{ color: "#FFFFFF", fontFamily: financeType.semi, fontSize: 18, marginTop: 4 }}>{money(overview.dueThisMonth, currency)}</Text>
            </View>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={{ color: "#C5EBDE", fontFamily: financeType.regular, fontSize: 11 }}>{budget > 0 ? overview.monthly > budget ? "Over monthly budget" : "Budget remaining" : "Yearly equivalent"}</Text>
              <Text style={{ color: "#FFFFFF", fontFamily: financeType.semi, fontSize: 18, marginTop: 4, textAlign: "right" }}>{money(budget > 0 ? Math.abs(budget - overview.monthly) : overview.annual, currency)}</Text>
            </View>
          </View>
        </View>
        {attention.length ? <View style={{ gap: 12 }}>
          <SectionHeading title="Needs attention" action={attention.length > 1 ? `See all (${attention.length})` : undefined} onPress={() => router.push("/renewals")} />
          {attention.slice(0, 1).map((item) => <Pressable key={`${item.record.id}-${item.reason}`} accessibilityRole="button" accessibilityLabel={`Review ${subscriptionName(item.record)}: ${item.reason === "cancellation" ? "cancellation follow-up" : item.reason === "trial" ? "trial ending" : "renewal decision"}`}
            onPress={() => router.push(`/subscription/${item.record.id}` as never)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.elevated, borderRadius: 18, padding: 16, opacity: pressed ? 0.7 : 1 })}>
            <View style={{ width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}><Ionicons name={item.reason === "cancellation" ? "shield-checkmark-outline" : item.reason === "trial" ? "time-outline" : "trending-up-outline"} size={20} color={colors.warning} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ color: colors.foreground, fontFamily: financeType.semi, fontSize: 13 }}>{subscriptionName(item.record)}</Text>
              <Text style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 11, marginTop: 4 }}>{item.reason === "cancellation" ? "Check cancellation" : item.reason === "trial" ? "Trial ending" : item.reason === "price" ? "Higher next charge" : "Review before renewal"} · {deadlineLabel(item.due)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={colors.primary} />
          </Pressable>)}
        </View> : null}
        <View style={{ gap: 12 }}>
          <SectionHeading title="Upcoming payments" action="See all" onPress={() => router.push("/renewals")} />
          {payments.length ? <Surface>
            {payments.map((group, groupIndex) => <View key={group.date} style={{ gap: 12 }}>
              {groupIndex ? <RowDivider /> : null}
              <Text style={{ color: colors.muted, fontFamily: financeType.medium, fontSize: 11 }}>{deadlineLabel(group.date)}</Text>
              {group.payments.map((item) => <Pressable key={item.record.id} accessibilityRole="button" accessibilityLabel={`View ${subscriptionName(item.record)}`} onPress={() => router.push(`/subscription/${item.record.id}` as never)}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 11, minHeight: 48, opacity: pressed ? 0.7 : 1 })}>
                <ServiceBadge serviceId={item.record.serviceId} label={item.record.planName} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ color: colors.foreground, fontFamily: financeType.medium, fontSize: 13 }}>{subscriptionName(item.record)}</Text>
                  <Text style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 11, marginTop: 3 }}>{item.kind === "trial" ? "After trial" : item.record.cadence === "yearly" ? "Yearly renewal" : "Renewal"}</Text>
                </View>
                <Text style={{ maxWidth: "42%", color: colors.foreground, fontFamily: financeType.semi, fontSize: 13, textAlign: "right" }}>{money(item.record.expectedNextCharge ?? item.record.amount, item.record.currency)}</Text>
              </Pressable>)}
            </View>)}
          </Surface> : <Copy muted>No upcoming payments in {currency}.</Copy>}
          <Text style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 10, lineHeight: 16 }}>Based on your saved dates and prices{currencies.length > 1 ? ". Currencies stay separate" : ""}.</Text>
        </View>
      </>}
    </ScrollView>
    <ActionSheet visible={currencyVisible} title="Choose a currency" onClose={() => setCurrencyVisible(false)}>
      {currencies.map((code) => <FinanceLink key={code} icon={currency === code ? "checkmark-circle-outline" : "cash-outline"} title={code} onPress={() => { selectCurrency(code); setCurrencyVisible(false); }} />)}
      <Copy muted>Currencies are shown separately. No exchange rate is applied.</Copy>
    </ActionSheet>
  </ScreenContainer>;
}
