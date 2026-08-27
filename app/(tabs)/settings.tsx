import { router } from "expo-router";
import { Alert, Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useCallback, useEffect, useState } from "react";

import { ElectricPageHeader } from "@/components/electric-page-header";
import { ScreenContainer } from "@/components/screen-container";
import { useCloudSync } from "@/lib/cloud-sync";
import { getReminderPermissionGuidance, type ReminderPermissionState } from "@/lib/reminder-utils";
import { getReminderPermissionState, getScheduledRenewalReminderCount, requestReminderPermission } from "@/lib/reminders";
import { useSubscriptions } from "@/lib/subscription-store";
import { buildRenewalCalendarExport } from "@/lib/subscription-utils";
import { useThemeContext } from "@/lib/theme-provider";

const type = { regular: "Poppins-Regular", semi: "Poppins-SemiBold", bold: "Poppins-Bold" };

export default function SettingsScreen() {
  const { settings, subscriptions, updateSettings, resetLocalData } = useSubscriptions();
  const { userEmail, profileName } = useCloudSync();
  const { colorScheme, setColorScheme } = useThemeContext();
  const sectionTheme = colorScheme === "dark" ? electric.dark : electric.light;
  const [budgetInput, setBudgetInput] = useState(settings.monthlyBudget ? String(settings.monthlyBudget) : "");
  const [reminderPermission, setReminderPermission] = useState<ReminderPermissionState | undefined>();
  const [scheduledReminderCount, setScheduledReminderCount] = useState<number | undefined>();
  const [reminderBusy, setReminderBusy] = useState(false);

  useEffect(() => { setBudgetInput(settings.monthlyBudget ? String(settings.monthlyBudget) : ""); }, [settings.monthlyBudget]);
  const refreshReminderTrust = useCallback(async () => {
    const [permission, scheduledCount] = await Promise.all([getReminderPermissionState(), getScheduledRenewalReminderCount()]);
    setReminderPermission(permission);
    setScheduledReminderCount(scheduledCount);
  }, []);
  useEffect(() => { void refreshReminderTrust(); }, [refreshReminderTrust]);

  const saveBudget = () => {
    const parsed = Number.parseFloat(budgetInput.replace(",", "."));
    void updateSettings({ monthlyBudget: Number.isFinite(parsed) && parsed > 0 ? parsed : 0 });
  };
  const exportData = async () => { await Share.share({ title: "My SubTrack data", message: JSON.stringify({ subscriptions, settings, exportedAt: new Date().toISOString() }, null, 2) }); };
  const exportCalendar = async () => { await Share.share({ title: "SubTrack renewal calendar", message: buildRenewalCalendarExport(subscriptions) }); };
  const reset = () => Alert.alert("Reset local data?", "This removes all local subscription records, correction drafts, evidence indexes, and reminders. It does not cancel any provider subscription.", [{ text: "Cancel", style: "cancel" }, { text: "Reset", style: "destructive", onPress: () => void resetLocalData() }]);
  const requestReminderAccess = async () => {
    try {
      setReminderBusy(true);
      const permission = await requestReminderPermission();
      setReminderPermission(permission);
      if (permission === "granted") await updateSettings({ notificationsEnabled: true });
      await refreshReminderTrust();
    } finally { setReminderBusy(false); }
  };
  const toggleReminders = (enabled: boolean) => {
    if (!enabled) { void updateSettings({ notificationsEnabled: false }).then(refreshReminderTrust); return; }
    if (reminderPermission === "granted") { void updateSettings({ notificationsEnabled: true }).then(refreshReminderTrust); return; }
    void requestReminderAccess();
  };
  const reminderCopy = reminderPermission ? getReminderPermissionGuidance(reminderPermission) : "Checking this device’s reminder permissions…";
  const deliveryCopy = reminderPermission === "granted" && settings.notificationsEnabled ? scheduledReminderCount === undefined ? "Checking scheduled renewal reminders…" : `${scheduledReminderCount} renewal reminder${scheduledReminderCount === 1 ? " is" : "s are"} scheduled on this device.` : "No local reminder delivery is currently active.";

  return <ScreenContainer className="px-5" containerClassName="bg-background"><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}><ElectricPageHeader title="Settings" subtitle="Privacy, renewal, and local-data preferences." />
    <View style={[styles.privacy, revamp.privacy]}><View style={[styles.privacyMark, revamp.privacyMark]}><Text style={revamp.privacyMarkText}>✓</Text></View><View style={styles.flex}><Text style={[styles.privacyTitle, revamp.privacyTitle]}>Stored on this device</Text><Text style={[styles.privacyBody, revamp.privacyBody]}>SubTrack does not request your bank details, inbox, or service passwords.</Text></View></View>
    <Section title="Appearance" theme={sectionTheme}><View style={styles.row}><View style={styles.rowCopy}><Text style={styles.rowTitle}>Dark theme</Text><Text style={styles.rowBody}>Use a darker interface in low-light environments.</Text></View><Switch value={colorScheme === "dark"} onValueChange={(value) => setColorScheme(value ? "dark" : "light")} trackColor={{ false: "#454D35", true: "#667D28" }} thumbColor={colorScheme === "dark" ? "#C9F72D" : "#F4F2E8"} /></View></Section>
    <Section title="Monthly budget" theme={sectionTheme}><View style={styles.row}><View style={styles.rowCopy}><Text style={styles.rowTitle}>Subscription spending limit</Text><Text style={styles.rowBody}>Set a monthly target to compare against estimated recurring spend.</Text></View><View style={styles.budgetBox}><Text style={styles.budgetPrefix}>$</Text><TextInput value={budgetInput} onChangeText={setBudgetInput} onBlur={saveBudget} onSubmitEditing={saveBudget} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#80868B" returnKeyType="done" style={styles.budgetInput} /></View></View></Section>
    <Section title="Reminders" theme={sectionTheme}><View style={styles.row}><View style={styles.rowCopy}><Text style={styles.rowTitle}>Renewal decision reminders</Text><Text style={styles.rowBody}>Local alerts include your saved trial, value-check, or decision context when available.</Text></View><Switch value={settings.notificationsEnabled && reminderPermission === "granted"} onValueChange={toggleReminders} trackColor={{ false: "#454D35", true: "#667D28" }} thumbColor={settings.notificationsEnabled && reminderPermission === "granted" ? "#C9F72D" : "#F4F2E8"} /></View><View style={styles.deliveryCard}><Text style={styles.deliveryTitle}>Reminder delivery</Text><Text style={styles.deliveryBody}>{reminderCopy}</Text><Text style={styles.deliveryStatus}>{deliveryCopy}</Text>{reminderPermission === "undetermined" ? <Pressable disabled={reminderBusy} accessibilityRole="button" onPress={() => void requestReminderAccess()} style={({ pressed }) => [styles.deliveryAction, (pressed || reminderBusy) && styles.pressed]}><Text style={styles.deliveryActionText}>{reminderBusy ? "Requesting access…" : "Allow renewal reminders"}</Text></Pressable> : null}</View><Divider /><View style={styles.row}><View style={styles.rowCopy}><Text style={styles.rowTitle}>Reminder lead time</Text><Text style={styles.rowBody}>Remind {settings.reminderDays} days before renewal.</Text></View><View style={styles.stepper}>{[1, 3, 7, 14, 30].map((days) => <Pressable key={days} accessibilityRole="button" accessibilityLabel={`Remind ${days} days before renewal`} onPress={() => void updateSettings({ reminderDays: days }).then(refreshReminderTrust)} style={({ pressed }) => [styles.step, days === settings.reminderDays && styles.stepSelected, pressed && styles.pressed]}><Text style={[styles.stepText, days === settings.reminderDays && styles.stepTextSelected]}>{days}d</Text></Pressable>)}</View></View></Section>
    <Section title="Household" theme={sectionTheme}><ActionRow title="Shared plans" body="See who uses a plan and each person’s local cost allocation." onPress={() => router.push("/household" as never)} /></Section>
    <Section title="Cloud sync" theme={sectionTheme}><ActionRow title={userEmail ? "Profile & cloud account" : "Log in to cloud sync"} body={userEmail ? `${profileName ? `${profileName} · ` : ""}${userEmail} is ready to manage profile details and manual sync.` : "Create or sign in to an optional account to back up subscriptions and your household roster."} onPress={() => router.push(userEmail ? "/(tabs)/profile" as never : "/cloud-sync" as never)} /></Section>
    <Section title="Subscription control" theme={sectionTheme}><ActionRow title="Control center" body="Review local renewal risks, category overlaps, billing clues, and cancellation follow-up." onPress={() => router.push("/control-center" as never)} /><Divider /><ActionRow title="Recognize an unknown charge" body="Work through your own charge label and billing clues without bank or inbox access." onPress={() => router.push("/charge-recognition" as never)} /></Section>
    <Section title="Review & history" theme={sectionTheme}><ActionRow title="Catalog price updates" body="Review India source findings, regional cautions, and local correction drafts." onPress={() => router.push("/catalog-updates" as never)} /><Divider /><ActionRow title="Evidence index" body="Find your local billing clues, plan changes, and cancellation references." onPress={() => router.push("/evidence-index" as never)} /><Divider /><ActionRow title="Archived subscription insights" body="See locally marked cancellations and estimated savings by currency." onPress={() => router.push("/archive-insights" as never)} /></Section>
    <Section title="About SubTrack" theme={sectionTheme}><ActionRow title="Membership possibilities" body="See potential ways to support SubTrack without selling personal data." onPress={() => router.push("/monetization" as never)} /></Section>
    <Section title="Your data" theme={sectionTheme}><ActionRow title="Export local data" body="Share a JSON backup of your saved records." onPress={exportData} /><Divider /><ActionRow title="Export renewal calendar" body="Share active renewals with expected charge, billing source, and local notes." onPress={() => void exportCalendar()} /><Divider /><ActionRow title="Report catalog information" body="Keep a local correction draft with an official source link." onPress={() => router.push("/catalog-correction" as never)} /><Divider /><ActionRow danger title="Reset local data" body="Remove records stored on this device." onPress={reset} /></Section>
    <View style={styles.footer}><Text style={styles.footerText}>SubTrack guides you to official management pages. It does not access, change, or cancel a provider account.</Text><Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/discover")} style={({ pressed }) => pressed && styles.pressed}><Text style={styles.footerLink}>Browse services</Text></Pressable></View>
  </ScrollView></ScreenContainer>;
}

function Section({ title, theme, children }: { title: string; theme: { section: { color: string } }; children: React.ReactNode }) { return <><Text style={[styles.section, theme.section]}>{title}</Text><View style={styles.group}>{children}</View></>; }
function Divider() { return <View style={styles.divider} />; }
function ActionRow({ title, body, onPress, danger = false }: { title: string; body: string; onPress: () => void; danger?: boolean }) { return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}><View style={styles.rowCopy}><Text style={danger ? styles.deleteTitle : styles.rowTitle}>{title}</Text><Text style={styles.rowBody}>{body}</Text></View><Text style={danger ? styles.deleteChevron : styles.chevron}>›</Text></Pressable>; }

const styles = StyleSheet.create({ content: { paddingBottom: 32, paddingTop: 16 }, flex: { flex: 1 }, privacy: { alignItems: "flex-start", backgroundColor: "#202713", borderRadius: 14, flexDirection: "row", gap: 11, marginTop: 20, padding: 15 }, privacyMark: { alignItems: "center", backgroundColor: "#C9F72D", borderRadius: 12, height: 24, justifyContent: "center", width: 24 }, privacyTitle: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 13 }, privacyBody: { color: "#A8AD98", fontFamily: type.regular, fontSize: 11, lineHeight: 16, marginTop: 3 }, section: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 16, marginBottom: 9, marginTop: 24 }, group: { backgroundColor: "#191E0F", borderColor: "#343A25", borderRadius: 14, borderWidth: 1, overflow: "hidden" }, row: { alignItems: "center", flexDirection: "row", gap: 10, minHeight: 74, padding: 15 }, rowCopy: { flex: 1 }, rowTitle: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 13 }, rowBody: { color: "#A8AD98", fontFamily: type.regular, fontSize: 11, lineHeight: 16, marginTop: 3 }, deliveryCard: { backgroundColor: "#202713", borderColor: "#485632", borderRadius: 11, borderWidth: 1, marginHorizontal: 15, marginBottom: 14, padding: 12 }, deliveryTitle: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 12 }, deliveryBody: { color: "#C9D0B8", fontFamily: type.regular, fontSize: 10, lineHeight: 15, marginTop: 4 }, deliveryStatus: { color: "#C9F72D", fontFamily: type.semi, fontSize: 10, lineHeight: 15, marginTop: 7 }, deliveryAction: { alignSelf: "flex-start", justifyContent: "center", marginTop: 8, minHeight: 32 }, deliveryActionText: { color: "#C9F72D", fontFamily: type.semi, fontSize: 11 }, budgetBox: { alignItems: "center", backgroundColor: "#12160B", borderColor: "#3A4227", borderRadius: 10, borderWidth: 1, flexDirection: "row", paddingHorizontal: 9, width: 78 }, budgetPrefix: { color: "#A8AD98", fontFamily: type.semi, fontSize: 13 }, budgetInput: { color: "#F4F2E8", flex: 1, fontFamily: type.semi, fontSize: 13, height: 36, minWidth: 0, paddingLeft: 3 }, divider: { backgroundColor: "#343A25", height: 1, marginLeft: 15 }, stepper: { backgroundColor: "#12160B", borderColor: "#343A25", borderRadius: 10, borderWidth: 1, flexDirection: "row", padding: 3 }, step: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 6 }, stepSelected: { backgroundColor: "#C9F72D" }, stepText: { color: "#A8AD98", fontFamily: type.semi, fontSize: 10 }, stepTextSelected: { color: "#172108" }, actionRow: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between", minHeight: 75, padding: 15 }, chevron: { color: "#C9F72D", fontFamily: type.regular, fontSize: 25 }, deleteTitle: { color: "#FF9B8C", fontFamily: type.semi, fontSize: 13 }, deleteChevron: { color: "#FF9B8C", fontFamily: type.regular, fontSize: 25 }, footer: { alignItems: "center", paddingHorizontal: 20, paddingTop: 24 }, footerText: { color: "#89917A", fontFamily: type.regular, fontSize: 10, lineHeight: 15, textAlign: "center" }, footerLink: { color: "#C9F72D", fontFamily: type.semi, fontSize: 12, marginTop: 11 }, pressed: { opacity: 0.75 } });
const electric = { light: StyleSheet.create({ section: { color: "#293015" } }), dark: StyleSheet.create({ section: { color: "#F4F2E8" } }) };
const revamp = StyleSheet.create({ privacy: { borderColor: "#485632", borderWidth: 1 }, privacyMark: { backgroundColor: "#C9F72D" }, privacyMarkText: { color: "#172108", fontFamily: type.bold, fontSize: 12 }, privacyTitle: { color: "#F4F2E8" }, privacyBody: { color: "#A8AD98" } });
