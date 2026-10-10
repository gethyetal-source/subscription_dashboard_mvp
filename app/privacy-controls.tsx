import { useState } from "react";
import { Platform } from "react-native";
import { Button, Card, Copy, Page, ToggleRow } from "@/components/app-ui";
import { usePrivacy } from "@/lib/privacy";
import { router } from "expo-router";

export default function PrivacyControlsScreen() {
  const privacy = usePrivacy();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (operation: () => Promise<void>) => {
    setBusy(true);
    try { await operation(); setMessage("Preference saved on this device."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not save privacy preference."); }
    finally { setBusy(false); }
  };
  return <Page title="Privacy controls" subtitle="These preferences apply only to this device.">
    <Card title="Hide financial amounts">
      <Copy muted>Hide amounts in summaries and the widget. Forms, notes, receipts, shared plans, and exports still contain your amounts.</Copy>
      <ToggleRow label="Hide amounts" disabled={busy} value={privacy.hideAmounts} onChange={(value) => void run(() => privacy.setHideAmounts(value))} />
    </Card>
    <Card title="App lock">
      <Copy muted>Require device authentication when you return to the app. Stored data and backup files are not encrypted.</Copy>
      {Platform.OS === "android" ? <ToggleRow label="App lock" disabled={busy} value={privacy.appLockEnabled} onChange={(value) => void run(() => privacy.setAppLockEnabled(value))} /> : <Copy muted>App lock is available on Android only.</Copy>}
    </Card>
    <Button label="Backup, restore, and recovery" secondary onPress={() => router.push("/backup" as never)} />
    <Button label="Account and data deletion" secondary onPress={() => router.push("/delete-account")} />
    {message ? <Copy>{message}</Copy> : null}
  </Page>;
}
