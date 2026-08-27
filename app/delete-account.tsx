import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useCloudSync } from "@/lib/cloud-sync";

const type = { regular: "Poppins-Regular", semi: "Poppins-SemiBold", bold: "Poppins-Bold" };

export default function DeleteAccountScreen() {
  const { isConfigured, isLoading, userEmail, deleteCloudAccount } = useCloudSync();
  const [deleting, setDeleting] = useState(false);
  const deleteAccount = () => Alert.alert("Delete cloud account?", "This permanently deletes the optional SubTrack cloud account and its remote backup. Your subscriptions stored only on this device remain unless you choose Reset local data separately.", [
    { text: "Keep account", style: "cancel" },
    { text: "Delete account", style: "destructive", onPress: () => void confirmDeletion() },
  ]);
  const confirmDeletion = async () => {
    try {
      setDeleting(true);
      await deleteCloudAccount();
      Alert.alert("Cloud account deleted", "The optional remote account and its backup were removed. Local records on this device were kept.", [{ text: "Done", onPress: () => router.replace("/(tabs)/profile" as never) }]);
    } catch (error) {
      Alert.alert("Account deletion", error instanceof Error ? error.message : "We could not delete your cloud account. Please try again.");
    } finally { setDeleting(false); }
  };
  return <ScreenContainer className="px-5" containerClassName="bg-background" edges={["top", "bottom", "left", "right"]}><View style={styles.page}><View style={styles.nav}><Pressable accessibilityLabel="Go back" onPress={() => router.back()} hitSlop={10}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.navTitle}>Account deletion</Text><View style={styles.spacer} /></View>{isLoading ? <View style={styles.center}><ActivityIndicator color="#C9F72D" /><Text style={styles.body}>Checking your cloud account…</Text></View> : !isConfigured ? <View style={styles.card}><Text style={styles.title}>Cloud sync is not configured</Text><Text style={styles.body}>This build has no optional cloud account to delete. Local data stays on your device until you reset it.</Text></View> : !userEmail ? <View style={styles.card}><Text style={styles.title}>Sign in to delete a cloud account</Text><Text style={styles.body}>This public page is the account-deletion resource for SubTrack. Sign in to the optional cloud account you want to remove, then return here to confirm deletion.</Text><Pressable accessibilityRole="button" onPress={() => router.push("/cloud-sync" as never)} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}><Text style={styles.primaryText}>Open cloud sync</Text></Pressable></View> : <View style={styles.card}><Text style={styles.eyebrow}>SIGNED IN AS</Text><Text style={styles.email}>{userEmail}</Text><Text style={styles.title}>Permanently remove this cloud account</Text><Text style={styles.body}>Deletion removes your remote profile and the saved cloud-sync snapshot. It does not cancel provider subscriptions, contact providers, or delete subscriptions stored only on this device.</Text><View style={styles.notice}><Text style={styles.noticeTitle}>Before you continue</Text><Text style={styles.noticeBody}>Export local data if you want a copy. This account action cannot be undone.</Text></View><Pressable disabled={deleting} accessibilityRole="button" onPress={deleteAccount} style={({ pressed }) => [styles.delete, (pressed || deleting) && styles.pressed]}><Text style={styles.deleteText}>{deleting ? "Deleting cloud account…" : "Delete cloud account"}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/privacy-policy" as never)} style={({ pressed }) => pressed && styles.pressed}><Text style={styles.link}>Read privacy policy</Text></Pressable></View>}</View></ScreenContainer>;
}

const styles = StyleSheet.create({ page: { flex: 1, paddingTop: 10 }, nav: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, back: { color: "#F4F2E8", fontFamily: type.regular, fontSize: 34, lineHeight: 34 }, navTitle: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 13 }, spacer: { width: 24 }, center: { alignItems: "center", flex: 1, gap: 10, justifyContent: "center" }, card: { backgroundColor: "#191E0F", borderColor: "#343A25", borderRadius: 16, borderWidth: 1, marginTop: 28, padding: 18 }, eyebrow: { color: "#C9F72D", fontFamily: type.semi, fontSize: 9, letterSpacing: 1 }, email: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 13, marginTop: 5 }, title: { color: "#F4F2E8", fontFamily: type.bold, fontSize: 21, letterSpacing: -0.5, lineHeight: 27, marginTop: 16 }, body: { color: "#A8AD98", fontFamily: type.regular, fontSize: 11, lineHeight: 17, marginTop: 7 }, notice: { backgroundColor: "#2B2519", borderColor: "#755D31", borderRadius: 12, borderWidth: 1, marginTop: 17, padding: 12 }, noticeTitle: { color: "#FFCF9B", fontFamily: type.semi, fontSize: 11 }, noticeBody: { color: "#E1D8B5", fontFamily: type.regular, fontSize: 10, lineHeight: 15, marginTop: 4 }, primary: { alignItems: "center", backgroundColor: "#C9F72D", borderRadius: 11, justifyContent: "center", marginTop: 18, minHeight: 48 }, primaryText: { color: "#172108", fontFamily: type.semi, fontSize: 12 }, delete: { alignItems: "center", borderColor: "#DD776A", borderRadius: 11, borderWidth: 1, justifyContent: "center", marginTop: 18, minHeight: 48 }, deleteText: { color: "#FF9B8C", fontFamily: type.semi, fontSize: 12 }, link: { color: "#C9F72D", fontFamily: type.semi, fontSize: 11, marginTop: 17, textAlign: "center" }, pressed: { opacity: 0.72 } });
