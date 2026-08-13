import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Pill, PrimaryButton, SecondaryButton, ServiceBadge } from "@/components/subscription-ui";
import { billingSourceMeta, getService } from "@/lib/catalog";
import { ScreenContainer } from "@/components/screen-container";
import { useSubscriptions } from "@/lib/subscription-store";
import type { SubscriptionStatus } from "@/lib/subscription-types";
import { annualAmount, formatCurrency, formatDate, formatRelativeRenewal, monthlyAmount, resolveManagementUrl } from "@/lib/subscription-utils";

export default function SubscriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { subscriptions, updateStatus, deleteSubscription } = useSubscriptions();
  const record = subscriptions.find((item) => item.id === id);
  if (!record) return <ScreenContainer className="p-5"><Text style={styles.missing}>This subscription no longer exists.</Text><Pressable onPress={() => router.replace("/(tabs)/subscriptions")}><Text style={styles.backToList}>Back to my subscriptions</Text></Pressable></ScreenContainer>;
  const service = getService(record.serviceId);
  const source = billingSourceMeta[record.billingSource];
  const tone = record.status === "trial" ? "amber" : record.status === "cancelled" ? "coral" : record.status === "uncertain" ? "neutral" : "teal";
  const setStatus = async (status: SubscriptionStatus) => { await updateStatus(record.id, status); };
  const manageOfficially = () => Alert.alert("Open official management page?", `${source.description}\n\nSubTrack cannot cancel this subscription for you. The billing authority will confirm any action.`, [
    { text: "Not now", style: "cancel" },
    { text: "Open official page", onPress: () => void WebBrowser.openBrowserAsync(resolveManagementUrl(record), { controlsColor: "#0E9F8A", showTitle: true }) },
  ]);
  const confirmDelete = () => Alert.alert("Delete this record?", "This removes the local SubTrack record and its reminder. It will not cancel the provider subscription.", [
    { text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => { await deleteSubscription(record.id); router.replace("/(tabs)/subscriptions"); } },
  ]);

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.nav}><Pressable onPress={() => router.back()} hitSlop={8}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.navTitle}>Subscription</Text><Pressable onPress={() => router.push(`/subscription/edit?subscriptionId=${record.id}&serviceId=${record.serviceId}` as never)}><Text style={styles.edit}>Edit</Text></Pressable></View>
        <View style={styles.hero}><ServiceBadge serviceId={record.serviceId} size="large" /><View style={{ flex: 1 }}><View style={styles.heroTop}><Text style={styles.title}>{service?.name ?? "Subscription"}</Text><Pill label={record.status} tone={tone} /></View><Text style={styles.plan}>{record.planName}</Text><Text style={styles.renewal}>{formatRelativeRenewal(record.renewalDate)}</Text></View></View>
        <View style={styles.costCard}><View><Text style={styles.costLabel}>YOU PAY</Text><Text style={styles.costAmount}>{formatCurrency(record.amount, record.currency)}</Text><Text style={styles.cadence}>{record.cadence}</Text></View><View style={styles.costSide}><Text style={styles.costSideLabel}>MONTHLY ESTIMATE</Text><Text style={styles.costSideValue}>{formatCurrency(monthlyAmount(record.amount, record.cadence), record.currency)}</Text><Text style={styles.costSideLabel}>ANNUAL ESTIMATE</Text><Text style={styles.costSideValue}>{formatCurrency(annualAmount(record.amount, record.cadence), record.currency)}</Text></View></View>
        <Text style={styles.section}>Renewal</Text><View style={styles.infoCard}><Text style={styles.infoLabel}>Next renewal date</Text><Text style={styles.infoValue}>{formatDate(record.renewalDate)}</Text>{record.trialEndDate ? <><View style={styles.divider} /><Text style={styles.infoLabel}>Trial ends</Text><Text style={styles.infoValue}>{formatDate(record.trialEndDate)}</Text></> : null}<View style={styles.divider} /><Text style={styles.infoLabel}>Reminder</Text><Text style={styles.infoValue}>{record.reminderEnabled ? "On for this subscription" : "Off"}</Text></View>
        <Text style={styles.section}>Billing source</Text><View style={styles.sourceCard}><Text style={styles.sourceTitle}>{source.label}</Text><Text style={styles.sourceDescription}>{source.description}</Text><Text style={styles.sourceNote}>{service?.managementHint}</Text></View>
        <PrimaryButton label="Manage officially" onPress={manageOfficially} />
        <Text style={styles.disclaimer}>SubTrack opens an official page only. It does not confirm, cancel, or modify a provider account.</Text>
        <Text style={styles.section}>Update your local record</Text><View style={styles.statusRow}>{(["active", "trial", "cancelled", "uncertain"] as SubscriptionStatus[]).map((item) => <Pressable key={item} onPress={() => void setStatus(item)} style={({ pressed }) => [styles.statusButton, record.status === item && styles.statusButtonSelected, pressed && styles.pressed]}><Text style={[styles.statusText, record.status === item && styles.statusTextSelected]}>{item}</Text></Pressable>)}</View>
        {record.notes ? <><Text style={styles.section}>Note</Text><View style={styles.note}><Text style={styles.noteText}>{record.notes}</Text></View></> : null}
        <SecondaryButton label="Compare service plans" onPress={() => router.push({ pathname: "/compare/[serviceId]", params: { serviceId: record.serviceId } })} />
        <Pressable onPress={confirmDelete} style={({ pressed }) => [styles.delete, pressed && styles.pressed]}><Text style={styles.deleteText}>Delete local record</Text></Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 30, gap: 12 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { color: "#10253F", fontSize: 34, lineHeight: 34, fontWeight: "300" }, navTitle: { color: "#10253F", fontSize: 14, fontWeight: "800" }, edit: { color: "#0E9F8A", fontSize: 14, fontWeight: "800" },
  hero: { flexDirection: "row", gap: 14, alignItems: "center", paddingTop: 8 }, heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { color: "#10253F", fontSize: 24, fontWeight: "800", letterSpacing: -0.7 }, plan: { color: "#526476", fontSize: 13, fontWeight: "700", marginTop: 4 }, renewal: { color: "#0E9F8A", fontSize: 12, fontWeight: "800", marginTop: 4 },
  costCard: { backgroundColor: "#10253F", borderRadius: 22, padding: 19, flexDirection: "row", justifyContent: "space-between" }, costLabel: { color: "#A7C5D7", fontSize: 10, fontWeight: "900", letterSpacing: 1.1 }, costAmount: { color: "#FFFFFF", fontSize: 29, fontWeight: "800", letterSpacing: -0.8, marginTop: 5 }, cadence: { color: "#B5CFE0", fontSize: 12, fontWeight: "700", textTransform: "capitalize", marginTop: 2 },
  costSide: { alignItems: "flex-end", gap: 3, paddingTop: 1 }, costSideLabel: { color: "#9CBACE", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 }, costSideValue: { color: "#FFFFFF", fontSize: 13, fontWeight: "800", marginBottom: 5 },
  section: { color: "#10253F", fontSize: 15, fontWeight: "800", marginTop: 8 }, infoCard: { backgroundColor: "#FFFFFF", borderRadius: 17, padding: 15, borderWidth: 1, borderColor: "#E6ECF2" }, infoLabel: { color: "#667085", fontSize: 11, fontWeight: "700" }, infoValue: { color: "#10253F", fontSize: 14, fontWeight: "800", marginTop: 3 }, divider: { height: 1, backgroundColor: "#EEF2F6", marginVertical: 12 },
  sourceCard: { backgroundColor: "#EDF7F5", borderRadius: 17, padding: 15 }, sourceTitle: { color: "#087B6C", fontSize: 14, fontWeight: "800" }, sourceDescription: { color: "#3A6D66", fontSize: 12, lineHeight: 17, marginTop: 4 }, sourceNote: { color: "#3A6D66", fontSize: 11, lineHeight: 16, marginTop: 10, fontStyle: "italic" }, disclaimer: { color: "#667085", fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: -4 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, statusButton: { paddingHorizontal: 11, paddingVertical: 8, backgroundColor: "#EAF0F5", borderRadius: 99 }, statusButtonSelected: { backgroundColor: "#10253F" }, statusText: { color: "#667085", fontSize: 11, fontWeight: "800", textTransform: "capitalize" }, statusTextSelected: { color: "#FFFFFF" },
  note: { backgroundColor: "#FFFFFF", borderRadius: 15, padding: 14, borderWidth: 1, borderColor: "#E6ECF2" }, noteText: { color: "#526476", fontSize: 13, lineHeight: 18 },
  delete: { paddingVertical: 15, alignItems: "center" }, deleteText: { color: "#C34545", fontSize: 13, fontWeight: "800" }, pressed: { opacity: 0.72 }, missing: { color: "#667085" }, backToList: { color: "#0E9F8A", fontWeight: "800", marginTop: 10 },
});
