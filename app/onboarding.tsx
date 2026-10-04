import { useState } from "react";
import { router } from "expo-router";
import { Button, Card, Copy, Field, Page } from "@/components/app-ui";
import { useSubscriptions } from "@/lib/subscription-store";
import { requestReminderPermission } from "@/lib/reminders";

export default function OnboardingScreen() {
  const store = useSubscriptions();
  const [budget, setBudget] = useState(store.settings.monthlyBudget ? String(store.settings.monthlyBudget) : "");
  const [currency, setCurrency] = useState(store.settings.budgetCurrency ?? "USD");
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const finish = async (add: boolean) => {
    setBusy(true);
    try {
      const amount = budget.trim() ? Number(budget) : 0;
      await store.updateSettings({ monthlyBudget: amount, budgetCurrency: currency.toUpperCase(), onboardingCompleted: true });
      router.replace(add ? "/quick-add" as never : "/(tabs)");
    } catch { setMessage("Enter a non-negative budget and a three-letter currency."); }
    finally { setBusy(false); }
  };
  return <Page title="Welcome to SubTrack" subtitle="Your subscriptions, your decisions. Useful without an account.">
    <Card title="Local first"><Copy>No bank connection, inbox access, or provider passwords. Your records stay on this device unless you explicitly export or sync them.</Copy><Copy muted>Local storage and exported backups are not encrypted. App lock protects the screen, not the underlying files.</Copy></Card>
    <Card title="Set a spending target (optional)">
      <Field label="Monthly budget" value={budget} onChangeText={setBudget} keyboardType="decimal-pad" />
      <Field label="Budget currency" value={currency} onChangeText={setCurrency} maxLength={3} autoCapitalize="characters" />
    </Card>
    <Card title="Reminders are your choice"><Copy>Allow local alerts before trials become paid and before renewals. Permission can be changed in Settings.</Copy>
      <Button label="Allow renewal reminders" secondary disabled={busy} onPress={() => {
        setBusy(true);
        void requestReminderPermission().then(async (permission) => {
          if (permission === "granted") await store.updateSettings({ notificationsEnabled: true });
          setMessage(permission === "granted" ? "Reminders allowed." : "Reminders are unavailable or not allowed. You can still use the app.");
        }).catch(() => setMessage("Reminder permission could not be requested.")).finally(() => setBusy(false));
      }} />
    </Card>
    {message ? <Copy>{message}</Copy> : null}
    <Button label="Save preferences and add my first subscription" disabled={busy} onPress={() => void finish(true)} />
    <Button label="Finish without adding a subscription" secondary disabled={busy} onPress={() => void finish(false)} />
  </Page>;
}
