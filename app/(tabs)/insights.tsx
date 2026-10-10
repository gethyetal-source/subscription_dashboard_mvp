import { useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Button, ConfirmDialog, Copy, Field, Notice } from "@/components/app-ui";
import { ActionSheet, CurrencyPicker, EmptyIllustration, FinanceHeader, FinanceLink, MetricLabel, RoundAction, RowDivider, SectionHeading, Surface, financeType } from "@/components/finance-ui";
import { ScreenContainer } from "@/components/screen-container";
import { ServiceBadge } from "@/components/subscription-ui";
import { defaultCurrency } from "@/lib/countries";
import { localDateSchema } from "@/lib/data-safety";
import { financeCurrencies, financeOverview, subscriptionName } from "@/lib/finance-overview";
import { parseMoneyInput } from "@/lib/form-utils";
import { cashFlowForecast, priceChangeImpact } from "@/lib/insights";
import { useMoneyFormatter } from "@/lib/privacy";
import { useSubscriptions } from "@/lib/subscription-store";
import { getValueCheckPrompts, localDateKey } from "@/lib/subscription-utils";
import { usePalette } from "@/lib/ui-theme";

const categoryColors = ["#087F65", "#5AAB98", "#82BAB3", "#396E61", "#B7D8CE", "#8D976B", "#657F74", "#45A68C", "#9EB7AE"];

export default function InsightsScreen() {
  const store = useSubscriptions();
  const money = useMoneyFormatter();
  const colors = usePalette();
  const preferredCurrency = defaultCurrency(store.settings);
  const [selection, setSelection] = useState<{ currency: string; preferred: string }>();
  const selectCurrency = (currency: string) => setSelection({ currency, preferred: preferredCurrency });
  const currencies = [...new Set([...financeCurrencies(store.subscriptions, preferredCurrency, !!store.settings.countryCode), ...(store.savingsEntries ?? []).map((entry) => entry.currency)])];
  const currency = selection?.preferred === preferredCurrency && currencies.includes(selection.currency) ? selection.currency : currencies[0];
  const overview = financeOverview(store.subscriptions, currency);
  const [recording, setRecording] = useState(false);
  const [history, setHistory] = useState(false);
  const [amount, setAmount] = useState("");
  const [savingCurrency, setSavingCurrency] = useState(currency);
  const [date, setDate] = useState(localDateKey());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState("");
  const valueChecks = getValueCheckPrompts(store.subscriptions.filter((record) => record.currency === currency)).slice(0, 3);
  const priceChanges = store.subscriptions.filter((record) => record.currency === currency).flatMap((record) => (record.planChangeHistory ?? []).map((event) => ({ record, event })))
    .sort((left, right) => right.event.changedAt.localeCompare(left.event.changedAt)).slice(0, 3);
  const savedEntries = (store.savingsEntries ?? []).filter((entry) => entry.currency === currency);
  const savings = savedEntries.reduce((total, entry) => total + entry.amount, 0);
  const forecast = cashFlowForecast(store.subscriptions.filter((record) => record.currency === currency));
  const budget = currency === store.settings.budgetCurrency ? store.settings.monthlyBudget : 0;
  const circumference = 2 * Math.PI * 58;
  let offset = 0;

  const saveSaving = async () => {
    const value = parseMoneyInput(amount);
    if (value === undefined || value <= 0 || !/^[A-Za-z]{3}$/.test(savingCurrency) || !localDateSchema.safeParse(date).success || date > localDateKey() || !note.trim()) {
      setError("Enter an amount, currency, a past or current date, and a short note."); return;
    }
    setBusy(true); setError("");
    try {
      await store.addSavingsEntry({ amount: value, currency: savingCurrency.toUpperCase(), occurredOn: date, note: note.trim() });
      selectCurrency(savingCurrency.toUpperCase()); setAmount(""); setNote(""); setRecording(false);
    } catch { setError("Could not save this entry. Please try again."); }
    finally { setBusy(false); }
  };

  return <ScreenContainer>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 22, gap: 24, paddingBottom: 32 }}>
      <FinanceHeader title="Insights" trailing={<RoundAction icon="settings-outline" label="Settings" onPress={() => router.push("/(tabs)/settings")} />} />
      {!store.subscriptions.length && !(store.savingsEntries ?? []).length ? <EmptyIllustration title="Make your money make sense." body="Add your subscriptions to see where recurring costs go, and what’s worth reviewing." action={<Button label="Add a subscription" onPress={() => router.push("/quick-add")} />} /> : <>
        <View style={{ gap: 10 }}>
          {currencies.length > 1 ? <CurrencyPicker currencies={currencies} value={currency} onChange={selectCurrency} /> : <MetricLabel>{currency} · recurring spending</MetricLabel>}
          <Text style={{ color: colors.foreground, fontFamily: financeType.bold, fontSize: 38, letterSpacing: -1.2 }} numberOfLines={1} adjustsFontSizeToFit>{money(overview.monthly, currency)}</Text>
          <Text style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 12, marginTop: -5 }}>Monthly equivalent · {money(overview.annual, currency)} / year</Text>
        </View>
        {overview.categories.some((category) => category.monthly > 0) ? <Surface>
          <SectionHeading title="Where your money goes" />
          <View style={{ alignItems: "center", paddingVertical: 4 }}>
            <Svg width={156} height={156} viewBox="0 0 150 150" accessibilityLabel="Monthly spending by category">
              <Circle cx="75" cy="75" r="58" fill="none" stroke={colors.border} strokeWidth="16" />
              {overview.categories.map((category, index) => {
                const length = overview.monthly > 0 ? category.monthly / overview.monthly * circumference : 0;
                const segment = <Circle key={category.category} cx="75" cy="75" r="58" fill="none" stroke={categoryColors[index % categoryColors.length]} strokeWidth="16" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} rotation="-90" origin="75, 75" />;
                offset += length;
                return segment;
              })}
            </Svg>
            <View pointerEvents="none" style={{ position: "absolute", top: 48, alignItems: "center", width: 100 }}>
              <Text style={{ color: colors.foreground, fontFamily: financeType.bold, fontSize: 23 }}>{overview.activeCount}</Text>
              <Text style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 10 }}>tracked plans</Text>
            </View>
          </View>
          {overview.categories.map((category, index) => <View key={category.category} style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: categoryColors[index % categoryColors.length] }} />
            <Text style={{ flex: 1, color: colors.foreground, fontFamily: financeType.regular, fontSize: 12 }}>{category.category}</Text>
            <Text style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 11 }}>{category.percentage}%</Text>
            <Text style={{ color: colors.foreground, fontFamily: financeType.medium, fontSize: 12, minWidth: 76, textAlign: "right" }}>{money(category.monthly, currency)}</Text>
          </View>)}
          <Text style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 10, lineHeight: 16 }}>Monthly estimates, not a history of bank transactions.</Text>
        </Surface> : null}
        <View style={{ gap: 12 }}>
          <SectionHeading title="Expected payments" />
          <Surface>
            {forecast.map((bucket, index) => <View key={bucket.month} style={{ gap: 12 }}>
              {index ? <RowDivider /> : null}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontFamily: financeType.medium, fontSize: 13 }}>{new Date(`${bucket.month}-01T12:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</Text>
                  {index === 0 ? <Text style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 10, marginTop: 3 }}>Remaining this month</Text> : null}
                </View>
                <Text style={{ color: colors.foreground, fontFamily: financeType.semi, fontSize: 13 }}>{money(bucket.amounts[currency] ?? 0, currency)}</Text>
              </View>
            </View>)}
          </Surface>
          <Text style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 10, lineHeight: 16 }}>Forecasts use your saved dates and renewal settings. Currencies aren’t combined.</Text>
        </View>
        {valueChecks.length ? <View style={{ gap: 12 }}>
          <SectionHeading title="Worth a review" action="Checkup" onPress={() => router.push("/control-center")} />
          {valueChecks.map((prompt) => <Pressable key={prompt.subscription.id} accessibilityRole="button" accessibilityLabel={prompt.title} onPress={() => router.push({ pathname: "/decision-plan", params: { id: prompt.subscription.id, section: "value" } })} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, opacity: pressed ? 0.7 : 1 })}>
            <ServiceBadge serviceId={prompt.subscription.serviceId} label={prompt.subscription.planName} />
            <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: colors.foreground, fontFamily: financeType.medium, fontSize: 13 }}>{subscriptionName(prompt.subscription)}</Text><Text style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 11, marginTop: 3 }}>{prompt.subscription.valueCheckIn?.wouldBuyAgain === "no" || prompt.subscription.valueCheckIn?.useLevel === "rare" ? "Your last check-in suggests a rethink" : "Still worth it? Check in"}</Text></View>
            <Text style={{ color: colors.primary, fontFamily: financeType.semi, fontSize: 13 }}>›</Text>
          </Pressable>)}
        </View> : null}
        {priceChanges.length ? <View style={{ gap: 12 }}>
          <SectionHeading title="Recent price changes" />
          {priceChanges.map(({ record, event }) => {
            const impact = priceChangeImpact(event);
            return <FinanceLink key={event.id} icon="trending-up-outline" title={subscriptionName(record)} detail={impact ? `${impact.monthlyChange > 0 ? "Up" : impact.monthlyChange < 0 ? "Down" : "Unchanged"}${impact.monthlyChange ? ` ${money(Math.abs(impact.monthlyChange), impact.currency)} / month` : ""}` : "Currency changed"} onPress={() => router.push(`/subscription/${record.id}` as never)} />;
          })}
        </View> : null}
        {budget > 0 ? <Surface>
          <SectionHeading title="Your monthly budget" action="Edit" onPress={() => router.push("/(tabs)/settings")} />
          <Copy>{money(Math.abs(budget - overview.monthly), currency)} {overview.monthly > budget ? "over your limit" : "remaining"}</Copy>
          <View style={{ height: 7, backgroundColor: colors.border, borderRadius: 4, overflow: "hidden" }}><View style={{ width: `${Math.min(100, overview.monthly / budget * 100)}%`, height: 7, backgroundColor: overview.monthly > budget ? colors.warning : colors.primary }} /></View>
          <MetricLabel>{money(overview.monthly, currency)} of {money(budget, currency)} · monthly equivalent</MetricLabel>
        </Surface> : null}
        <Surface>
          <SectionHeading title="Savings you recorded" />
          <Text style={{ color: colors.primary, fontFamily: financeType.bold, fontSize: 26 }}>{money(savings, currency)}</Text>
          <Text style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 11, lineHeight: 18 }}>A record of refunds or avoided charges you’ve checked. Not an automatic savings estimate.</Text>
          <Button label="Record a saving" secondary onPress={() => { setSavingCurrency(currency); setError(""); setRecording(true); }} />
          {savedEntries.length ? <FinanceLink icon="receipt-outline" title="View saved entries" detail={`${savedEntries.length} ${savedEntries.length === 1 ? "entry" : "entries"}`} onPress={() => setHistory(true)} /> : null}
          {error && !recording ? <Notice error>{error}</Notice> : null}
        </Surface>
      </>}
    </ScrollView>
    <ActionSheet visible={recording} title="Record a saving" onClose={() => { if (!busy) setRecording(false); }}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 2 }}><Field label="Savings amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" editable={!busy} /></View>
        <View style={{ flex: 1 }}><Field label="Currency" value={savingCurrency} onChangeText={setSavingCurrency} maxLength={3} autoCapitalize="characters" editable={!busy} /></View>
      </View>
      <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} editable={!busy} />
      <Field label="What did you save?" value={note} onChangeText={setNote} maxLength={1000} editable={!busy} />
      {error ? <Notice error>{error}</Notice> : null}
      <Button label={busy ? "Saving…" : "Save entry"} disabled={busy} onPress={() => void saveSaving()} />
    </ActionSheet>
    <ActionSheet visible={history} title={`Recorded savings · ${currency}`} onClose={() => setHistory(false)}>
      {savedEntries.map((entry) => <View key={entry.id} style={{ gap: 7 }}>
        <Text style={{ color: colors.foreground, fontFamily: financeType.semi, fontSize: 16 }}>{money(entry.amount, entry.currency)}</Text>
        <MetricLabel>{entry.occurredOn}</MetricLabel><Copy>{entry.note}</Copy>
        <FinanceLink icon="trash-outline" title="Remove entry" danger onPress={() => { setHistory(false); setDeleteId(entry.id); }} /><RowDivider />
      </View>)}
    </ActionSheet>
    <ConfirmDialog visible={!!deleteId} title="Remove savings entry?" message="This removes the saved entry. It does not change your subscriptions." confirmLabel="Remove entry" danger busy={busy} onCancel={() => setDeleteId("")} onConfirm={() => {
      setBusy(true);
      void store.deleteSavingsEntry(deleteId).then(() => setDeleteId("")).catch(() => { setDeleteId(""); setError("Could not remove this entry."); }).finally(() => setBusy(false));
    }} />
  </ScreenContainer>;
}
