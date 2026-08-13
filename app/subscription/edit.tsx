import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { PrimaryButton, ServiceBadge } from "@/components/subscription-ui";
import { billingSourceMeta, getService } from "@/lib/catalog";
import { ScreenContainer } from "@/components/screen-container";
import { useSubscriptions } from "@/lib/subscription-store";
import type { BillingCadence, BillingSource, SubscriptionDraft, SubscriptionStatus } from "@/lib/subscription-types";
import { isValidDateString } from "@/lib/subscription-utils";

const cadenceOptions: BillingCadence[] = ["weekly", "monthly", "quarterly", "yearly"];
const billingSources: BillingSource[] = ["apple", "google", "provider", "carrier", "reseller", "unknown"];
const statuses: SubscriptionStatus[] = ["active", "trial", "uncertain"];

export default function EditSubscriptionScreen() {
  const { serviceId, subscriptionId } = useLocalSearchParams<{ serviceId?: string; subscriptionId?: string }>();
  const { subscriptions, addSubscription, updateSubscription } = useSubscriptions();
  const existing = subscriptions.find((item) => item.id === subscriptionId);
  const selectedServiceId = existing?.serviceId ?? serviceId ?? "";
  const service = getService(selectedServiceId);
  const initialPlan = useMemo(() => {
    const found = service?.plans.find((plan) => plan.id === existing?.planId) ?? service?.plans[0];
    return found;
  }, [existing?.planId, service]);
  const [planId, setPlanId] = useState(existing?.planId ?? initialPlan?.id ?? "");
  const [planName, setPlanName] = useState(existing?.planName ?? initialPlan?.name ?? "");
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [currency, setCurrency] = useState(existing?.currency ?? "USD");
  const [cadence, setCadence] = useState<BillingCadence>(existing?.cadence ?? initialPlan?.cadence ?? "monthly");
  const [renewalDate, setRenewalDate] = useState(existing?.renewalDate ?? "");
  const [trialEndDate, setTrialEndDate] = useState(existing?.trialEndDate ?? "");
  const [billingSource, setBillingSource] = useState<BillingSource>(existing?.billingSource ?? "provider");
  const [status, setStatus] = useState<SubscriptionStatus>(existing?.status === "cancelled" ? "active" : existing?.status ?? "active");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [reminderEnabled, setReminderEnabled] = useState(existing?.reminderEnabled ?? true);
  const [saving, setSaving] = useState(false);

  const selectPlan = (nextPlanId: string) => {
    const next = service?.plans.find((plan) => plan.id === nextPlanId);
    if (!next) return;
    setPlanId(next.id); setPlanName(next.name); setCadence(next.cadence);
  };

  const save = async () => {
    if (!service) return Alert.alert("Select a service", "Start from the catalog and choose the service you want to track.");
    const numericAmount = Number.parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(numericAmount) || numericAmount < 0) return Alert.alert("Add a valid price", "Enter the amount you actually pay for this plan.");
    if (!isValidDateString(renewalDate)) return Alert.alert("Add a renewal date", "Use the YYYY-MM-DD format, for example 2026-09-15.");
    if (trialEndDate && !isValidDateString(trialEndDate)) return Alert.alert("Check the trial date", "Use the YYYY-MM-DD format, or leave it blank.");
    const draft: SubscriptionDraft = { serviceId: service.id, planId, planName: planName || service.name, amount: numericAmount, currency: currency.toUpperCase().slice(0, 3), cadence, renewalDate, trialEndDate: trialEndDate || undefined, billingSource, status, notes: notes.trim() || undefined, reminderEnabled };
    setSaving(true);
    try {
      const saved = existing ? await updateSubscription(existing.id, draft) : await addSubscription(draft);
      if (!saved) throw new Error("The subscription could not be saved.");
      router.replace(`/subscription/${saved.id}` as never);
    } catch (error) {
      Alert.alert("Could not save", error instanceof Error ? error.message : "Please try again.");
    } finally { setSaving(false); }
  };

  if (!service) return <ScreenContainer className="p-5"><Text style={styles.missing}>Choose a service from Discover before adding a subscription.</Text><Pressable onPress={() => router.replace("/(tabs)/discover")}><Text style={styles.discoverLink}>Open Discover</Text></Pressable></ScreenContainer>;

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background" edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.nav}><Pressable onPress={() => router.back()} hitSlop={8}><Text style={styles.close}>×</Text></Pressable><Text style={styles.navTitle}>{existing ? "Edit subscription" : "Add subscription"}</Text><View style={{ width: 25 }} /></View>
        <View style={styles.serviceSummary}><ServiceBadge serviceId={service.id} size="large" /><View><Text style={styles.serviceName}>{service.name}</Text><Text style={styles.serviceMeta}>{service.category}</Text></View><Pressable onPress={() => router.replace("/(tabs)/discover")}><Text style={styles.change}>Change</Text></Pressable></View>
        <Text style={styles.section}>Your plan</Text>
        <View style={styles.optionGroup}>{service.plans.map((plan) => <Pressable key={plan.id} onPress={() => selectPlan(plan.id)} style={({ pressed }) => [styles.option, planId === plan.id && styles.optionSelected, pressed && styles.pressed]}><Text style={[styles.optionText, planId === plan.id && styles.optionTextSelected]}>{plan.name}</Text><Text style={[styles.optionSubtext, planId === plan.id && styles.optionSubtextSelected]}>{plan.priceLabel}</Text></Pressable>)}</View>
        <Text style={styles.section}>What you pay</Text>
        <View style={styles.inputRow}><View style={styles.amountBox}><Text style={styles.inputLabel}>Amount</Text><TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#98A3B3" style={styles.amountInput} /></View><View style={styles.currencyBox}><Text style={styles.inputLabel}>Currency</Text><TextInput value={currency} onChangeText={setCurrency} autoCapitalize="characters" maxLength={3} placeholder="USD" placeholderTextColor="#98A3B3" style={styles.currencyInput} /></View></View>
        <View style={styles.frequencyRow}>{cadenceOptions.map((item) => <Pressable key={item} onPress={() => setCadence(item)} style={({ pressed }) => [styles.frequency, cadence === item && styles.frequencySelected, pressed && styles.pressed]}><Text style={[styles.frequencyText, cadence === item && styles.frequencyTextSelected]}>{item}</Text></Pressable>)}</View>
        <Text style={styles.section}>Dates</Text>
        <View style={styles.dateCard}><Text style={styles.inputLabel}>Next renewal</Text><TextInput value={renewalDate} onChangeText={setRenewalDate} placeholder="YYYY-MM-DD" placeholderTextColor="#98A3B3" style={styles.dateInput} /></View>
        {status === "trial" ? <View style={styles.dateCard}><Text style={styles.inputLabel}>Trial ends</Text><TextInput value={trialEndDate} onChangeText={setTrialEndDate} placeholder="YYYY-MM-DD" placeholderTextColor="#98A3B3" style={styles.dateInput} /></View> : null}
        <Text style={styles.section}>Subscription status</Text>
        <View style={styles.frequencyRow}>{statuses.map((item) => <Pressable key={item} onPress={() => setStatus(item)} style={({ pressed }) => [styles.frequency, status === item && styles.frequencySelected, pressed && styles.pressed]}><Text style={[styles.frequencyText, status === item && styles.frequencyTextSelected]}>{item}</Text></Pressable>)}</View>
        <Text style={styles.section}>Who bills you?</Text>
        <View style={styles.billingList}>{billingSources.map((item) => <Pressable key={item} onPress={() => setBillingSource(item)} style={({ pressed }) => [styles.billingOption, billingSource === item && styles.billingSelected, pressed && styles.pressed]}><View style={styles.radio}>{billingSource === item ? <View style={styles.radioDot} /> : null}</View><View style={styles.billingCopy}><Text style={styles.billingTitle}>{billingSourceMeta[item].label}</Text><Text style={styles.billingDescription}>{billingSourceMeta[item].description}</Text></View></Pressable>)}</View>
        <View style={styles.reminderRow}><View style={styles.reminderCopy}><Text style={styles.reminderTitle}>Renewal reminder</Text><Text style={styles.reminderBody}>Schedule a local alert before this subscription renews.</Text></View><Switch value={reminderEnabled} onValueChange={setReminderEnabled} trackColor={{ false: "#D5DEE7", true: "#7FD3C4" }} thumbColor={reminderEnabled ? "#0E9F8A" : "#FFFFFF"} /></View>
        <Text style={styles.section}>Note (optional)</Text><TextInput value={notes} onChangeText={setNotes} placeholder="e.g. Shared with family" placeholderTextColor="#98A3B3" style={styles.notes} multiline textAlignVertical="top" />
        <PrimaryButton label={saving ? "Saving…" : existing ? "Save changes" : "Add subscription"} onPress={() => void save()} disabled={saving} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 8, paddingBottom: 26, gap: 10 },
  nav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  close: { color: "#10253F", fontSize: 30, lineHeight: 30, fontWeight: "300" },
  navTitle: { color: "#10253F", fontSize: 15, fontWeight: "800" },
  serviceSummary: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#E6ECF2" },
  serviceName: { color: "#10253F", fontSize: 16, fontWeight: "800" },
  serviceMeta: { color: "#667085", fontSize: 12, marginTop: 3, fontWeight: "600" },
  change: { color: "#0E9F8A", fontSize: 12, fontWeight: "800", marginLeft: "auto" },
  section: { color: "#10253F", fontSize: 15, fontWeight: "800", marginTop: 10 },
  optionGroup: { gap: 8 },
  option: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 13, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E6ECF2" },
  optionSelected: { backgroundColor: "#F2FCF9", borderColor: "#0E9F8A" },
  optionText: { color: "#10253F", fontSize: 14, fontWeight: "800" }, optionTextSelected: { color: "#087B6C" },
  optionSubtext: { color: "#667085", fontSize: 11, fontWeight: "700" }, optionSubtextSelected: { color: "#087B6C" },
  inputRow: { flexDirection: "row", gap: 10 }, amountBox: { flex: 1.4 }, currencyBox: { flex: 0.6 },
  inputLabel: { color: "#667085", fontSize: 11, fontWeight: "800", marginBottom: 6 },
  amountInput: { height: 48, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DDE4EC", borderRadius: 13, paddingHorizontal: 13, color: "#10253F", fontSize: 16, fontWeight: "800" },
  currencyInput: { height: 48, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DDE4EC", borderRadius: 13, paddingHorizontal: 13, color: "#10253F", fontSize: 15, fontWeight: "800" },
  frequencyRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  frequency: { backgroundColor: "#EAF0F5", paddingVertical: 9, paddingHorizontal: 12, borderRadius: 99 }, frequencySelected: { backgroundColor: "#10253F" },
  frequencyText: { color: "#667085", fontSize: 12, fontWeight: "800", textTransform: "capitalize" }, frequencyTextSelected: { color: "#FFFFFF" },
  dateCard: { backgroundColor: "#FFFFFF", padding: 12, borderWidth: 1, borderColor: "#DDE4EC", borderRadius: 14 },
  dateInput: { color: "#10253F", fontSize: 15, fontWeight: "800", height: 23 },
  billingList: { gap: 7 },
  billingOption: { flexDirection: "row", gap: 10, padding: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E6ECF2", borderRadius: 14 }, billingSelected: { borderColor: "#0E9F8A", backgroundColor: "#F2FCF9" },
  radio: { height: 18, width: 18, borderRadius: 9, borderWidth: 2, borderColor: "#A3B1C0", alignItems: "center", justifyContent: "center", marginTop: 1 }, radioDot: { height: 8, width: 8, borderRadius: 4, backgroundColor: "#0E9F8A" },
  billingCopy: { flex: 1 }, billingTitle: { color: "#10253F", fontSize: 13, fontWeight: "800" }, billingDescription: { color: "#667085", fontSize: 11, lineHeight: 15, marginTop: 2 },
  reminderRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, backgroundColor: "#EAF7F4", borderRadius: 15, marginTop: 2 }, reminderCopy: { flex: 1 }, reminderTitle: { color: "#087B6C", fontSize: 13, fontWeight: "800" }, reminderBody: { color: "#3A6D66", fontSize: 11, lineHeight: 16, marginTop: 3 },
  notes: { minHeight: 78, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DDE4EC", borderRadius: 14, padding: 12, color: "#10253F", fontSize: 13, lineHeight: 18 },
  missing: { color: "#667085", fontSize: 15 }, discoverLink: { color: "#0E9F8A", fontWeight: "800", marginTop: 10 }, pressed: { opacity: 0.72 },
});
