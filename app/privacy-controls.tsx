import { useState } from "react";
import { Platform, Switch } from "react-native";
import { Button, Card, Copy, Page } from "@/components/app-ui";
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
  return <Page title="Privacy controls" subtitle="Device preferences are never included in cloud backups.">
    <Card title="Hide financial amounts">
      <Copy>Hide formatted spending amounts in summaries and the home-screen widget. Editing forms, original notes, receipts, exports, and shared cloud records still contain your data.</Copy>
      <Switch accessibilityLabel="Hide financial amounts" disabled={busy} value={privacy.hideAmounts} onValueChange={(value) => void run(() => privacy.setHideAmounts(value))} />
    </Card>
    <Card title="App lock">
      <Copy>Require device authentication when returning to the Android app. This is a screen lock, not encryption of AsyncStorage, downloaded files, or backups.</Copy>
      {Platform.OS === "android" ? <Switch accessibilityLabel="Enable app lock" disabled={busy} value={privacy.appLockEnabled} onValueChange={(value) => void run(() => privacy.setAppLockEnabled(value))} /> : <Copy muted>App lock is unavailable on the website. Use your browser and operating-system security controls.</Copy>}
    </Card>
    <Button label="Backup, restore, and recovery" secondary onPress={() => router.push("/backup" as never)} />
    <Button label="Account and data deletion" secondary onPress={() => router.push("/delete-account")} />
    {message ? <Copy>{message}</Copy> : null}
  </Page>;
}
