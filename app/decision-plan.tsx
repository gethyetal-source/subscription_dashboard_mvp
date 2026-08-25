import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton, SecondaryButton, ServiceBadge } from "@/components/subscription-ui";
import { ScreenContainer } from "@/components/screen-container";
import { getService } from "@/lib/catalog";
import { useSubscriptions } from "@/lib/subscription-store";
import type { RenewalDecisionAction, SubscriptionIntentTag, ValueBuyAgain, ValueUseLevel } from "@/lib/subscription-types";
import { formatCurrency, formatDate } from "@/lib/subscription-utils";

const type = { regular: "Poppins-Regular", semi: "Poppins-SemiBold", bold: "Poppins-Bold" };

export default function DecisionPlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { subscriptions, updateDecisionSupport } = useSubscriptions();
  const record = subscriptions.find((item) => item.id === id);
  const [action, setAction] = useState<RenewalDecisionAction>(record?.renewalDecisionPlan?.action ?? "review-later");
  const [decisionNote, setDecisionNote] = useState(record?.renewalDecisionPlan?.note ?? "");
  const [intentTags, setIntentTags] = useState<SubscriptionIntentTag[]>(record?.intentTags ?? []);
  const [useLevel, setUseLevel] = useState<ValueUseLevel>(record?.valueCheckIn?.useLevel ?? "unknown");
  const [wouldBuyAgain, setWouldBuyAgain] = useState<ValueBuyAgain>(record?.valueCheckIn?.wouldBuyAgain ?? "maybe");
  const [valueNote, setValueNote] = useState(record?.valueCheckIn?.note ?? "");
  const [saving, setSaving] = useState(false);

  if (!record) return <ScreenContainer className="p-5"><Text style={styles.missing}>This subscription record no longer exists.</Text><Pressable onPress={() => router.replace("/(tabs)/subscriptions")}><Text style={styles.link}>Back to subscriptions</Text></Pressable></ScreenContainer>;

  const service = getService(record.serviceId);
  const toggleTag = (tag: SubscriptionIntentTag) => setIntentTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  const save = async () => {
    try {
      setSaving(true);
      await updateDecisionSupport(record.id, {
        intentTags,
        renewalDecisionPlan: { action, note: decisionNote.trim() || undefined, decidedAt: new Date().toISOString() },
        valueCheckIn: { useLevel, wouldBuyAgain, note: valueNote.trim() || undefined, checkedAt: new Date().toISOString() },
      });
      Alert.alert("Decision saved", "This is your local plan. Open the official billing page if you need to change a provider account.", [{ text: "Done", onPress: () => router.back() }]);
    } finally {
      setSaving(false);
    }
  };
  const decisionChoice = (value: RenewalDecisionAction, label: string) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: action === value }} onPress={() => setAction(value)} style={({ pressed }) => [styles.choice, action === value && styles.choiceSelected, pressed && styles.pressed]}><Text style={[styles.choiceText, action === value && styles.choiceTextSelected]}>{label}</Text></Pressable>;
  const tagChoice = (value: SubscriptionIntentTag, label: string) => <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: intentTags.includes(value) }} onPress={() => toggleTag(value)} style={({ pressed }) => [styles.tag, intentTags.includes(value) && styles.tagSelected, pressed && styles.pressed]}><Text style={[styles.tagText, intentTags.includes(value) && styles.tagTextSelected]}>{label}</Text></Pressable>;
  const usageChoice = (value: ValueUseLevel, label: string) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: useLevel === value }} onPress={() => setUseLevel(value)} style={({ pressed }) => [styles.choice, useLevel === value && styles.choiceSelected, pressed && styles.pressed]}><Text style={[styles.choiceText, useLevel === value && styles.choiceTextSelected]}>{label}</Text></Pressable>;
  const buyChoice = (value: ValueBuyAgain, label: string) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: wouldBuyAgain === value }} onPress={() => setWouldBuyAgain(value)} style={({ pressed }) => [styles.choice, wouldBuyAgain === value && styles.choiceSelected, pressed && styles.pressed]}><Text style={[styles.choiceText, wouldBuyAgain === value && styles.choiceTextSelected]}>{label}</Text></Pressable>;

  return <ScreenContainer className="px-5" containerClassName="bg-background" edges={["top", "bottom", "left", "right"]}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">
    <View style={styles.nav}><Pressable onPress={() => router.back()} hitSlop={10}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.navTitle}>RENEWAL DECISION</Text><View style={styles.navSpacer} /></View>
    <View style={styles.hero}><ServiceBadge serviceId={record.serviceId} size="regular" /><View style={styles.heroCopy}><Text style={styles.title}>{service?.name ?? record.planName}</Text><Text style={styles.subtitle}>Next review · {formatDate(record.status === "trial" ? record.trialEndDate ?? record.renewalDate : record.renewalDate)}</Text></View></View>
    <View style={styles.expected}><Text style={styles.expectedLabel}>EXPECTED NEXT CHARGE</Text><Text style={styles.expectedValue}>{formatCurrency(record.expectedNextCharge ?? record.amount, record.currency)}</Text><Text style={styles.expectedHint}>{record.costChangeReason || "Use the amount you saved locally; SubTrack does not check provider invoices."}</Text></View>
    <Text style={styles.section}>What is your plan?</Text><Text style={styles.helper}>This records your own next step. It does not modify the provider account.</Text><View style={styles.choiceWrap}>{decisionChoice("keep", "Keep")}{decisionChoice("downgrade", "Downgrade")}{decisionChoice("pause", "Pause if available")}{decisionChoice("cancel-officially", "Cancel officially")}{decisionChoice("review-later", "Review later")}</View>
    <View style={styles.card}><Text style={styles.fieldLabel}>Decision note</Text><TextInput value={decisionNote} onChangeText={setDecisionNote} multiline placeholder="Optional · why this is the right next step" placeholderTextColor="#727A62" style={styles.noteInput} /></View>
    <Text style={styles.section}>What is this for?</Text><Text style={styles.helper}>Purpose tags make future renewal reviews faster. They are stored only with this local record.</Text><View style={styles.tagWrap}>{tagChoice("essential", "Essential")}{tagChoice("seasonal", "Seasonal")}{tagChoice("work", "Work")}{tagChoice("learning", "Learning")}{tagChoice("family", "Family")}{tagChoice("testing", "Testing")}{tagChoice("backup", "Backup")}</View>
    <Text style={styles.section}>Value check-in</Text><Text style={styles.helper}>SubTrack never tracks usage. Record your own view of this subscription today.</Text><View style={styles.card}><Text style={styles.fieldLabel}>How often do you use it?</Text><View style={styles.choiceWrap}>{usageChoice("frequent", "Frequently")}{usageChoice("occasional", "Sometimes")}{usageChoice("rare", "Rarely")}{usageChoice("unknown", "Not sure")}</View><View style={styles.divider} /><Text style={styles.fieldLabel}>Would you choose it again today?</Text><View style={styles.choiceWrap}>{buyChoice("yes", "Yes")}{buyChoice("maybe", "Maybe")}{buyChoice("no", "No")}</View><TextInput value={valueNote} onChangeText={setValueNote} multiline placeholder="Optional · what changed or what you still need" placeholderTextColor="#727A62" style={styles.noteInput} /></View>
    <PrimaryButton label={saving ? "Saving…" : "Save local decision"} onPress={() => void save()} disabled={saving} />
    <SecondaryButton label="Back to subscription" onPress={() => router.back()} />
  </ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { gap: 11, paddingBottom: 30, paddingTop: 8 }, nav: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, back: { color: "#F4F2E8", fontFamily: type.regular, fontSize: 34, lineHeight: 34 }, navTitle: { color: "#C9F72D", fontFamily: type.semi, fontSize: 10, letterSpacing: 1.1 }, navSpacer: { width: 24 }, hero: { alignItems: "center", backgroundColor: "#191E0F", borderColor: "#343A25", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 12, padding: 14 }, heroCopy: { flex: 1 }, title: { color: "#F4F2E8", fontFamily: type.bold, fontSize: 20, letterSpacing: -0.5 }, subtitle: { color: "#A8AD98", fontFamily: type.regular, fontSize: 11, marginTop: 3 }, expected: { backgroundColor: "#202713", borderColor: "#485632", borderRadius: 14, borderWidth: 1, padding: 15 }, expectedLabel: { color: "#A8AD98", fontFamily: type.semi, fontSize: 9, letterSpacing: 0.8 }, expectedValue: { color: "#C9F72D", fontFamily: type.bold, fontSize: 26, letterSpacing: -0.7, marginTop: 5 }, expectedHint: { color: "#C5CBB8", fontFamily: type.regular, fontSize: 10, lineHeight: 15, marginTop: 5 }, section: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 15, marginTop: 7 }, helper: { color: "#A8AD98", fontFamily: type.regular, fontSize: 10, lineHeight: 15, marginTop: -4 }, choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, choice: { backgroundColor: "#1D2212", borderColor: "#343A25", borderRadius: 10, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 9 }, choiceSelected: { backgroundColor: "#C9F72D", borderColor: "#C9F72D" }, choiceText: { color: "#C5CBB8", fontFamily: type.semi, fontSize: 10 }, choiceTextSelected: { color: "#172108" }, tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, tag: { backgroundColor: "#191E0F", borderColor: "#343A25", borderRadius: 999, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8 }, tagSelected: { backgroundColor: "#2A3511", borderColor: "#C9F72D" }, tagText: { color: "#A8AD98", fontFamily: type.semi, fontSize: 10 }, tagTextSelected: { color: "#C9F72D" }, card: { backgroundColor: "#191E0F", borderColor: "#343A25", borderRadius: 13, borderWidth: 1, padding: 12 }, fieldLabel: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 11 }, noteInput: { backgroundColor: "#12160B", borderColor: "#3A4227", borderRadius: 10, borderWidth: 1, color: "#F4F2E8", fontFamily: type.regular, fontSize: 11, lineHeight: 16, marginTop: 8, minHeight: 62, padding: 10, textAlignVertical: "top" }, divider: { backgroundColor: "#343A25", height: 1, marginVertical: 12 }, pressed: { opacity: 0.75 }, missing: { color: "#A8AD98", fontFamily: type.regular }, link: { color: "#C9F72D", fontFamily: type.semi, marginTop: 10 } });
