import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useCloudSync } from "@/lib/cloud-sync";

const type = { regular: "Poppins-Regular", semi: "Poppins-SemiBold", bold: "Poppins-Bold" };

export default function PasswordResetScreen() {
  const { updatePassword } = useCloudSync();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (password.length < 8 || password !== confirmPassword) {
      Alert.alert("Check your password", "Use at least 8 characters and make sure both fields match.");
      return;
    }
    try {
      setBusy(true);
      await updatePassword(password);
      Alert.alert("Password updated", "You can now sign in with your new password.", [{ text: "Continue", onPress: () => router.replace("/cloud-sync" as never) }]);
    } catch (error) {
      Alert.alert("Password reset", error instanceof Error ? error.message : "The reset link may have expired. Request a new one from Cloud sync.");
    } finally {
      setBusy(false);
    }
  };
  return <ScreenContainer className="px-5" containerClassName="bg-background"><View style={styles.container}><Text style={styles.eyebrow}>PASSWORD RECOVERY</Text><Text style={styles.title}>Choose a new password.</Text><Text style={styles.body}>Use the recovery link in your email to reach this screen, then choose a new password for your SubTrack cloud account.</Text><Text style={styles.label}>New password</Text><TextInput autoCapitalize="none" autoComplete="new-password" onChangeText={setPassword} placeholder="At least 8 characters" placeholderTextColor="#78806C" secureTextEntry style={styles.input} value={password} /><Text style={styles.label}>Confirm new password</Text><TextInput autoCapitalize="none" autoComplete="new-password" onChangeText={setConfirmPassword} placeholder="Repeat your new password" placeholderTextColor="#78806C" secureTextEntry style={styles.input} value={confirmPassword} /><Pressable disabled={busy} onPress={() => void submit()} style={({ pressed }) => [styles.button, (pressed || busy) && styles.pressed]}><Text style={styles.buttonText}>{busy ? "Updating…" : "Update password"}</Text></Pressable><Pressable onPress={() => router.replace("/cloud-sync" as never)} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Text style={styles.backText}>Back to cloud sync</Text></Pressable></View></ScreenContainer>;
}

const styles = StyleSheet.create({ container: { flex: 1, justifyContent: "center" }, eyebrow: { color: "#C9F72D", fontFamily: type.semi, fontSize: 10, letterSpacing: 1.2 }, title: { color: "#F4F2E8", fontFamily: type.bold, fontSize: 29, letterSpacing: -1, marginTop: 8 }, body: { color: "#A8AD98", fontFamily: type.regular, fontSize: 13, lineHeight: 20, marginTop: 10 }, label: { color: "#D7DBC9", fontFamily: type.semi, fontSize: 11, marginTop: 20 }, input: { backgroundColor: "#191E0F", borderColor: "#343A25", borderRadius: 10, borderWidth: 1, color: "#F4F2E8", fontFamily: type.regular, fontSize: 13, height: 48, marginTop: 7, paddingHorizontal: 12 }, button: { alignItems: "center", backgroundColor: "#C9F72D", borderRadius: 11, justifyContent: "center", marginTop: 24, minHeight: 48 }, buttonText: { color: "#172108", fontFamily: type.bold, fontSize: 13 }, back: { alignItems: "center", marginTop: 18 }, backText: { color: "#C9F72D", fontFamily: type.semi, fontSize: 12 }, pressed: { opacity: 0.7 } });
