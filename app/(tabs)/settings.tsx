import { router } from "expo-router";
import { Alert, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from "react-native";

import { useSubscriptions } from "@/lib/subscription-store";
import { ScreenContainer } from "@/components/screen-container";

export default function SettingsScreen() {
  const { settings, subscriptions, updateSettings, resetLocalData } = useSubscriptions();
  const exportData = async () => {
    await Share.share({ title: "My SubTrack data", message: JSON.stringify({ subscriptions, settings, exportedAt: new Date().toISOString() }, null, 2) });
  };
  const confirmReset = () => Alert.alert("Reset local data?", "This removes all locally stored subscriptions and reminders from this device.", [
    { text: "Cancel", style: "cancel" }, { text: "Reset", style: "destructive", onPress: () => void resetLocalData() },
  ]);

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>PREFERENCES</Text><Text style={styles.title}>Settings</Text>
        <View style={styles.privacyCard}><Text style={styles.privacyTitle}>Local-first by design</Text><Text style={styles.privacyBody}>SubTrack stores your list on this device. It does not ask for bank access, email access, or provider passwords.</Text></View>
        <Text style={styles.section}>Reminders</Text>
        <View style={styles.group}>
          <View style={styles.row}><View style={styles.rowCopy}><Text style={styles.rowTitle}>Renewal reminders</Text><Text style={styles.rowBody}>Schedule local alerts for saved subscriptions.</Text></View><Switch value={settings.notificationsEnabled} onValueChange={(value) => void updateSettings({ notificationsEnabled: value })} trackColor={{ false: "#D5DEE7", true: "#7FD3C4" }} thumbColor={settings.notificationsEnabled ? "#0E9F8A" : "#FFFFFF"} /></View>
          <View style={styles.divider} />
          <View style={styles.row}><View style={styles.rowCopy}><Text style={styles.rowTitle}>Default reminder timing</Text><Text style={styles.rowBody}>Remind {settings.reminderDays} days before renewal.</Text></View><View style={styles.stepper}>{[1, 3, 7].map((days) => <Pressable key={days} onPress={() => void updateSettings({ reminderDays: days })} style={({ pressed }) => [styles.step, days === settings.reminderDays && styles.stepSelected, pressed && styles.pressed]}><Text style={[styles.stepText, days === settings.reminderDays && styles.stepTextSelected]}>{days}d</Text></Pressable>)}</View></View>
        </View>
        <Text style={styles.section}>Your data</Text>
        <View style={styles.group}>
          <Pressable onPress={exportData} style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}><View><Text style={styles.rowTitle}>Export local data</Text><Text style={styles.rowBody}>Share a JSON backup of your records.</Text></View><Text style={styles.chevron}>›</Text></Pressable>
          <View style={styles.divider} />
          <Pressable onPress={() => Alert.alert("Catalog feedback", "Please email feedback@subtrack.local with the service, plan, country, or link that needs correction.")} style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}><View><Text style={styles.rowTitle}>Report catalog information</Text><Text style={styles.rowBody}>Flag an incorrect plan, price, or official link.</Text></View><Text style={styles.chevron}>›</Text></Pressable>
          <View style={styles.divider} />
          <Pressable onPress={confirmReset} style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}><View><Text style={styles.deleteTitle}>Reset local data</Text><Text style={styles.rowBody}>Remove subscriptions from this device.</Text></View><Text style={styles.deleteChevron}>›</Text></Pressable>
        </View>
        <View style={styles.about}><Text style={styles.aboutTitle}>SubTrack MVP</Text><Text style={styles.aboutBody}>This app helps you organize subscriptions and open official management pages. It does not cancel a subscription on your behalf.</Text><Pressable onPress={() => router.push("/(tabs)/discover")}><Text style={styles.aboutLink}>Browse the catalog</Text></Pressable></View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 14, paddingBottom: 32 },
  eyebrow: { color: "#0E9F8A", fontSize: 11, fontWeight: "900", letterSpacing: 1.7 },
  title: { color: "#10253F", fontSize: 27, fontWeight: "800", letterSpacing: -0.8, marginTop: 4 },
  privacyCard: { backgroundColor: "#10253F", borderRadius: 20, padding: 18, marginTop: 18 },
  privacyTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  privacyBody: { color: "#C1D4E2", fontSize: 12, lineHeight: 18, marginTop: 6 },
  section: { color: "#10253F", fontSize: 15, fontWeight: "800", marginTop: 24, marginBottom: 10 },
  group: { backgroundColor: "#FFFFFF", borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "#E6ECF2" },
  row: { padding: 15, minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12 },
  rowCopy: { flex: 1 },
  rowTitle: { color: "#10253F", fontSize: 14, fontWeight: "800" },
  rowBody: { color: "#667085", fontSize: 12, lineHeight: 17, marginTop: 3 },
  divider: { height: 1, backgroundColor: "#EEF2F6", marginLeft: 15 },
  stepper: { flexDirection: "row", backgroundColor: "#EEF2F6", padding: 3, borderRadius: 11 },
  step: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 6 },
  stepSelected: { backgroundColor: "#FFFFFF" },
  stepText: { color: "#667085", fontSize: 11, fontWeight: "800" },
  stepTextSelected: { color: "#0E9F8A" },
  actionRow: { minHeight: 72, flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 15, gap: 12 },
  chevron: { color: "#98A3B3", fontSize: 28 },
  deleteTitle: { color: "#C34545", fontSize: 14, fontWeight: "800" },
  deleteChevron: { color: "#D45757", fontSize: 28 },
  about: { padding: 18, marginTop: 22, alignItems: "center" },
  aboutTitle: { color: "#667085", fontSize: 12, fontWeight: "800" },
  aboutBody: { color: "#98A3B3", fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: 5 },
  aboutLink: { color: "#0E9F8A", fontSize: 12, fontWeight: "800", marginTop: 12 },
  pressed: { opacity: 0.75 },
});
