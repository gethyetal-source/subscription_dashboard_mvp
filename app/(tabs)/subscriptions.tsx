import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Button, ChoiceChips, ConfirmDialog, Field, Notice } from "@/components/app-ui";
import { DatePickerSheet } from "@/components/date-picker-sheet";
import { ActionSheet, EmptyIllustration, FinanceHeader, FinanceLink, RoundAction, SearchField, financeType } from "@/components/finance-ui";
import { ScreenContainer } from "@/components/screen-container";
import { ServiceBadge } from "@/components/subscription-ui";
import { getService } from "@/lib/catalog";
import { localDateSchema } from "@/lib/data-safety";
import { deadlineLabel, financeLedger, shortDate, subscriptionName } from "@/lib/finance-overview";
import { parseMoneyInput } from "@/lib/form-utils";
import { useMoneyFormatter } from "@/lib/privacy";
import { getRenewalQueue } from "@/lib/renewal-queue";
import { useSubscriptions } from "@/lib/subscription-store";
import type { SubscriptionDraft, SubscriptionRecord } from "@/lib/subscription-types";
import { localDateKey } from "@/lib/subscription-utils";
import { usePalette } from "@/lib/ui-theme";

type Filter = "current" | "trial" | "cancelled";
const filters = [{ label: "Current", value: "current" }, { label: "Trials", value: "trial" }, { label: "Archived", value: "cancelled" }] as const;
const cadenceCopy = { weekly: "/ week", monthly: "/ month", quarterly: "/ quarter", yearly: "/ year" };

export default function SubscriptionsScreen() {
  const colors = usePalette();
  const money = useMoneyFormatter();
  const store = useSubscriptions();
  const [filter, setFilter] = useState<Filter>("current");
  const [search, setSearch] = useState("");
  const [actions, setActions] = useState<SubscriptionRecord | null>(null);
  const [tools, setTools] = useState(false);
  const [editing, setEditing] = useState<SubscriptionRecord | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [picker, setPicker] = useState(false);
  const [deleting, setDeleting] = useState<SubscriptionRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editError, setEditError] = useState("");
  const dueDates = new Map(getRenewalQueue(store.subscriptions).filter((item) => item.kind !== "cancellation").map((item) => [item.record.id, item.due]));
  const filtered = useMemo(() => financeLedger(store.subscriptions, filter, search), [store.subscriptions, search, filter]);

  const quickEdit = () => {
    if (!actions) return;
    setAmount(String(actions.amount)); setDate(actions.renewalDate); setEditError("");
    setEditing(actions); setActions(null);
  };
  const saveQuickEdit = async () => {
    if (!editing || busy) return;
    const value = parseMoneyInput(amount);
    if (value === undefined) { setEditError("Enter a valid amount, including 0 for a free plan."); return; }
    if (!localDateSchema.safeParse(date).success || (date !== editing.renewalDate && date < localDateKey())) { setEditError("Choose today or a future date."); return; }
    setBusy(true); setEditError("");
    try {
      const { id, createdAt: _created, updatedAt: _updated, reminderIdentifier: _reminder, reminderIdentifiers: _reminders, ...draft } = editing;
      await store.updateSubscription(id, { ...draft, amount: value, renewalDate: date } satisfies SubscriptionDraft);
      setEditing(null);
    } catch { setEditError("Could not save your changes. Please try again."); }
    finally { setBusy(false); }
  };
  const deleteRecord = async () => {
    if (!deleting || busy) return;
    setBusy(true); setError("");
    try { await store.deleteSubscription(deleting.id); setDeleting(null); }
    catch { setDeleting(null); setError("The subscription was not removed. Please try again."); }
    finally { setBusy(false); }
  };

  return <ScreenContainer>
    <FlatList data={filtered} keyExtractor={(item) => item.id} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 22, paddingBottom: 32 }}
      ListHeaderComponent={<View style={{ gap: 22, marginBottom: 22 }}>
        <FinanceHeader title="Subscriptions" trailing={<View style={{ flexDirection: "row", gap: 7 }}>
          <RoundAction icon="ellipsis-horizontal" label="Subscription options" onPress={() => setTools(true)} />
          {store.subscriptions.length ? <RoundAction icon="add" primary label="Add subscription" onPress={() => router.push("/quick-add")} /> : null}
        </View>} />
        {store.subscriptions.length ? <>
          <SearchField value={search} onChange={setSearch} label="Search your subscriptions" placeholder="Search your subscriptions" />
          <View style={{ flexDirection: "row", gap: 7 }}>
            {filters.map((option) => <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: filter === option.value }} onPress={() => setFilter(option.value)}
              style={({ pressed }) => ({ flex: 1, borderRadius: 12, backgroundColor: filter === option.value ? colors.primary : colors.elevated, minHeight: 44, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
              <Text style={{ fontFamily: financeType.medium, fontSize: 12, color: filter === option.value ? colors.onPrimary : colors.muted }}>{option.label}</Text>
            </Pressable>)}
          </View>
          <Text style={{ color: colors.muted, fontFamily: financeType.medium, fontSize: 11 }}>{filtered.length} subscription{filtered.length === 1 ? "" : "s"}</Text>
        </> : null}
        {error ? <Notice error>{error}</Notice> : null}
      </View>}
      ListEmptyComponent={<EmptyIllustration title={search ? "No matches" : filter === "cancelled" ? "Nothing archived" : filter === "trial" ? "No trials to track" : "Your subscriptions, organized."}
        body={search ? "Try a service or plan name." : filter === "cancelled" ? "Subscriptions you mark cancelled will appear here." : filter === "trial" ? "Add a trial to stay ahead of its first charge." : "Add what you pay for. Know what’s coming next."}
        action={filter === "current" && !search ? <Button label="Add a subscription" onPress={() => router.push("/quick-add")} /> : <Button label={search ? "Clear search" : "View current subscriptions"} secondary onPress={() => { setSearch(""); setFilter("current"); }} />} />}
      renderItem={({ item }) => {
        const due = dueDates.get(item.id);
        const secondary = item.cancellationState === "pending" ? "Cancellation pending" : item.status === "cancelled" ? "Archived" : item.status === "trial" ? `Trial ends ${due ? deadlineLabel(due) : shortDate(item.trialEndDate ?? item.renewalDate)}` : due ? `${item.autoRenewStatus === "off" ? "Last saved date" : "Next"} · ${deadlineLabel(due)}` : "No upcoming renewal";
        return <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 18, paddingLeft: 14, paddingRight: 4, borderWidth: 1, borderColor: colors.border }}>
          <Pressable accessibilityRole="button" accessibilityLabel={`View ${subscriptionName(item)}`} onPress={() => router.push(`/subscription/${item.id}` as never)}
            style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 16, opacity: pressed ? 0.7 : 1 })}>
            <ServiceBadge serviceId={item.serviceId} label={item.planName} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ color: colors.foreground, fontFamily: financeType.semi, fontSize: 13 }}>{subscriptionName(item)}</Text>
              {getService(item.serviceId) && item.planName !== subscriptionName(item) ? <Text numberOfLines={1} style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 10, marginTop: 2 }}>{item.planName}</Text> : null}
              <Text style={{ color: item.status === "trial" || item.cancellationState === "pending" ? colors.warning : colors.muted, fontFamily: financeType.regular, fontSize: 10, marginTop: 4 }}>{secondary}</Text>
            </View>
            <View style={{ alignItems: "flex-end", maxWidth: "42%" }}>
              <Text style={{ color: colors.foreground, fontFamily: financeType.semi, fontSize: 13, textAlign: "right" }}>{money(item.amount, item.currency)}</Text>
              <Text style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 10, marginTop: 4 }}>{cadenceCopy[item.cadence]}</Text>
            </View>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Actions for ${subscriptionName(item)}`} onPress={() => setActions(item)} style={{ width: 44, height: 48, justifyContent: "center", alignItems: "center" }}><Ionicons name="ellipsis-vertical" size={17} color={colors.muted} aria-hidden /></Pressable>
        </View>;
      }}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListFooterComponent={filter === "cancelled" && filtered.length ? <View style={{ paddingTop: 16 }}><FinanceLink icon="archive-outline" title="Archived spending summary" onPress={() => router.push("/archive-insights")} /></View> : null}
    />
    <ActionSheet visible={!!actions} title={actions ? subscriptionName(actions) : "Subscription"} onClose={() => setActions(null)}>
      <FinanceLink icon="create-outline" title="Edit details" onPress={() => { const record = actions; setActions(null); if (record) router.push({ pathname: "/subscription/edit", params: { subscriptionId: record.id } }); }} />
      <FinanceLink icon="cash-outline" title="Quick edit price & date" onPress={quickEdit} />
      <FinanceLink icon="trash-outline" title="Remove subscription" danger onPress={() => { setDeleting(actions); setActions(null); }} />
    </ActionSheet>
    <ActionSheet visible={tools} title="Subscriptions" onClose={() => setTools(false)}>
      <FinanceLink icon="help-circle-outline" title="Recognize a charge" detail="Match a statement entry to a saved subscription" onPress={() => { setTools(false); router.push("/charge-recognition"); }} />
      <FinanceLink icon="receipt-outline" title="Billing references & history" onPress={() => { setTools(false); router.push("/evidence-index"); }} />
    </ActionSheet>
    <ActionSheet visible={!!editing} title="Quick edit" onClose={() => { if (!busy) setEditing(null); }}>
      <Field label="Subscription amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" editable={!busy} />
      <Button label={date ? `Next renewal · ${shortDate(date)}` : "Choose next renewal date"} secondary disabled={busy} onPress={() => setPicker(true)} />
      <ChoiceChips label="Quick date" value="" options={[{ value: "today", label: "Today" }]} disabled={busy} onChange={() => setDate(localDateKey())} />
      {editError ? <Notice error>{editError}</Notice> : null}
      <Button label={busy ? "Saving…" : "Save changes"} disabled={busy} onPress={() => void saveQuickEdit()} />
    </ActionSheet>
    <DatePickerSheet visible={picker} value={date} minDate={localDateKey()} title="Next renewal" onClose={() => setPicker(false)} onSelect={setDate} />
    <ConfirmDialog visible={!!deleting} title="Remove this subscription?" message="This removes the saved record and its reminders. It does not cancel your plan with the provider." confirmLabel="Remove subscription" danger busy={busy} onCancel={() => setDeleting(null)} onConfirm={() => void deleteRecord()} />
  </ScreenContainer>;
}
