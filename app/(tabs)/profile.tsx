import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Button, Card, ConfirmDialog, Copy, Field, Notice, Page } from "@/components/app-ui";
import { useAccount } from "@/lib/account";

export default function ProfileScreen() {
  const account = useAccount();
  const [name, setName] = useState(account.profileName ?? "");
  const [email, setEmail] = useState(account.userEmail ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  useEffect(() => setName(account.profileName ?? ""), [account.profileName]);
  useEffect(() => setEmail(account.userEmail ?? ""), [account.userEmail]);
  const run = async (operation: () => Promise<void>, success?: string) => {
    if (busy) return;
    setBusy(true); setMessage(""); setFailed(false);
    try { await operation(); if (success) setMessage(success); }
    catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : "Your account could not be updated. Please try again."); }
    finally { setBusy(false); }
  };
  return <Page title="Your account">
    {message ? <Notice error={failed}>{message}</Notice> : null}
    <Card title={account.profileName || "Welcome to SubTrack"}>
      <Copy>{account.userEmail}</Copy>
      <Copy muted>{account.providers.includes("google") ? "Google is connected to this account." : "Signed in with email."} Your login is remembered on this device.</Copy>
    </Card>
    <Card title="Profile">
      <Field label="Display name" value={name} onChangeText={setName} autoComplete="name" autoCapitalize="words" maxLength={120} editable={!busy} />
      <Copy muted>Only account details, such as this name and your sign-in email, are stored in Supabase.</Copy>
      <Button label={busy ? "Saving…" : "Save profile"} disabled={busy} onPress={() => void run(() => account.updateProfile(name), "Profile saved.")} />
    </Card>
    <Card title="Sign-in details">
      <Field label="Sign-in email" value={email} onChangeText={setEmail} autoComplete="email" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} editable={!busy} />
      <Copy muted>Confirm the newest link we send before using your new email. Google sign-in continues to use the account selected with Google.</Copy>
      <Button label="Change sign-in email" secondary disabled={busy} onPress={() => void run(() => account.updateEmail(email), "Check your inbox for the email-change confirmation.")} />
      {account.pendingEmailChange ? <>
        <Copy muted>Confirmation is waiting for {account.pendingEmailChange}.</Copy>
        <Button label="Resend email confirmation" secondary disabled={busy} onPress={() => void run(account.resendEmailChange, "Confirmation email resent.")} />
      </> : null}
      <Button label={account.providers.includes("email") ? "Change password" : "Set a password"} secondary disabled={busy} onPress={() => router.push("/password-reset")} />
    </Card>
    <Card title="Your data stays here">
      <Copy muted>Subscription prices, renewals, notes, savings, household plans, and backups stay on this device. They are not uploaded or shared across devices.</Copy>
      <Copy muted>Each account has its own local records. Logging out hides them but does not erase them. Log back into the same account on this device to use them again.</Copy>
      <Button label="Local backup & restore" secondary disabled={busy} onPress={() => router.push("/backup")} />
      <Button label="Privacy policy" secondary onPress={() => router.push("/privacy-policy")} />
    </Card>
    <Button label="Log out" secondary disabled={busy} onPress={() => setLogoutVisible(true)} />
    <Button label="Delete account" danger disabled={busy} onPress={() => router.push("/delete-account")} />
    <ConfirmDialog visible={logoutVisible} title="Log out of SubTrack?" message="You will need to sign in again. Your records stay on this device, hidden until the same account signs in. Renewal reminders and the widget pause while logged out." confirmLabel="Log out" danger busy={busy} onCancel={() => setLogoutVisible(false)} onConfirm={() => void run(async () => {
      await account.signOut(); setLogoutVisible(false);
    })} />
  </Page>;
}
