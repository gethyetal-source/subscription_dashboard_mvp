import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Switch, View } from "react-native";
import { Button, Card, Copy, Field, Page } from "@/components/app-ui";
import { services, billingSourceMeta } from "@/lib/catalog";
import { DatePickerSheet } from "@/components/date-picker-sheet";
import { cadenceLabel, potentialDuplicates } from "@/lib/import-utils";
import { localDateSchema } from "@/lib/data-safety";
import { useSubscriptions } from "@/lib/subscription-store";
import { localDateKey } from "@/lib/subscription-utils";
import type { BillingCadence, BillingSource } from "@/lib/subscription-types";

export default function QuickAddScreen() {
  const params = useLocalSearchParams<{ name?: string; amount?: string; currency?: string; serviceId?: string; renewalDate?: string }>();
  const store = useSubscriptions();
  const [name, setName] = useState(params.name ?? "");
  const [serviceId, setServiceId] = useState(params.serviceId ?? "custom");
  const [amount, setAmount] = useState(params.amount ?? "");
  const [currency, setCurrency] = useState(params.currency ?? store.settings.budgetCurrency ?? "USD");
  const [cadence, setCadence] = useState<BillingCadence>("monthly");
  const [renewalDate, setRenewal] = useState(params.renewalDate ?? "");
  const [source, setSource] = useState<BillingSource>(store.subscriptions[0]?.billingSource ?? "provider");
  const [reminder, setReminder] = useState(true);
  const [picker, setPicker] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [acknowledgedDuplicate, setAcknowledgedDuplicate] = useState(false);
  const duplicates = potentialDuplicates(serviceId, name, store.subscriptions);
  const matches = name.trim() ? services.filter((service) => service.name.toLowerCase().includes(name.toLowerCase())).slice(0, 6) : [];
  const save = async (another: boolean) => {
    setError("");
    const value = Number(amount.replace(",", "."));
    if (!name.trim() || !amount.trim() || !Number.isFinite(value) || value < 0 || value > 1e9 || !/^[A-Za-z]{3}$/.test(currency)) { setError("Enter a name, a valid non-negative amount, and a three-letter currency."); return; }
    if (!localDateSchema.safeParse(renewalDate).success || renewalDate < localDateKey()) { setError("Choose today or a future renewal date."); return; }
    if (duplicates.length && !acknowledgedDuplicate) { setError("Review the possible duplicate and confirm that this is a separate subscription."); return; }
    setBusy(true);
    try {
      const record = await store.addSubscription({ serviceId, planName: name.trim(), amount: value, currency: currency.toUpperCase(), cadence, renewalDate, billingSource: source, status: "active", reminderEnabled: reminder });
      if (another) { setName(""); setServiceId("custom"); setAmount(""); setRenewal(""); setAcknowledgedDuplicate(false); setError("Saved. Add your next subscription."); }
      else router.replace(`/subscription/${record.id}` as never);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save."); }
    finally { setBusy(false); }
  };
  return <Page title="Quick add" subtitle="Enter your actual billing details. No provider account is connected.">
    <Card title="Subscription">
      <Field label="Service and plan name" value={name} onChangeText={(value) => { setName(value); setServiceId("custom"); setAcknowledgedDuplicate(false); }} maxLength={200} />
      {matches.map((service) => <Button key={service.id} label={`Use ${service.name}`} secondary onPress={() => { setName(service.name); setServiceId(service.id); setAcknowledgedDuplicate(false); }} />)}
      <Field label="Amount per billing period" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      <Field label="Currency" value={currency} onChangeText={setCurrency} autoCapitalize="characters" maxLength={3} />
      <View style={{ gap: 8 }}>{(["weekly", "monthly", "quarterly", "yearly"] as const).map((option) => <Button key={option} label={`${cadence === option ? "Selected: " : ""}${cadenceLabel(option)}`} secondary={cadence !== option} onPress={() => setCadence(option)} />)}</View>
      <Button label={renewalDate ? `Renewal: ${renewalDate}` : "Choose renewal date"} secondary onPress={() => setPicker(true)} />
      <View style={{ flexDirection: "row", gap: 8 }}>{[7, 30].map((days) => <Button key={days} label={`In ${days} days`} secondary onPress={() => { const date = new Date(); date.setDate(date.getDate() + days); setRenewal(localDateKey(date)); }} />)}</View>
    </Card>
    <Card title="Billing source & reminders">
      {([...new Set([source, ...store.subscriptions.slice(0, 5).map((item) => item.billingSource), "provider", "apple", "google", "unknown"])] as BillingSource[]).map((option) => <Button key={option} secondary={source !== option} label={billingSourceMeta[option].label} onPress={() => setSource(option)} />)}
      <Copy>Enable reminders for this subscription</Copy><Switch accessibilityLabel="Enable reminders for this subscription" value={reminder} onValueChange={setReminder} />
    </Card>
    {duplicates.length ? <Card title="Possible duplicate"><Copy>{duplicates.map((record) => record.planName).join(", ")} already exists. This is a suggestion, not proof of duplicate billing.</Copy><Copy>This is a separate subscription</Copy><Switch accessibilityLabel="Confirm a separate subscription" value={acknowledgedDuplicate} onValueChange={setAcknowledgedDuplicate} /></Card> : null}
    {error ? <Copy>{error}</Copy> : null}
    <Button label={busy ? "Saving…" : "Save subscription"} disabled={busy || !store.isReady} onPress={() => void save(false)} />
    <Button label="Save and add another" secondary disabled={busy || !store.isReady} onPress={() => void save(true)} />
    <DatePickerSheet visible={picker} value={renewalDate} minDate={localDateKey()} title="Choose renewal date" onClose={() => setPicker(false)} onSelect={setRenewal} />
  </Page>;
}
