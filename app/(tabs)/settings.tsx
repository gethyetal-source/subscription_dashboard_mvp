import { router } from "expo-router";
import { Platform, ScrollView, Text, View } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button, ChoiceChips, ConfirmDialog, Copy, Field, Notice, ToggleRow } from "@/components/app-ui";
import { BrandMark } from "@/components/brand-mark";
import { CountryPickerSheet } from "@/components/country-picker-sheet";
import { ActionSheet, Disclosure, FinanceHeader, FinanceLink, Surface, financeType } from "@/components/finance-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useAccount } from "@/lib/account";
import { countrySettingsPatch, defaultCurrency, getCountry, type Country } from "@/lib/countries";
import { COUNTRY_DATA_LICENSE } from "@/lib/country-data-license";
import { exportTextFile } from "@/lib/file-transfer";
import { parseMoneyInput } from "@/lib/form-utils";
import type { ReminderPermissionState } from "@/lib/reminder-utils";
import { getReminderPermissionState, requestReminderPermission } from "@/lib/reminders";
import { useSubscriptions } from "@/lib/subscription-store";
import { buildRenewalCalendarExport } from "@/lib/subscription-utils";
import { useThemeContext } from "@/lib/theme-provider";
import { pinRenewalWidget } from "@/lib/widget-entry";
import { usePalette } from "@/lib/ui-theme";
import { useMoneyFormatter } from "@/lib/privacy";

export default function SettingsScreen() {
  const store = useSubscriptions();
  const account = useAccount();
  const { colorScheme, setColorScheme } = useThemeContext();
  const colors = usePalette();
  const money = useMoneyFormatter();
  const [budgetInput, setBudgetInput] = useState("");
  const [currencyInput, setCurrencyInput] = useState("USD");
  const [permission, setPermission] = useState<ReminderPermissionState>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [resetVisible, setResetVisible] = useState(false);
  const [budgetVisible, setBudgetVisible] = useState(false);
  const [countryVisible, setCountryVisible] = useState(false);
  const [countryLicenseVisible, setCountryLicenseVisible] = useState(false);
  const [remindersVisible, setRemindersVisible] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const { monthlyBudget, budgetCurrency } = store.settings;
  const country = getCountry(store.settings.countryCode);

  useEffect(() => { setBudgetInput(monthlyBudget ? String(monthlyBudget) : ""); }, [monthlyBudget]);
  useEffect(() => { setCurrencyInput(budgetCurrency ?? "USD"); }, [budgetCurrency]);
  const refreshPermission = useCallback(async () => setPermission(await getReminderPermissionState()), []);
  useEffect(() => { void refreshPermission().catch(() => setPermission("unsupported")); }, [refreshPermission]);
  useEffect(() => { if (message) scrollRef.current?.scrollTo({ y: 0, animated: true }); }, [message]);

  const run = async (operation: () => Promise<void>, success?: string) => {
    if (busy) return;
    setBusy(true); setMessage(""); setFailed(false);
    try { await operation(); if (success) setMessage(success); }
    catch { setFailed(true); setMessage("Could not save this change. Please try again."); }
    finally { setBusy(false); }
  };
  const saveBudget = () => {
    const amount = budgetInput.trim() ? parseMoneyInput(budgetInput) : 0;
    const currency = currencyInput.trim().toUpperCase();
    if (amount === undefined || !/^[A-Z]{3}$/.test(currency)) {
      setFailed(true); setMessage("Enter a valid amount and a three-letter currency, such as USD or INR."); return;
    }
    void run(async () => { await store.updateSettings({ monthlyBudget: amount, budgetCurrency: currency }); setBudgetVisible(false); }, "Budget saved.");
  };
  const changeCountry = (next: Country) => void run(async () => {
    await store.updateSettings(countrySettingsPatch(store.settings, next.code));
    setCountryVisible(false);
  }, `Country changed to ${next.name}. New entries use ${next.currency}.${monthlyBudget > 0 && budgetCurrency !== next.currency ? ` Your ${budgetCurrency ?? "USD"} budget is unchanged.` : ""}`);
  const toggleReminders = (enabled: boolean) => void run(async () => {
    if (!enabled) { await store.updateSettings({ notificationsEnabled: false }); return; }
    const nextPermission = await requestReminderPermission();
    setPermission(nextPermission);
    if (nextPermission === "granted") await store.updateSettings({ notificationsEnabled: true });
    else setMessage("Allow notifications in your device settings to use reminders.");
  });

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}>
    <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 22, gap: 24, paddingBottom: 32 }}>
      <FinanceHeader title="Settings" back />
      {message ? <Notice error={failed}>{message}</Notice> : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <BrandMark size={50} />
        <View style={{ flex: 1 }}><Text style={{ color: colors.foreground, fontFamily: financeType.semi, fontSize: 17 }}>Make room for what matters.</Text><Text style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 11, marginTop: 3 }}>Your money. Your preferences.</Text></View>
      </View>
      <Surface>
        <FinanceLink icon="person-circle-outline" title="Your account" detail={account.userEmail ?? "Google or email sign-in"} onPress={() => router.push("/(tabs)/profile")} />
      </Surface>
      <Surface>
        <FinanceLink icon="globe-outline" title="Country & currency" detail={country ? `${country.name} · ${country.currency}` : `Choose your country · current default ${defaultCurrency(store.settings)}`} disabled={busy || !store.isReady} onPress={() => { setMessage(""); setCountryVisible(true); }} />
        <FinanceLink icon="wallet-outline" title="Monthly budget" detail={monthlyBudget ? `${money(monthlyBudget, budgetCurrency)} · ${budgetCurrency}` : "No limit set"} onPress={() => { setMessage(""); setBudgetVisible(true); }} />
        <ToggleRow label="Dark theme" value={colorScheme === "dark"} onChange={(value) => setColorScheme(value ? "dark" : "light")} />
      </Surface>
      {Platform.OS !== "web" ? <Surface>
        <ToggleRow label="Renewal reminders" value={store.settings.notificationsEnabled && permission === "granted"} disabled={busy || !permission || permission === "unsupported"} onChange={toggleReminders} />
        {permission === "denied" ? <Copy muted>Allow notifications in your device settings.</Copy> : permission === "unsupported" ? <Copy muted>Reminders aren’t available on this device.</Copy> : null}
        <FinanceLink icon="time-outline" title="Reminder timing" detail={`${store.settings.reminderDays} days before renewal`} onPress={() => setRemindersVisible(true)} />
      </Surface> : null}
      <View style={{ gap: 10 }}>
        <Text style={{ color: colors.muted, fontFamily: financeType.medium, fontSize: 11 }}>PRIVACY & DATA</Text>
        <Surface>
        <FinanceLink icon="shield-outline" title="Privacy controls" detail="Hide amounts and protect access" onPress={() => router.push("/privacy-controls")} />
        <FinanceLink icon="download-outline" title="Backup & restore" detail="Local files only. Nothing is uploaded." onPress={() => router.push("/backup")} />
        <FinanceLink icon="calendar-outline" title="Export renewal calendar" onPress={() => void run(() => exportTextFile("subtrack-renewals.ics", buildRenewalCalendarExport(store.subscriptions), "text/calendar"), "Calendar exported.")} />
        {Platform.OS === "android" ? <FinanceLink icon="phone-portrait-outline" title="Add home-screen widget" onPress={() => void run(async () => {
          const accepted = await pinRenewalWidget();
          setMessage(accepted ? "Confirm the prompt to add your widget." : "Long-press your home screen, then choose Widgets and SubTrack.");
        })} /> : null}
        </Surface>
      </View>
      <View style={{ gap: 10 }}>
        <Text style={{ color: colors.muted, fontFamily: financeType.medium, fontSize: 11 }}>HOUSEHOLD</Text>
        <Surface>
          <FinanceLink icon="people-outline" title="Shared plans" detail="Split costs on this device only" onPress={() => router.push("/household")} />
        </Surface>
      </View>
      <View>
        <Disclosure title="About SubTrack" open={aboutOpen} onToggle={() => setAboutOpen(!aboutOpen)}>
          <FinanceLink icon="information-circle-outline" title="Privacy policy" onPress={() => router.push("/privacy-policy")} />
          <FinanceLink icon="pricetags-outline" title="Catalog updates" onPress={() => router.push("/catalog-updates")} />
          <FinanceLink icon="create-outline" title="Suggest a catalog correction" onPress={() => router.push("/catalog-correction")} />
          <FinanceLink icon="sparkles-outline" title="Setup guide" onPress={() => router.push("/onboarding")} />
          <FinanceLink icon="document-text-outline" title="Country data license" onPress={() => setCountryLicenseVisible(true)} />
        </Disclosure>
        <FinanceLink icon="trash-outline" title="Reset local data" danger onPress={() => setResetVisible(true)} />
      </View>
    </ScrollView>
    <CountryPickerSheet visible={countryVisible} countryCode={store.settings.countryCode} busy={busy || !store.isReady} error={failed ? message : undefined} onSelect={changeCountry} onClose={() => { if (!busy) setCountryVisible(false); }} />
    <ActionSheet visible={countryLicenseVisible} title="Country data license" onClose={() => setCountryLicenseVisible(false)}>
      <Copy muted>Country and currency defaults use Unicode CLDR data.</Copy>
      <Copy>{COUNTRY_DATA_LICENSE}</Copy>
    </ActionSheet>
    <ActionSheet visible={budgetVisible} title="Monthly budget" onClose={() => { if (!busy) setBudgetVisible(false); }}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 2, minWidth: 0 }}><Field label="Budget amount" value={budgetInput} onChangeText={setBudgetInput} keyboardType="decimal-pad" placeholder="No limit" editable={!busy} /></View>
        <View style={{ flex: 1, minWidth: 0 }}><Field label="Currency" value={currencyInput} onChangeText={setCurrencyInput} autoCapitalize="characters" maxLength={3} editable={!busy} /></View>
      </View>
      <Copy muted>Only subscriptions in this currency count toward the limit. Leave the amount blank to remove it.</Copy>
      {message && failed ? <Notice error>{message}</Notice> : null}
      <Button label={busy ? "Saving…" : "Save budget"} disabled={busy || !store.isReady} onPress={saveBudget} />
    </ActionSheet>
    <ActionSheet visible={remindersVisible} title="Reminder timing" onClose={() => setRemindersVisible(false)}>
      <ChoiceChips label="Remind me before renewal" value={store.settings.reminderDays} options={[1, 3, 7, 14, 30].map((days) => ({ value: days, label: `${days} day${days === 1 ? "" : "s"}` }))} disabled={busy} onChange={(reminderDays) => void run(async () => { await store.updateSettings({ reminderDays }); setRemindersVisible(false); })} />
    </ActionSheet>
    <ConfirmDialog visible={resetVisible} title="Reset local data?" message="This removes this account’s subscriptions, records, and recovery snapshots from this device. It does not cancel subscriptions, delete your sign-in, or change another account’s local records." confirmLabel="Reset local data" danger busy={busy} onCancel={() => setResetVisible(false)} onConfirm={() => void run(async () => { await store.resetLocalData(); setResetVisible(false); }, "Local data reset.")} />
  </ScreenContainer>;
}
