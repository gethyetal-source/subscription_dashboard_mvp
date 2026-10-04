import { useState } from "react";
import { router } from "expo-router";
import { Button, Card, Copy, Field, Page } from "@/components/app-ui";
import { useSubscriptions } from "@/lib/subscription-store";
import { useMoneyFormatter } from "@/lib/privacy";
import { budgetPosition, cashFlowForecast, priceChangeImpact } from "@/lib/insights";
import { getValueCheckPrompts, localDateKey } from "@/lib/subscription-utils";

export default function InsightsScreen() {
  const store = useSubscriptions(); const money = useMoneyFormatter();
  const budget = budgetPosition(store.subscriptions, store.settings);
  const [amount, setAmount] = useState(""); const [currency, setCurrency] = useState(budget.currency);
  const [date, setDate] = useState(localDateKey()); const [note, setNote] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const actualTotals = (store.savingsEntries ?? []).reduce<Record<string, number>>((result, entry) => ({ ...result, [entry.currency]: (result[entry.currency] ?? 0) + entry.amount }), {});
  return <Page title="Spending & value" subtitle="Forecasts are estimates based on your records. No exchange rates or provider-side usage tracking.">
    <Card title="Monthly budget">
      <Copy>{money(budget.monthly, budget.currency)} recurring monthly estimate</Copy>
      <Copy>{budget.budget > 0 ? `${money(Math.abs(budget.remaining), budget.currency)} ${budget.remaining < 0 ? "over" : "under"} your budget` : "Set a budget in Settings to receive a spending warning."}</Copy>
      {budget.excludedCurrencyCount ? <Copy muted>{budget.excludedCurrencyCount} other currency groups are excluded, not converted.</Copy> : null}
      <Button label="Edit budget" secondary onPress={() => router.push("/(tabs)/settings")} />
    </Card>
    <Card title="Upcoming cash flow">
      <Copy muted>This month shows remaining charges from today. Later months show projected charges. An expected-next-charge override applies only to the next payment.</Copy>
      {cashFlowForecast(store.subscriptions).map((bucket) => <Copy key={bucket.month}>{bucket.month} · {Object.entries(bucket.amounts).map(([code, value]) => money(value, code)).join(" · ") || "No projected charges"} · {bucket.charges} charges</Copy>)}
    </Card>
    <Card title="Subscription value check">
      {getValueCheckPrompts(store.subscriptions).slice(0, 10).map((prompt) => <Button key={prompt.subscription.id} label={prompt.title} secondary onPress={() => router.push({ pathname: "/decision-plan", params: { id: prompt.subscription.id } } as never)} />)}
      {!getValueCheckPrompts(store.subscriptions).length ? <Copy>No value checks need attention.</Copy> : null}
    </Card>
    <Card title="Price-change impact">
      {store.subscriptions.flatMap((record) => (record.planChangeHistory ?? []).slice(0, 3).map((event) => {
        const impact = priceChangeImpact(event);
        return <Copy key={event.id}>{record.planName} · {impact ? `${impact.monthlyChange > 0 ? "Increase" : impact.monthlyChange < 0 ? "Reduction" : "No price change"}: ${money(Math.abs(impact.monthlyChange), impact.currency)}/month; ${money(Math.abs(impact.annualChange), impact.currency)}/year estimate` : "Currency changed; no cross-currency comparison."}</Copy>;
      }))}
      <Copy muted>Historical changes are recorded when you edit price, plan, currency, or cadence. They do not prove a provider charge.</Copy>
    </Card>
    <Card title="Savings you recorded">
      <Copy>{Object.entries(actualTotals).map(([code, value]) => money(value, code)).join(" · ") || "No savings recorded yet."}</Copy>
      <Copy muted>Record only an amount you checked, such as a refund or an avoided charge. These user-reported entries are separate from projected cancellation savings.</Copy>
      <Field label="Savings amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      <Field label="Currency" value={currency} onChangeText={setCurrency} maxLength={3} autoCapitalize="characters" />
      <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
      <Field label="How you confirmed this saving" value={note} onChangeText={setNote} maxLength={1000} />
      <Button label={busy ? "Saving…" : "Record confirmed saving"} disabled={busy} onPress={() => {
        if (!amount.trim() || Number(amount) <= 0 || date > localDateKey()) { setError("Enter a positive amount and a date no later than today."); return; }
        setBusy(true);
        void store.addSavingsEntry({ amount: Number(amount), currency: currency.toUpperCase(), occurredOn: date, note })
          .then(() => { setAmount(""); setNote(""); setError(""); })
          .catch(() => setError("Enter a valid amount, currency, date, and confirmation note."))
          .finally(() => setBusy(false));
      }} />
      {(store.savingsEntries ?? []).map((entry) => <Card key={entry.id}><Copy>{entry.occurredOn} · {money(entry.amount, entry.currency)} · {entry.note}</Copy><Button label="Remove savings entry" secondary onPress={() => void store.deleteSavingsEntry(entry.id).catch(() => setError("Could not remove entry."))} /></Card>)}
      {error ? <Copy>{error}</Copy> : null}
    </Card>
  </Page>;
}
