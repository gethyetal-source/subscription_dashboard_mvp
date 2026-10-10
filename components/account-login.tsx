import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Button, Card, Copy, Field, Notice } from "./app-ui";
import { BrandMark } from "./brand-mark";
import { ScreenContainer } from "./screen-container";
import { financeType } from "./finance-ui";
import { useAccount } from "@/lib/account";
import { usePalette } from "@/lib/ui-theme";

export function AccountLogin() {
  const account = useAccount();
  const colors = usePalette();
  const [mode, setMode] = useState<"sign-in" | "sign-up" | "recovery">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => { if (account.verificationPendingEmail) setEmail(account.verificationPendingEmail); }, [account.verificationPendingEmail]);
  const run = async (operation: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true); setMessage(""); setFailed(false);
    account.clearAuthCallbackMessage();
    try { await operation(); }
    catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : "Sign-in could not be completed. Please try again."); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const changeMode = (next: typeof mode) => { setMode(next); setPassword(""); setMessage(""); setFailed(false); };
  const submit = () => void run(async () => {
    if (mode === "recovery") {
      await account.requestPasswordReset(email);
      setMessage("If this email has an account, a reset link is on its way. Open the newest link in this browser or on this device.");
    } else if (mode === "sign-up") {
      await account.signUp(email, password, name);
      setPassword("");
    } else {
      await account.signIn(email, password);
      setPassword("");
    }
  });

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: "center" }}>
        <View style={{ width: "100%", maxWidth: 420, alignSelf: "center", gap: 20 }}>
          <View style={{ gap: 12 }}>
            <BrandMark size={58} />
            <Text style={{ color: colors.primary, fontFamily: financeType.semi, fontSize: 12 }}>SUBTRACK</Text>
            <Text accessibilityRole="header" style={{ color: colors.foreground, fontFamily: financeType.bold, fontSize: 30, lineHeight: 39, letterSpacing: -0.8 }}>
              {mode === "sign-up" ? "A little less spending.\nA lot more control." : mode === "recovery" ? "Let’s get you back in." : "Welcome to your\nprivate space."}
            </Text>
            <Copy muted>Sign in once. Stay signed in until you log out. Your subscription records stay on this device, not in Supabase.</Copy>
          </View>
          {!account.isConfigured ? <Card title="Sign-in is not available yet">
            <Copy muted>This version needs account setup before you can sign in. Existing local records have not been erased.</Copy>
          </Card> : account.isLoading || account.isCompletingCallback ? <View style={{ alignItems: "center", padding: 24, gap: 10 }}>
            <ActivityIndicator color={colors.primary} /><Copy muted>Opening your saved session…</Copy>
          </View> : account.initializationError ? <Card title="Your session needs a retry">
            <Notice error>{account.initializationError}</Notice>
            <Button label="Retry saved session" disabled={busy} onPress={() => void run(account.retrySession)} />
          </Card> : account.verificationPendingEmail ? <Card title="Check your inbox">
            <Copy>{account.verificationPendingEmail}</Copy>
            <Copy muted>Open the newest verification link on the device or in the browser where you signed up. If you confirmed it elsewhere, return here and sign in with your password.</Copy>
            <Button label={busy ? "Sending…" : "Resend verification email"} disabled={busy} onPress={() => void run(async () => {
              await account.resendVerification(); setMessage("A fresh verification link is on its way. Check your inbox and spam folder.");
            })} />
            <Button label="I verified my email, sign in" secondary disabled={busy} onPress={() => void run(async () => {
              await account.clearVerificationPending(); changeMode("sign-in");
            })} />
            <Button label="Use a different email or Google" secondary disabled={busy} onPress={() => void run(account.clearVerificationPending)} />
          </Card> : <Card>
            {mode !== "recovery" ? <>
              <Button label={busy ? "Working…" : "Continue with Google"} secondary disabled={busy} onPress={() => void run(account.signInWithGoogle)} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View style={{ backgroundColor: colors.border, height: 1, flex: 1 }} /><Copy muted>or use email</Copy><View style={{ backgroundColor: colors.border, height: 1, flex: 1 }} />
              </View>
            </> : null}
            {mode === "sign-up" ? <Field label="Display name (optional)" value={name} onChangeText={setName} autoComplete="name" autoCapitalize="words" maxLength={120} editable={!busy} /> : null}
            <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" autoCorrect={false} placeholder="you@example.com" editable={!busy} />
            {mode !== "recovery" ? <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} placeholder={mode === "sign-up" ? "At least 8 characters" : "Your password"} editable={!busy} onSubmitEditing={submit} /> : null}
            <Button label={busy ? "Working…" : mode === "sign-up" ? "Create account" : mode === "recovery" ? "Send reset link" : "Sign in"} disabled={busy} onPress={submit} />
            {mode === "sign-in" ? <>
              <Button label="Create an account" secondary disabled={busy} onPress={() => changeMode("sign-up")} />
              <Button label="Forgot your password?" secondary disabled={busy} onPress={() => changeMode("recovery")} />
            </> : <Button label="Back to sign in" secondary disabled={busy} onPress={() => changeMode("sign-in")} />}
          </Card>}
          {message || account.authCallbackMessage ? <Notice error={failed || !!account.authCallbackMessage}>{message || account.authCallbackMessage}</Notice> : null}
          <Copy muted>Supabase stores your account details only. No subscription uploads, cloud backup, or cross-device plan sharing.</Copy>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 18 }}>
            {([["Privacy policy", "/privacy-policy"], ["Account deletion", "/delete-account"]] as const).map(([label, path]) =>
              <Pressable key={path} accessibilityRole="button" accessibilityLabel={label} onPress={() => router.push(path)} style={{ minHeight: 44, justifyContent: "center" }}>
                <Text style={{ color: colors.primary, fontFamily: financeType.medium, fontSize: 12 }}>{label}</Text>
              </Pressable>)}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </ScreenContainer>;
}
