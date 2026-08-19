import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useCloudSync } from "@/lib/cloud-sync";

const type = { regular: "Poppins-Regular", semi: "Poppins-SemiBold", bold: "Poppins-Bold" };

function formatTimestamp(value?: string) {
  if (!value) return "Not yet synced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not yet synced";
  return date.toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export default function CloudSyncScreen() {
  const { isConfigured, isLoading, userEmail, lastSyncAt, signIn, signOut, signUp, syncNow, restoreFromCloud } = useCloudSync();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (operation: () => Promise<void>) => {
    try {
      setBusy(true);
      await operation();
    } catch (error) {
      Alert.alert("Cloud sync", error instanceof Error ? error.message : "The action could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleSignIn = () => {
    if (!email.trim() || !password) {
      Alert.alert("Enter your details", "Add your email and password to sign in.");
      return;
    }
    void run(() => signIn(email, password));
  };

  const handleSignUp = () => {
    if (!email.trim() || password.length < 8) {
      Alert.alert("Choose a stronger password", "Enter your email and a password with at least 8 characters.");
      return;
    }
    void run(async () => {
      const requiresConfirmation = await signUp(email, password);
      setPassword("");
      Alert.alert(
        "Account created",
        requiresConfirmation ? "Check your inbox to confirm your email, then return and sign in." : "Your cloud-sync account is ready.",
      );
    });
  };

  const handleRestore = () => {
    Alert.alert(
      "Replace this device’s data?",
      "This downloads your latest cloud snapshot and replaces local subscriptions, household members, and settings on this device. Provider accounts are not affected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore backup",
          style: "destructive",
          onPress: () => void run(async () => {
            const restored = await restoreFromCloud();
            Alert.alert("Cloud sync", restored ? "Your cloud snapshot is now on this device." : "No cloud backup is available for this account yet.");
          }),
        },
      ],
    );
  };

  if (!isConfigured) {
    return <ScreenContainer className="px-5" containerClassName="bg-background"><View style={styles.center}><Text style={styles.title}>Cloud sync is unavailable</Text><Text style={styles.body}>This build does not yet include its public Supabase project configuration.</Text><Pressable onPress={() => router.back()} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}><Text style={styles.secondaryButtonText}>Back to Settings</Text></Pressable></View></ScreenContainer>;
  }

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Text style={styles.backText}>‹  Settings</Text></Pressable>
        <Text style={styles.eyebrow}>OPTIONAL CLOUD BACKUP</Text>
        <Text style={styles.title}>Keep your control where it belongs.</Text>
        <Text style={styles.body}>Sync the subscription records and household roster you choose to save. SubTrack never connects to your bank, inbox, or provider accounts.</Text>

        <View style={styles.privacyCard}>
          <View style={styles.privacyMark}><Text style={styles.privacyMarkText}>✓</Text></View>
          <View style={styles.privacyCopy}><Text style={styles.privacyTitle}>Your cloud snapshot stays private</Text><Text style={styles.privacyBody}>Only your signed-in account can read or replace its snapshot. This feature opens no provider management flow and makes no changes outside SubTrack.</Text></View>
        </View>

        {isLoading ? <View style={styles.loading}><ActivityIndicator color="#C9F72D" /><Text style={styles.loadingText}>Checking cloud sync…</Text></View> : userEmail ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>SIGNED IN</Text>
            <Text style={styles.accountEmail}>{userEmail}</Text>
            <Text style={styles.cardBody}>Last successful sync: {formatTimestamp(lastSyncAt)}.</Text>
            <Pressable disabled={busy} onPress={() => void run(syncNow)} style={({ pressed }) => [styles.primaryButton, (pressed || busy) && styles.pressed, busy && styles.disabled]}><Text style={styles.primaryButtonText}>{busy ? "Working…" : "Sync this device now"}</Text></Pressable>
            <Pressable disabled={busy} onPress={handleRestore} style={({ pressed }) => [styles.secondaryButton, (pressed || busy) && styles.pressed, busy && styles.disabled]}><Text style={styles.secondaryButtonText}>Restore cloud backup</Text></Pressable>
            <Pressable disabled={busy} onPress={() => void run(signOut)} style={({ pressed }) => [styles.textButton, (pressed || busy) && styles.pressed]}><Text style={styles.textButtonText}>Sign out of cloud sync</Text></Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>SIGN IN TO SYNC</Text>
            <Text style={styles.cardBody}>Use an email and password only for your optional SubTrack cloud account. Your device keeps its own local copy.</Text>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput autoCapitalize="none" autoComplete="email" autoCorrect={false} keyboardType="email-address" onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#78806C" style={styles.input} value={email} />
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput autoCapitalize="none" autoComplete="password" onChangeText={setPassword} placeholder="At least 8 characters" placeholderTextColor="#78806C" secureTextEntry style={styles.input} value={password} />
            <Pressable disabled={busy} onPress={handleSignIn} style={({ pressed }) => [styles.primaryButton, (pressed || busy) && styles.pressed, busy && styles.disabled]}><Text style={styles.primaryButtonText}>{busy ? "Working…" : "Sign in"}</Text></Pressable>
            <Pressable disabled={busy} onPress={handleSignUp} style={({ pressed }) => [styles.secondaryButton, (pressed || busy) && styles.pressed, busy && styles.disabled]}><Text style={styles.secondaryButtonText}>Create a cloud account</Text></Pressable>
          </View>
        )}

        <Text style={styles.footnote}>Cloud sync is optional. Local reminders remain on this device, and opening an official provider management page never gives SubTrack control over your provider account.</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 36, paddingTop: 18 },
  back: { alignSelf: "flex-start", marginBottom: 24, paddingVertical: 6 },
  backText: { color: "#C9F72D", fontFamily: type.semi, fontSize: 12 },
  eyebrow: { color: "#C9F72D", fontFamily: type.semi, fontSize: 10, letterSpacing: 1.3 },
  title: { color: "#F4F2E8", fontFamily: type.bold, fontSize: 29, letterSpacing: -1.1, lineHeight: 36, marginTop: 8, maxWidth: 330 },
  body: { color: "#A8AD98", fontFamily: type.regular, fontSize: 13, lineHeight: 20, marginTop: 11, maxWidth: 360 },
  privacyCard: { alignItems: "flex-start", backgroundColor: "#202713", borderColor: "#485632", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 11, marginTop: 22, padding: 15 },
  privacyMark: { alignItems: "center", backgroundColor: "#C9F72D", borderRadius: 12, height: 24, justifyContent: "center", width: 24 },
  privacyMarkText: { color: "#172108", fontFamily: type.bold, fontSize: 12 },
  privacyCopy: { flex: 1 },
  privacyTitle: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 13 },
  privacyBody: { color: "#A8AD98", fontFamily: type.regular, fontSize: 11, lineHeight: 16, marginTop: 4 },
  loading: { alignItems: "center", gap: 10, paddingTop: 50 },
  loadingText: { color: "#A8AD98", fontFamily: type.regular, fontSize: 12 },
  card: { backgroundColor: "#191E0F", borderColor: "#343A25", borderRadius: 16, borderWidth: 1, marginTop: 18, padding: 16 },
  cardLabel: { color: "#C9F72D", fontFamily: type.semi, fontSize: 10, letterSpacing: 1.1 },
  accountEmail: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 15, marginTop: 8 },
  cardBody: { color: "#A8AD98", fontFamily: type.regular, fontSize: 12, lineHeight: 18, marginTop: 7 },
  inputLabel: { color: "#D7DBC9", fontFamily: type.semi, fontSize: 11, marginTop: 16 },
  input: { backgroundColor: "#12160B", borderColor: "#3A4227", borderRadius: 10, borderWidth: 1, color: "#F4F2E8", fontFamily: type.regular, fontSize: 13, height: 46, marginTop: 7, paddingHorizontal: 12 },
  primaryButton: { alignItems: "center", backgroundColor: "#C9F72D", borderRadius: 11, justifyContent: "center", marginTop: 20, minHeight: 48, paddingHorizontal: 16 },
  primaryButtonText: { color: "#172108", fontFamily: type.bold, fontSize: 13 },
  secondaryButton: { alignItems: "center", borderColor: "#536238", borderRadius: 11, borderWidth: 1, justifyContent: "center", marginTop: 10, minHeight: 47, paddingHorizontal: 16 },
  secondaryButtonText: { color: "#E4E8D6", fontFamily: type.semi, fontSize: 13 },
  textButton: { alignItems: "center", marginTop: 16, minHeight: 28 },
  textButtonText: { color: "#FF9B8C", fontFamily: type.semi, fontSize: 12 },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.74 },
  footnote: { color: "#89917A", fontFamily: type.regular, fontSize: 10, lineHeight: 15, marginHorizontal: 12, marginTop: 22, textAlign: "center" },
  center: { alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: 28 },
});
