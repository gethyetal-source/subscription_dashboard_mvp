import { useState } from "react";
import { router } from "expo-router";
import { Platform, Text, View } from "react-native";
import { Button, ChoiceChips, Copy, Field, Notice, ToggleRow } from "./app-ui";
import { DatePickerSheet } from "./date-picker-sheet";
import { Disclosure, FinancePage, Surface, financeType } from "./finance-ui";
import { SharedPlanField } from "./household-shared-plan-field";
import { ServiceBadge } from "./subscription-ui";
import { billingSourceMeta, getService } from "@/lib/catalog";
import { defaultCurrency } from "@/lib/countries";
import { localDateSchema } from "@/lib/data-safety";
import { shortDate } from "@/lib/finance-overview";
import { parseMoneyInput } from "@/lib/form-utils";
import { cadenceLabel, potentialDuplicates } from "@/lib/import-utils";
import { useSubscriptions } from "@/lib/subscription-store";
import type { AutoRenewStatus, BillingCadence, BillingSource, SubscriptionDraft, SubscriptionRecord, SubscriptionStatus } from "@/lib/subscription-types";
import { getHouseholdAllocation, localDateKey } from "@/lib/subscription-utils";
import { usePalette } from "@/lib/ui-theme";

export type SubscriptionPrefill = { name?: string; amount?: string; currency?: string; serviceId?: string; renewalDate?: string; };
type DateTarget = "renewal" | "end" | "follow-up";

export function SubscriptionForm({ existing, prefill = {}, onChangeService, initialSection }: { existing?: SubscriptionRecord; prefill?: SubscriptionPrefill; onChangeService?: () => void; initialSection?: string }) {
  const store = useSubscriptions();
  const colors = usePalette();
  const serviceId = existing?.serviceId ?? prefill.serviceId ?? "custom";
  const service = getService(serviceId);
  const [name, setName] = useState(existing?.planName ?? prefill.name ?? service?.name ?? "");
  const [planId, setPlanId] = useState(existing?.planId);
  const [amount, setAmount] = useState(existing ? String(existing.amount) : prefill.amount ?? "");
  const [currency, setCurrency] = useState(existing?.currency ?? prefill.currency ?? defaultCurrency(store.settings));
  const [cadence, setCadence] = useState<BillingCadence>(existing?.cadence ?? "monthly");
  const [renewalDate, setRenewalDate] = useState(existing?.status === "trial" ? existing.trialEndDate ?? existing.renewalDate : existing?.renewalDate ?? prefill.renewalDate ?? "");
  const [status, setStatus] = useState<SubscriptionStatus>(existing?.status ?? "active");
  const [source, setSource] = useState<BillingSource>(existing?.billingSource ?? "provider");
  const [reminder, setReminder] = useState(existing?.reminderEnabled ?? true);
  const [expected, setExpected] = useState(existing?.expectedNextCharge === undefined ? "" : String(existing.expectedNextCharge));
  const [reason, setReason] = useState(existing?.costChangeReason ?? "");
  const [billingIdentity, setIdentity] = useState(existing?.billingIdentity ?? "");
  const [autoRenew, setAutoRenew] = useState<AutoRenewStatus>(existing?.autoRenewStatus ?? "unknown");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [memberIds, setMemberIds] = useState(existing?.sharedMemberIds ?? ["owner"]);
  const [shares, setShares] = useState(existing?.sharedMemberShares ?? getHouseholdAllocation(memberIds));
  const [confirmation, setConfirmation] = useState(existing?.cancellationConfirmationReference ?? "");
  const [endDate, setEndDate] = useState(existing?.cancellationExpectedEndDate ?? "");
  const [followUp, setFollowUp] = useState(existing?.cancellationFollowUpDate ?? "");
  const [more, setMore] = useState(initialSection === "billing");
  const [sharing, setSharing] = useState(initialSection === "sharing");
  const [cancellation, setCancellation] = useState(initialSection === "cancellation");
  const [picker, setPicker] = useState<DateTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateAccepted, setDuplicateAccepted] = useState(false);
  const duplicates = potentialDuplicates(serviceId, name, store.subscriptions).filter((record) => record.id !== existing?.id);
  const dateValue = picker === "end" ? endDate : picker === "follow-up" ? followUp : renewalDate;

  const save = async () => {
    if (busy || !store.isReady) return;
    const value = parseMoneyInput(amount);
    const expectedValue = expected.trim() ? parseMoneyInput(expected) : undefined;
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = "Enter a service or plan name.";
    if (value === undefined) nextErrors.amount = "Enter a valid amount. Use 0 for a free plan.";
    if (!/^[A-Za-z]{3}$/.test(currency.trim())) nextErrors.currency = "Use a three-letter currency, such as USD or INR.";
    const originalDate = existing?.status === "trial" ? existing.trialEndDate ?? existing.renewalDate : existing?.renewalDate;
    if (!localDateSchema.safeParse(renewalDate).success || (renewalDate !== originalDate && renewalDate < localDateKey() && status !== "cancelled")) nextErrors.date = "Choose today or a future date.";
    if (expected.trim() && expectedValue === undefined) nextErrors.expected = "Enter a valid expected charge or leave it blank.";
    if (endDate && !localDateSchema.safeParse(endDate).success) nextErrors.cancellation = "Choose a valid end date.";
    if (followUp && !localDateSchema.safeParse(followUp).success) nextErrors.cancellation = "Choose a valid follow-up date.";
    const participants = [...new Set(["owner", ...memberIds])].filter((id) => store.householdMembers.some((member) => member.id === id));
    const splitTotal = participants.reduce((total, id) => total + (shares[id] ?? 0), 0);
    if (participants.length > 1 && (Math.abs(splitTotal - 100) >= 0.01 || participants.some((id) => !Number.isFinite(shares[id]) || shares[id] < 0))) nextErrors.sharing = "Adjust the cost split to total 100%.";
    if (duplicates.length && !existing && !duplicateAccepted) nextErrors.duplicate = "Confirm this is a separate subscription before saving.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { if (nextErrors.expected) setMore(true); if (nextErrors.sharing) setSharing(true); return; }
    const { id: _id, createdAt: _created, updatedAt: _updated, reminderIdentifier: _reminder, reminderIdentifiers: _reminders, ...savedFields } = existing ?? {} as Partial<SubscriptionRecord>;
    const draft: SubscriptionDraft = {
      ...savedFields,
      serviceId, planId, planName: name.trim(), amount: value!, currency: currency.trim().toUpperCase(), cadence,
      renewalDate: status === "trial" && existing?.trialEndDate && renewalDate === existing.trialEndDate ? existing.renewalDate : renewalDate,
      trialEndDate: status === "trial" ? renewalDate : existing?.trialEndDate,
      status, billingSource: source, reminderEnabled: reminder,
      expectedNextCharge: expectedValue, costChangeReason: reason.trim() || undefined,
      billingIdentity: billingIdentity.trim() || undefined, autoRenewStatus: autoRenew, notes: notes.trim() || undefined,
      sharedMemberIds: participants, sharedMemberShares: getHouseholdAllocation(participants, shares),
      cancellationConfirmationReference: confirmation.trim() || undefined,
      cancellationExpectedEndDate: endDate || undefined, cancellationFollowUpDate: followUp || undefined,
      ...(existing?.cancellationState === "confirmed" && status !== "cancelled" ? { cancellationState: "none", cancellationConfirmedAt: undefined, cancellationFollowUpCompletedAt: undefined } : {}),
    };
    setBusy(true);
    try {
      const record = existing ? await store.updateSubscription(existing.id, draft) : await store.addSubscription(draft);
      if (!record) throw new Error("Missing record");
      router.replace(`/subscription/${record.id}` as never);
    } catch { setErrors({ save: "Could not save your subscription. Your previous records have not changed." }); }
    finally { setBusy(false); }
  };

  return <FinancePage title={existing ? "Edit subscription" : "Subscription details"}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 13 }}>
      <ServiceBadge serviceId={serviceId} size="large" label={name} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: colors.foreground, fontFamily: financeType.semi, fontSize: 19 }}>{service?.name ?? "Your subscription"}</Text>
        <Text style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 11, marginTop: 3 }}>{service?.category ?? "Enter the details from your bill"}</Text>
      </View>
      {onChangeService ? <Button label="Change" secondary disabled={busy} onPress={onChangeService} /> : null}
    </View>
    <View style={{ gap: 16 }}>
      <Field label={service ? "Plan name" : "Service or plan name"} value={name} onChangeText={(value) => { setName(value); setPlanId(undefined); setDuplicateAccepted(false); }} maxLength={200} editable={!busy} />
      {errors.name ? <Notice error>{errors.name}</Notice> : null}
      {service?.plans.length ? <ChoiceChips label="Or choose your plan" options={service.plans.map((plan) => ({ label: plan.name, value: plan.id }))} value={planId ?? ""} disabled={busy} onChange={(id) => {
        const plan = service.plans.find((item) => item.id === id);
        if (plan) { setPlanId(id); setName(plan.name); setCadence(plan.cadence); }
      }} /> : null}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 2, minWidth: 0 }}><Field label={status === "trial" ? "Price after trial" : "Amount per payment"} value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" editable={!busy} /></View>
        <View style={{ flex: 1, minWidth: 0 }}><Field label="Currency" value={currency} onChangeText={setCurrency} maxLength={3} autoCapitalize="characters" editable={!busy} /></View>
      </View>
      {errors.amount || errors.currency ? <Notice error>{errors.amount ?? errors.currency}</Notice> : null}
      <ChoiceChips label="Billing period" value={cadence} options={(["monthly", "yearly", "weekly", "quarterly"] as const).map((value) => ({ value, label: cadenceLabel(value) }))} onChange={setCadence} disabled={busy} />
      <View style={{ gap: 7 }}>
        <Copy>{status === "trial" ? "Trial ends" : "Next payment"}</Copy>
        <Button label={renewalDate ? shortDate(renewalDate) + `, ${renewalDate.slice(0, 4)}` : "Choose a date"} secondary disabled={busy} onPress={() => setPicker("renewal")} />
        {errors.date ? <Notice error>{errors.date}</Notice> : null}
      </View>
      {!existing ? <ToggleRow label="This is a free trial" value={status === "trial"} disabled={busy} onChange={(trial) => setStatus(trial ? "trial" : "active")} /> : null}
      {Platform.OS !== "web" ? <ToggleRow label="Remind me before payment" value={reminder} onChange={setReminder} disabled={busy} /> : null}
    </View>
    <View>
      <Disclosure title="Billing & other details" open={more} onToggle={() => setMore(!more)}>
        <ChoiceChips label="Billed through" value={source} options={(["provider", "apple", "google", "carrier", "reseller", "unknown"] as BillingSource[]).map((value) => ({ value, label: billingSourceMeta[value].label }))} onChange={setSource} disabled={busy} />
        <Field label="Expected next charge (optional)" value={expected} onChangeText={setExpected} keyboardType="decimal-pad" editable={!busy} />
        {errors.expected ? <Notice error>{errors.expected}</Notice> : null}
        <Field label="Why the price may change (optional)" value={reason} onChangeText={setReason} maxLength={1000} editable={!busy} />
        <ChoiceChips label="Auto-renew on your provider account" value={autoRenew} options={[{ value: "unknown", label: "Not checked" }, { value: "on", label: "On" }, { value: "off", label: "Off" }]} onChange={setAutoRenew} disabled={busy} />
        <Copy muted>Record what your provider shows. SubTrack does not change your account.</Copy>
        <Field label="Statement or account label (optional)" value={billingIdentity} onChangeText={setIdentity} maxLength={500} editable={!busy} />
        {existing ? <ChoiceChips label="Saved status" value={status} options={[{ value: "active", label: "Active" }, { value: "trial", label: "Trial" }, { value: "uncertain", label: "Uncertain" }, { value: "cancelled", label: "Archived" }]} onChange={setStatus} disabled={busy} /> : null}
        <Field label="Note (optional)" value={notes} onChangeText={setNotes} maxLength={4000} multiline editable={!busy} />
      </Disclosure>
      <Disclosure title="Share the cost" open={sharing} onToggle={() => setSharing(!sharing)}>
        <SharedPlanField members={store.householdMembers} selectedMemberIds={memberIds} sharedMemberShares={shares} onChange={(ids) => { setMemberIds(ids); setShares(getHouseholdAllocation(ids)); }} onSharesChange={setShares} onManageHousehold={() => router.push("/household")} />
        {errors.sharing ? <Notice error>{errors.sharing}</Notice> : null}
      </Disclosure>
      {existing?.cancellationState === "pending" || existing?.cancellationState === "confirmed" ? <Disclosure title="Cancellation record" open={cancellation} onToggle={() => setCancellation(!cancellation)}>
        <Field label="Confirmation reference (optional)" value={confirmation} onChangeText={setConfirmation} maxLength={500} editable={!busy} />
        <Button label={endDate ? `Access ends · ${shortDate(endDate)}` : "Provider-stated end date"} secondary disabled={busy} onPress={() => setPicker("end")} />
        <Button label={followUp ? `Follow-up · ${shortDate(followUp)}` : "Choose a follow-up date"} secondary disabled={busy} onPress={() => setPicker("follow-up")} />
        {errors.cancellation ? <Notice error>{errors.cancellation}</Notice> : null}
      </Disclosure> : null}
    </View>
    {duplicates.length && !existing ? <Surface>
      <Text style={{ color: colors.foreground, fontFamily: financeType.semi, fontSize: 15 }}>Already tracking this?</Text>
      <Copy muted>You have {duplicates.map((record) => record.planName).join(", ")} saved.</Copy>
      <ToggleRow label="This is a separate subscription" value={duplicateAccepted} onChange={setDuplicateAccepted} disabled={busy} />
      {errors.duplicate ? <Notice error>{errors.duplicate}</Notice> : null}
    </Surface> : null}
    {errors.save ? <Notice error>{errors.save}</Notice> : null}
    <Button label={busy ? "Saving…" : existing ? "Save changes" : "Add subscription"} onPress={() => void save()} disabled={busy || !store.isReady} />
    <DatePickerSheet visible={!!picker} value={dateValue} minDate={picker === "renewal" && status !== "cancelled" ? localDateKey() : undefined} title={picker === "end" ? "Provider-stated end date" : picker === "follow-up" ? "Cancellation follow-up" : status === "trial" ? "Trial ends" : "Next payment"} onClose={() => setPicker(null)} onSelect={(value) => picker === "end" ? setEndDate(value) : picker === "follow-up" ? setFollowUp(value) : setRenewalDate(value)} />
  </FinancePage>;
}
