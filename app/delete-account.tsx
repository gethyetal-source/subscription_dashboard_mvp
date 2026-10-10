import { router } from "expo-router";
import { useState } from "react";
import { Button, Card, ConfirmDialog, Copy, Notice, Page } from "@/components/app-ui";
import { useAccount } from "@/lib/account";

export default function DeleteAccountScreen() {
  const account = useAccount();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const remove = async () => {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      await account.deleteAccount();
      setConfirm(false);
      router.replace("/login");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Your account could not be deleted. Please try again.");
    } finally { setBusy(false); }
  };
  return <Page title="Account deletion">
    {message ? <Notice error>{message}</Notice> : null}
    {account.isLoading ? <Copy>Checking your account…</Copy> : !account.isSignedIn ? <Card title="Sign in to delete your account">
      <Copy muted>This is SubTrack’s public account-deletion page. Sign in to the Google or email account you want to remove, then return here to confirm.</Copy>
      <Button label="Sign in" onPress={() => router.push("/login")} />
    </Card> : <Card title="Permanently delete your account">
      <Copy>{account.userEmail}</Copy>
      <Copy muted>This removes your Supabase sign-in and profile. It does not delete your Google account or cancel subscriptions with providers.</Copy>
      <Copy muted>Your subscription data is not uploaded. Local copies are kept, but a newly created account cannot open the deleted account’s records. Export a local backup first if you want to keep using them.</Copy>
      {account.canAccessApp ? <Button label="Export a local backup first" secondary disabled={busy} onPress={() => router.push("/backup")} /> : null}
      <Button label={busy ? "Deleting…" : "Delete account"} danger disabled={busy} onPress={() => setConfirm(true)} />
    </Card>}
    <Button label="Privacy policy" secondary onPress={() => router.push("/privacy-policy")} />
    <ConfirmDialog visible={confirm} title="Permanently delete this account?" message="This cannot be undone. Your Google account and provider subscriptions are not affected. Export a local backup first; a recreated account will have a new, separate set of local records." confirmLabel="Delete account" danger busy={busy} onCancel={() => setConfirm(false)} onConfirm={() => void remove()} />
  </Page>;
}
