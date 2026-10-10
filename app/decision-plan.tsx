import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Button, ChoiceChips, Copy, Field, Notice } from "@/components/app-ui";
import { Disclosure, FinancePage, MetricLabel, Surface, financeType } from "@/components/finance-ui";
import { ServiceBadge } from "@/components/subscription-ui";
import { deadlineLabel, subscriptionName } from "@/lib/finance-overview";
import { useMoneyFormatter } from "@/lib/privacy";
import { useSubscriptions } from "@/lib/subscription-store";
import type { RenewalDecisionAction, SubscriptionIntentTag, ValueBuyAgain, ValueUseLevel } from "@/lib/subscription-types";
import { usePalette } from "@/lib/ui-theme";

const decisions: { value: RenewalDecisionAction; label: string; detail: string }[] = [
  { value: "keep", label: "Keep it", detail: "It still earns its place" },
  { value: "downgrade", label: "Find a cheaper plan", detail: "Keep the value, trim the cost" },
  { value: "pause", label: "Pause if available", detail: "Take a break, not a final goodbye" },
  { value: "cancel-officially", label: "Cancel with provider", detail: "Stop paying for what you don’t need" },
  { value: "review-later", label: "Decide later", detail: "Keep this on your radar" },
];

export default function DecisionPlanScreen() {
  const colors = usePalette();
  const money = useMoneyFormatter();
  const { id, section } = useLocalSearchParams<{ id: string; section?: string }>();
  const store = useSubscriptions();
  const record = store.subscriptions.find((item) => item.id === id);
  const [action, setAction] = useState<RenewalDecisionAction>(record?.renewalDecisionPlan?.action ?? "review-later");
  const [decisionNote, setDecisionNote] = useState(record?.renewalDecisionPlan?.note ?? "");
  const [tags, setTags] = useState<SubscriptionIntentTag[]>(record?.intentTags ?? []);
  const [useLevel, setUseLevel] = useState<ValueUseLevel>(record?.valueCheckIn?.useLevel ?? "unknown");
  const [buyAgain, setBuyAgain] = useState<ValueBuyAgain>(record?.valueCheckIn?.wouldBuyAgain ?? "maybe");
  const [valueNote, setValueNote] = useState(record?.valueCheckIn?.note ?? "");
  const [valueOpen, setValueOpen] = useState(section === "value");
  const [otherOpen, setOtherOpen] = useState(false);
  const [valueEdited, setValueEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!record) return <FinancePage title="Renewal review"><Copy muted>This subscription is no longer on this device.</Copy><Button label="View subscriptions" onPress={() => router.replace("/(tabs)/subscriptions")} /></FinancePage>;
  const due = record.status === "trial" ? record.trialEndDate ?? record.renewalDate : record.renewalDate;
  const save = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      await store.updateDecisionSupport(record.id, {
        intentTags: tags,
        renewalDecisionPlan: { action, note: decisionNote.trim() || undefined, decidedAt: new Date().toISOString() },
        valueCheckIn: valueEdited ? { useLevel, wouldBuyAgain: buyAgain, note: valueNote.trim() || undefined, checkedAt: new Date().toISOString() } : record.valueCheckIn,
      });
      if (router.canGoBack()) router.back(); else router.replace(`/subscription/${record.id}` as never);
    } catch { setError("Could not save your decision. Please try again."); }
    finally { setBusy(false); }
  };
  return <FinancePage title="Renewal review">
    <Surface>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <ServiceBadge serviceId={record.serviceId} label={record.planName} />
        <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: colors.foreground, fontFamily: financeType.semi, fontSize: 17 }}>{subscriptionName(record)}</Text><MetricLabel>{record.status === "trial" ? "Trial ends" : "Saved renewal date"} · {deadlineLabel(due)}</MetricLabel></View>
      </View>
      <Text style={{ color: colors.foreground, fontFamily: financeType.bold, fontSize: 30 }}>{money(record.expectedNextCharge ?? record.amount, record.currency)}</Text>
      <MetricLabel>Expected next charge · based on your saved details</MetricLabel>
    </Surface>
    <View style={{ gap: 10 }}>
      <Text style={{ color: colors.foreground, fontFamily: financeType.semi, fontSize: 19 }}>What’s your next step?</Text>
      {decisions.map((decision) => <Pressable key={decision.value} accessibilityRole="radio" accessibilityLabel={decision.label} accessibilityState={{ selected: action === decision.value, disabled: busy }} disabled={busy} onPress={() => setAction(decision.value)}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, padding: 15, minHeight: 64, borderWidth: 1, borderColor: action === decision.value ? colors.primary : colors.border, backgroundColor: action === decision.value ? colors.elevated : colors.surface, opacity: pressed ? 0.7 : 1 })}>
        <View style={{ flex: 1 }}><Text style={{ color: colors.foreground, fontFamily: financeType.medium, fontSize: 14 }}>{decision.label}</Text><Text style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 11, marginTop: 4 }}>{decision.detail}</Text></View>
        <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: action === decision.value ? colors.primary : colors.border, justifyContent: "center", alignItems: "center" }}>{action === decision.value ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} /> : null}</View>
      </Pressable>)}
    </View>
    <View>
      <Disclosure title="Still worth the price?" open={valueOpen} onToggle={() => setValueOpen(!valueOpen)}>
        <ChoiceChips label="How often do you use it?" value={useLevel} options={[{ value: "frequent", label: "Often" }, { value: "occasional", label: "Sometimes" }, { value: "rare", label: "Rarely" }, { value: "unknown", label: "Not sure" }]} disabled={busy} onChange={(value) => { setUseLevel(value); setValueEdited(true); }} />
        <ChoiceChips label="Would you choose it again today?" value={buyAgain} options={[{ value: "yes", label: "Yes" }, { value: "maybe", label: "Maybe" }, { value: "no", label: "No" }]} disabled={busy} onChange={(value) => { setBuyAgain(value); setValueEdited(true); }} />
        <Field label="Your check-in note (optional)" value={valueNote} onChangeText={(value) => { setValueNote(value); setValueEdited(true); }} maxLength={1000} editable={!busy} />
      </Disclosure>
      <Disclosure title="Notes & purpose" open={otherOpen} onToggle={() => setOtherOpen(!otherOpen)}>
        <Field label="Decision note (optional)" value={decisionNote} onChangeText={setDecisionNote} maxLength={1000} editable={!busy} />
        <Copy>What is this for?</Copy>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{(["essential", "seasonal", "work", "learning", "family", "testing", "backup"] as SubscriptionIntentTag[]).map((tag) => <Pressable key={tag} accessibilityRole="checkbox" accessibilityState={{ checked: tags.includes(tag) }} onPress={() => setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])} disabled={busy} style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 10, justifyContent: "center", backgroundColor: tags.includes(tag) ? colors.primary : colors.elevated }}><Text style={{ color: tags.includes(tag) ? colors.onPrimary : colors.foreground, fontFamily: financeType.medium, fontSize: 12, textTransform: "capitalize" }}>{tag}</Text></Pressable>)}</View>
      </Disclosure>
    </View>
    <Text style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 11, lineHeight: 19 }}>This saves your decision, not a provider-side change. Use “Manage with provider” to change or cancel your plan.</Text>
    {error ? <Notice error>{error}</Notice> : null}
    <Button label={busy ? "Saving…" : "Save decision"} disabled={busy} onPress={() => void save()} />
  </FinancePage>;
}
