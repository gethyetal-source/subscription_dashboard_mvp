import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useCloudSync } from "@/lib/cloud-sync";
import { useThemeContext } from "@/lib/theme-provider";

const type = { regular: "Poppins-Regular", semi: "Poppins-SemiBold", bold: "Poppins-Bold" };

function initials(name?: string, email?: string) {
  const source = (name?.trim() || email?.trim() || "S").split(/\s+/);
  return source.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export default function ProfileScreen() {
  const { colorScheme } = useThemeContext();
  const styles = useMemo(() => makeStyles(colorScheme === "dark"), [colorScheme]);
  const { isConfigured, isLoading, userEmail, profileName, needsProfileSetup, updateProfile, signOut } = useCloudSync();
  const [name, setName] = useState(profileName ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => setName(profileName ?? ""), [profileName]);

  const saveProfile = async () => {
    try {
      setBusy(true);
      await updateProfile(name);
      Alert.alert("Profile saved", "Your display name is updated for this SubTrack cloud account.");
    } catch (error) {
      Alert.alert("Profile", error instanceof Error ? error.message : "We could not save your profile. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert("Sign out of cloud sync?", "Your local subscriptions stay on this device. You can sign in again whenever you need cloud backup.", [
      { text: "Keep signed in", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() },
    ]);
  };

  if (isLoading) return <ScreenContainer containerClassName="bg-background"><View style={styles.center}><ActivityIndicator color={styles.loader.color as string} /><Text style={styles.loadingText}>Checking your account…</Text></View></ScreenContainer>;

  if (!isConfigured || !userEmail) {
    return <ScreenContainer className="px-5" containerClassName="bg-background"><View style={styles.guestWrap}>
      <View style={styles.avatar}><Text style={styles.avatarText}>S</Text></View>
      <Text style={styles.title}>Your profile</Text>
      <Text style={styles.body}>{isConfigured ? "Create or sign in to an optional cloud account to save a profile name, back up this device, and keep your records available when you choose to restore them." : "Cloud profiles are unavailable in this build because cloud sync has not been configured yet."}</Text>
      {isConfigured ? <Pressable onPress={() => router.push("/cloud-sync" as never)} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}><Text style={styles.primaryButtonText}>Create or sign in</Text></Pressable> : null}
    </View></ScreenContainer>;
  }

  return <ScreenContainer className="px-5" containerClassName="bg-background"><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
    <View style={styles.hero}><View style={styles.avatar}><Text style={styles.avatarText}>{initials(profileName, userEmail)}</Text></View><View style={styles.heroCopy}><Text style={styles.title}>{profileName || "Finish your profile"}</Text><Text style={styles.email}>{userEmail}</Text></View></View>
    <View style={styles.card}>
      <Text style={styles.cardLabel}>PROFILE DETAILS</Text>
      <Text style={styles.label}>Display name</Text>
      <TextInput autoCapitalize="words" autoComplete="name" onChangeText={setName} placeholder="How should SubTrack address you?" placeholderTextColor={styles.placeholder.color as string} style={styles.input} value={name} />
      {needsProfileSetup ? <Text style={styles.helper}>Add a name to finish setting up this cloud profile.</Text> : <Text style={styles.helper}>This name appears only in your SubTrack profile on signed-in devices.</Text>}
      <Pressable disabled={busy} onPress={() => void saveProfile()} style={({ pressed }) => [styles.primaryButton, (pressed || busy) && styles.pressed, busy && styles.disabled]}><Text style={styles.primaryButtonText}>{busy ? "Saving…" : "Save profile"}</Text></Pressable>
    </View>
    <View style={styles.card}>
      <Text style={styles.cardLabel}>CLOUD ACCOUNT</Text>
      <Text style={styles.detailTitle}>Email address</Text><Text style={styles.detailBody}>{userEmail}</Text>
      <Text style={styles.detailTitle}>Password and backup</Text><Text style={styles.detailBody}>Manage password recovery, sync, and restore options from Cloud sync.</Text>
      <Pressable onPress={() => router.push("/cloud-sync" as never)} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}><Text style={styles.secondaryButtonText}>Manage cloud sync</Text></Pressable>
    </View>
    <Pressable onPress={confirmSignOut} style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}><Text style={styles.signOutText}>Sign out of cloud sync</Text></Pressable>
  </ScrollView></ScreenContainer>;
}

function makeStyles(isDark: boolean) {
  const palette = isDark ? { canvas: "#12160B", surface: "#191E0F", text: "#F4F2E8", muted: "#A8AD98", border: "#343A25", accent: "#C9F72D", accentText: "#172108", danger: "#FF9B8C", placeholder: "#78806C" } : { canvas: "#F4F3EB", surface: "#FFFEF8", text: "#20241A", muted: "#65695B", border: "#D9D9CC", accent: "#4A6510", accentText: "#F4F3EB", danger: "#B53A33", placeholder: "#7B7F70" };
  return StyleSheet.create({
    content: { paddingBottom: 34, paddingTop: 22 },
    center: { alignItems: "center", flex: 1, justifyContent: "center" },
    guestWrap: { alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: 18 },
    eyebrow: { color: palette.accent, fontFamily: type.semi, fontSize: 10, letterSpacing: 1.25 },
    hero: { alignItems: "center", flexDirection: "row", gap: 14, marginTop: 13 },
    heroCopy: { flex: 1 },
    avatar: { alignItems: "center", backgroundColor: palette.accent, borderRadius: 32, height: 64, justifyContent: "center", width: 64 },
    avatarText: { color: palette.accentText, fontFamily: type.bold, fontSize: 21 },
    title: { color: palette.text, fontFamily: type.bold, fontSize: 25, letterSpacing: -0.7 },
    email: { color: palette.muted, fontFamily: type.regular, fontSize: 12, marginTop: 4 },
    body: { color: palette.muted, fontFamily: type.regular, fontSize: 13, lineHeight: 20, marginTop: 18, textAlign: "center" },
    card: { backgroundColor: palette.surface, borderColor: palette.border, borderRadius: 16, borderWidth: 1, marginTop: 22, padding: 16 },
    cardLabel: { color: palette.accent, fontFamily: type.semi, fontSize: 10, letterSpacing: 1.1 },
    label: { color: palette.text, fontFamily: type.semi, fontSize: 12, marginTop: 16 },
    input: { backgroundColor: palette.canvas, borderColor: palette.border, borderRadius: 11, borderWidth: 1, color: palette.text, fontFamily: type.regular, fontSize: 13, height: 48, marginTop: 7, paddingHorizontal: 12 },
    helper: { color: palette.muted, fontFamily: type.regular, fontSize: 10, lineHeight: 15, marginTop: 7 },
    detailTitle: { color: palette.text, fontFamily: type.semi, fontSize: 12, marginTop: 16 },
    detailBody: { color: palette.muted, fontFamily: type.regular, fontSize: 11, lineHeight: 16, marginTop: 4 },
    primaryButton: { alignItems: "center", backgroundColor: palette.accent, borderRadius: 11, justifyContent: "center", marginTop: 20, minHeight: 48, paddingHorizontal: 16 },
    primaryButtonText: { color: palette.accentText, fontFamily: type.bold, fontSize: 13 },
    secondaryButton: { alignItems: "center", borderColor: palette.border, borderRadius: 11, borderWidth: 1, justifyContent: "center", marginTop: 18, minHeight: 46, paddingHorizontal: 16 },
    secondaryButtonText: { color: palette.text, fontFamily: type.semi, fontSize: 12 },
    signOutButton: { alignItems: "center", marginTop: 22, minHeight: 40, justifyContent: "center" },
    signOutText: { color: palette.danger, fontFamily: type.semi, fontSize: 12 },
    loadingText: { color: palette.muted, fontFamily: type.regular, fontSize: 12, marginTop: 10 },
    loader: { color: palette.accent },
    placeholder: { color: palette.placeholder },
    pressed: { opacity: 0.74 },
    disabled: { opacity: 0.55 },
  });
}
