import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import { Platform, Text, View } from "react-native";
import { Button, ConfirmDialog, Copy, Notice, ToggleRow } from "@/components/app-ui";
import { Disclosure, FinanceLink, FinancePage, MetricLabel, RoundAction, RowDivider, SectionHeading, Surface, financeType } from "@/components/finance-ui";
import { ServiceBadge } from "@/components/subscription-ui";
import { billingSourceMeta, getService } from "@/lib/catalog";
import { deadlineLabel, shortDate, subscriptionName } from "@/lib/finance-overview";
import { useMoneyFormatter } from "@/lib/privacy";
import { getRenewalQueue } from "@/lib/renewal-queue";
import { useSubscriptions } from "@/lib/subscription-store";
import { annualAmount, formatDate, getCancellationEvidenceTimeline, getPlanChangeHistory, getSubscriptionOwnership, monthlyAmount, resolveManagementUrl } from "@/lib/subscription-utils";
import { usePalette } from "@/lib/ui-theme";

const decisionCopy = { keep: "Keep this plan", downgrade: "Look for a lower-cost plan", pause: "Pause if available", "cancel-officially": "Cancel with the provider", "review-later": "Review later" };
const cadenceCopy = { weekly: "per week", monthly: "per month", quarterly: "per quarter", yearly: "per year" };

export default function SubscriptionDetailScreen() {
  const colors = usePalette();
  const money = useMoneyFormatter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useSubscriptions();
  const record = store.subscriptions.find((item) => item.id === id);
  const [dialog, setDialog] = useState<"manage" | "follow-up" | "confirm" | null>(null);
  const [billingOpen, setBillingOpen] = useState(false);
  const [sharingOpen, setSharingOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!store.isReady) return <FinancePage title="Subscription"><Copy muted>Loading your subscription…</Copy></FinancePage>;
  if (!record) return <FinancePage title="Subscription not found"><Copy muted>This record is no longer on this device.</Copy><Button label="View subscriptions" onPress={() => router.replace("/(tabs)/subscriptions")} /></FinancePage>;
  const service = getService(record.serviceId);
  const billing = billingSourceMeta[record.billingSource];
  const shares = getSubscriptionOwnership(record, store.householdMembers);
  const changes = getPlanChangeHistory(record);
  const cancellationEvents = getCancellationEvidenceTimeline(record);
  const next = getRenewalQueue([record]).find((item) => item.kind !== "cancellation");
  const pending = record.cancellationState === "pending";
  const archived = record.status === "cancelled";
  const edit = (section?: string) => router.push({ pathname: "/subscription/edit", params: { subscriptionId: record.id, ...(section ? { section } : {}) } });
  const review = () => router.push({ pathname: "/decision-plan", params: { id: record.id } });
  const run = async (operation: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true); setError("");
    try { await operation(); setDialog(null); }
    catch { setDialog(null); setError("Could not complete that step. Please try again."); }
    finally { setBusy(false); }
  };
  const changeReminder = (enabled: boolean) => {
    const { id, createdAt: _created, updatedAt: _updated, reminderIdentifier: _reminder, reminderIdentifiers: _reminders, ...draft } = record;
    void run(() => store.updateSubscription(id, { ...draft, reminderEnabled: enabled }));
  };

  return <FinancePage title="Subscription" trailing={<RoundAction icon="create-outline" label="Edit subscription" onPress={() => edit()} />}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
      <ServiceBadge serviceId={record.serviceId} size="large" label={record.planName} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: colors.foreground, fontFamily: financeType.bold, fontSize: 24, letterSpacing: -0.5 }}>{subscriptionName(record)}</Text>
        {service ? <Text style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 12, marginTop: 3 }}>{record.planName}</Text> : null}
      </View>
      <View style={{ backgroundColor: colors.elevated, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 }}>
        <Text style={{ color: pending || record.status === "trial" ? colors.warning : colors.primary, fontFamily: financeType.medium, fontSize: 10 }}>{archived ? "Archived" : record.status === "trial" ? "Trial" : pending ? "Pending" : record.status === "uncertain" ? "Check status" : "Active"}</Text>
      </View>
    </View>
    <Surface>
      <MetricLabel>{archived ? "Last saved price" : record.status === "trial" ? "Price after trial" : "Your plan price"} · {record.currency}</MetricLabel>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", gap: 8 }}>
        <Text style={{ color: colors.foreground, fontFamily: financeType.bold, fontSize: 32, letterSpacing: -1 }}>{money(record.amount, record.currency)}</Text>
        <Text style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 12 }}>{cadenceCopy[record.cadence]}</Text>
      </View>
      {record.cadence !== "monthly" ? <MetricLabel>{money(monthlyAmount(record.amount, record.cadence), record.currency)} monthly equivalent · {money(annualAmount(record.amount, record.cadence), record.currency)} / year</MetricLabel> : null}
      <RowDivider />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 11 }}>{archived ? "Cancelled record" : record.status === "trial" ? "Trial ends" : record.autoRenewStatus === "off" ? "Last saved payment date" : "Next payment"}</Text>
          <Text style={{ color: colors.foreground, fontFamily: financeType.medium, fontSize: 14, marginTop: 3 }}>{archived ? record.cancellationConfirmedAt ? formatDate(record.cancellationConfirmedAt) : "No future renewals tracked" : next ? formatDate(next.due) : "No upcoming renewal"}</Text>
        </View>
      </View>
      {!archived && record.expectedNextCharge !== undefined && record.expectedNextCharge !== record.amount ? <View style={{ gap: 5 }}>
        <MetricLabel>Expected next charge</MetricLabel>
        <Text style={{ color: record.expectedNextCharge > record.amount ? colors.warning : colors.primary, fontFamily: financeType.semi, fontSize: 17 }}>{money(record.expectedNextCharge, record.currency)}</Text>
        {record.costChangeReason ? <Copy muted>{record.costChangeReason}</Copy> : null}
      </View> : null}
    </Surface>
    {error ? <Notice error>{error}</Notice> : null}
    {pending ? <Surface>
      <SectionHeading title="Did the cancellation go through?" />
      <Copy muted>Check your provider’s confirmation before marking this plan cancelled.</Copy>
      {record.cancellationFollowUpDate ? <Text style={{ color: colors.warning, fontFamily: financeType.medium, fontSize: 12 }}>Follow-up · {deadlineLabel(record.cancellationFollowUpDate)}</Text> : null}
      <Button label="I received confirmation" disabled={busy} onPress={() => setDialog("confirm")} />
      <FinanceLink icon="create-outline" title="Edit cancellation record" onPress={() => edit("cancellation")} />
    </Surface> : !archived ? <View style={{ gap: 12 }}>
      <SectionHeading title={record.status === "trial" ? "Make the call before it bills" : "Is this renewal still right for you?"} />
      <Text style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 12, lineHeight: 20 }}>{record.renewalDecisionPlan ? `Your plan: ${decisionCopy[record.renewalDecisionPlan.action]}.` : record.status === "trial" ? `Review ${service?.name ?? "your plan"} before ${shortDate(record.trialEndDate ?? record.renewalDate)}.` : "Keep what you use. Reconsider what you don’t."}</Text>
      <Button label={record.status === "trial" ? "Review this trial" : "Review renewal"} onPress={review} />
    </View> : null}
    <View style={{ gap: 4 }}>
      <FinanceLink icon="open-outline" title="Manage with provider" detail={`Opens ${billing.label}'s official page`} onPress={() => setDialog("manage")} />
      {!pending && !archived ? <FinanceLink icon="shield-checkmark-outline" title="Track a cancellation request" detail="After you’ve requested cancellation with your provider" onPress={() => setDialog("follow-up")} /> : null}
    </View>
    {Platform.OS !== "web" && !archived ? <Surface>
      <ToggleRow label="Renewal reminder" description={store.settings.notificationsEnabled ? `${store.settings.reminderDays} days before payment` : "Reminders are paused in Settings"} value={record.reminderEnabled} disabled={busy} onChange={changeReminder} />
      <FinanceLink icon="notifications-outline" title="Reminder settings" onPress={() => router.push("/(tabs)/settings")} />
    </Surface> : null}
    <View>
      <Disclosure title="Billing & plan options" open={billingOpen} onToggle={() => setBillingOpen(!billingOpen)}>
        <MetricLabel>Billed through</MetricLabel><Copy>{billing.label}</Copy>
        <Copy muted>{billing.description}</Copy>
        {record.billingIdentity ? <><MetricLabel>Statement or account label</MetricLabel><Copy selectable>{record.billingIdentity}</Copy></> : null}
        <MetricLabel>Auto-renew: {record.autoRenewStatus === "on" ? "On" : record.autoRenewStatus === "off" ? "Off" : "Not checked"} · as you recorded it</MetricLabel>
        {service ? <>
          <FinanceLink icon="swap-horizontal-outline" title="Compare plan options" onPress={() => router.push(`/compare/${service.id}` as never)} />
          <FinanceLink icon="globe-outline" title="Compare prices in your region" onPress={() => router.push({ pathname: "/regional-plans", params: { serviceId: service.id } })} />
          <FinanceLink icon="information-circle-outline" title="Service information" onPress={() => router.push(`/service/${service.id}` as never)} />
        </> : null}
      </Disclosure>
      <Disclosure title={shares.length > 1 ? "Who shares this plan" : "Share the cost"} open={sharingOpen} onToggle={() => setSharingOpen(!sharingOpen)}>
        {shares.length > 1 ? shares.map((share) => <View key={share.member.id} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <View style={{ flex: 1 }}><Copy>{share.member.name}{share.member.isOwner ? " (you)" : ""}</Copy><MetricLabel>{share.percentage.toFixed(2)}% of the saved price</MetricLabel></View>
          <Text style={{ color: colors.foreground, fontFamily: financeType.medium, fontSize: 12 }}>{money(share.monthly, record.currency)} / mo</Text>
        </View>) : <Copy muted>Split the cost with people you share with. This won’t change provider billing.</Copy>}
        <FinanceLink icon="people-outline" title="Edit cost sharing" onPress={() => edit("sharing")} />
      </Disclosure>
      <Disclosure title="Notes & history" open={historyOpen} onToggle={() => setHistoryOpen(!historyOpen)}>
        {record.notes ? <Copy>{record.notes}</Copy> : null}
        {record.renewalDecisionPlan?.note ? <><MetricLabel>Your decision note</MetricLabel><Copy>{record.renewalDecisionPlan.note}</Copy></> : null}
        {record.valueCheckIn ? <Copy muted>Your check-in: {record.valueCheckIn.useLevel} use · would choose again: {record.valueCheckIn.wouldBuyAgain}</Copy> : null}
        {changes.map((change) => <View key={change.id} style={{ gap: 5 }}><MetricLabel>{formatDate(change.changedAt)}</MetricLabel><Copy>{change.previousPlanName} → {change.nextPlanName}</Copy><Copy muted>{money(change.previousAmount, change.previousCurrency)} → {money(change.nextAmount, change.nextCurrency)}</Copy><RowDivider /></View>)}
        {cancellationEvents.map((event) => <View key={event.id} style={{ gap: 5 }}><MetricLabel>{formatDate(event.date)}</MetricLabel><Copy>{event.title}</Copy><Copy muted>{event.detail}</Copy><RowDivider /></View>)}
        {!record.notes && !record.renewalDecisionPlan?.note && !record.valueCheckIn && !changes.length && !cancellationEvents.length ? <Copy muted>No notes or changes recorded yet.</Copy> : null}
      </Disclosure>
    </View>
    <ConfirmDialog visible={!!dialog} title={dialog === "manage" ? "Open your provider’s page?" : dialog === "follow-up" ? "Track your cancellation request?" : "Record this cancellation?"}
      message={dialog === "manage" ? `${billing.label} handles your billing. Make changes there, then update your saved record here. SubTrack cannot cancel your plan for you.` : dialog === "follow-up" ? "Use this after you’ve requested cancellation with your provider. Your record will stay pending, with a follow-up in 7 days." : "Only continue if your provider has confirmed the cancellation. This archives the subscription and stops its renewal reminders."}
      confirmLabel={dialog === "manage" ? "Open provider page" : dialog === "follow-up" ? "Track request" : "Record cancellation"} busy={busy} onCancel={() => setDialog(null)} onConfirm={() => void run(() => dialog === "manage" ? WebBrowser.openBrowserAsync(resolveManagementUrl(record)) : dialog === "follow-up" ? store.beginCancellationFollowUp(record.id) : store.confirmCancellation(record.id))} />
  </FinancePage>;
}
