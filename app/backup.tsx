import { useEffect, useState } from "react";
import { Button, Card, Copy, Field, Page } from "@/components/app-ui";
import { createBackup, describeDataError, parseBackup, type ValidatedSnapshot } from "@/lib/data-safety";
import { chooseTextFile, exportTextFile } from "@/lib/file-transfer";
import type { LocalBackup } from "@/lib/local-state-repository";
import { useSubscriptions } from "@/lib/subscription-store";

export default function BackupScreen() {
  const store = useSubscriptions();
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<ValidatedSnapshot>();
  const [backups, setBackups] = useState<LocalBackup[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const { getLocalBackups } = store;
  useEffect(() => { void getLocalBackups().then(setBackups).catch(() => setMessage("Local backups could not be read.")); }, [getLocalBackups]);
  const run = async (operation: () => Promise<void>) => {
    setBusy(true); setMessage("");
    try { await operation(); } catch (error) { setMessage(describeDataError(error)); } finally { setBusy(false); }
  };
  const inspect = (text: string) => { setPreview(undefined); setPreview(parseBackup(text)); };
  return <Page title="Backup & restore" subtitle="Files stay on this device unless you explicitly share them. Exports contain personal subscription information and are not encrypted.">
    {store.storageError ? <Card title="Storage recovery"><Copy>{store.storageError}</Copy></Card> : null}
    <Button label="Download JSON backup" disabled={busy || !store.isReady} onPress={() => void run(async () => {
      await exportTextFile(`subtrack-backup-${Date.now()}.json`, JSON.stringify(createBackup(store), null, 2), "application/json");
      setMessage("Backup export opened. Keep the file somewhere safe.");
    })} />
    <Card title="Import a backup">
      <Copy muted>Imports are validated before replacing any records. A snapshot of your current readable data is retained automatically.</Copy>
      <Button label="Choose JSON file" secondary disabled={busy} onPress={() => void run(async () => {
        setPreview(undefined);
        const text = await chooseTextFile(["application/json", "text/plain"]);
        if (text !== null) { setInput(text); inspect(text); }
      })} />
      <Field label="Or paste backup JSON" value={input} onChangeText={(text) => { setInput(text); setPreview(undefined); }} multiline maxLength={10_000_000} style={{ maxHeight: 180 }} />
      <Button label="Review pasted backup" secondary disabled={busy || !input.trim()} onPress={() => void run(async () => inspect(input))} />
    </Card>
    {preview ? <Card title="Confirm replacement">
      <Copy>{preview.subscriptions.length} subscriptions and {preview.householdMembers.length} household members will replace {store.subscriptions.length} subscriptions on this device.</Copy>
      <Copy muted>This does not cancel provider accounts. Device reminder IDs are removed and reminders are recreated.</Copy>
      <Button label="Replace local data with reviewed backup" disabled={busy} onPress={() => void run(async () => {
        await store.replaceLocalSnapshot(preview); setPreview(undefined); setInput("");
        setBackups(await store.getLocalBackups()); setMessage("Backup restored.");
      })} />
      <Button label="Cancel restore" secondary onPress={() => setPreview(undefined)} />
    </Card> : null}
    <Card title="Automatic local recovery snapshots">
      <Copy muted>The last five pre-change snapshots are kept on this device. They are not off-device backups.</Copy>
      {backups.length ? backups.map((backup, index) => <Button key={`${backup.exportedAt}-${index}`} secondary
        label={`Review ${backup.data.subscriptions.length} records · ${new Date(backup.exportedAt).toLocaleString()}`}
        onPress={() => { setPreview(backup.data); setMessage(""); }} />) : <Copy>No recovery snapshots yet.</Copy>}
    </Card>
    {message ? <Copy>{message}</Copy> : null}
  </Page>;
}
