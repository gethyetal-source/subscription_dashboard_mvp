import { router } from "expo-router";
import { useState } from "react";
import { Button, Card, Copy, Field, Notice, Page } from "@/components/app-ui";
import { useAccount } from "@/lib/account";

export default function PasswordResetScreen() {
  const account = useAccount();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const submit = async () => {
    if (busy) return;
    setBusy(true); setMessage(""); setFailed(false);
    try {
      if (password !== confirmation) throw new Error("The two passwords must match.");
      await account.updatePassword(password);
      setPassword(""); setConfirmation("");
      setMessage("Your password is updated.");
    } catch (error) {
      setFailed(true); setMessage(error instanceof Error ? error.message : "Your password could not be updated. Please try again.");
    } finally { setBusy(false); }
  };
  return <Page title="Choose a new password">
    {account.isLoading || account.isCompletingCallback ? <Copy>Checking your recovery link…</Copy> : !account.isSignedIn ? <Card title="A sign-in or recovery link is needed">
      <Copy muted>{account.authCallbackMessage || "Open the newest reset link in the same browser or device where you requested it, or sign in to change your password."}</Copy>
      <Button label="Back to sign in" onPress={() => router.replace("/login")} />
    </Card> : <Card>
      <Copy muted>Use at least 8 characters. Your password is handled by Supabase Authentication, not saved in your subscription records.</Copy>
      <Field label="New password" value={password} onChangeText={setPassword} autoComplete="new-password" autoCapitalize="none" autoCorrect={false} secureTextEntry editable={!busy} />
      <Field label="Confirm new password" value={confirmation} onChangeText={setConfirmation} autoComplete="new-password" autoCapitalize="none" autoCorrect={false} secureTextEntry editable={!busy} />
      {message ? <Notice error={failed}>{message}</Notice> : null}
      <Button label={busy ? "Updating…" : "Update password"} disabled={busy} onPress={() => void submit()} />
      {message && !failed ? <Button label="Continue" onPress={() => router.replace("/(tabs)/profile")} /> : null}
      {!account.recoveryRequired ? <Button label="Back to profile" secondary disabled={busy} onPress={() => router.replace("/(tabs)/profile")} /> : null}
    </Card>}
  </Page>;
}
