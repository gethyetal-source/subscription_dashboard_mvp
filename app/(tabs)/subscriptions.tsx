import { router } from "expo-router";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useMemo, useState } from "react";

import { DatePickerSheet } from "@/components/date-picker-sheet";
import { EmptyState, SubscriptionRow } from "@/components/subscription-ui";
import { ScreenContainer } from "@/components/screen-container";
import { ElectricPageHeader } from "@/components/electric-page-header";
import { useSubscriptions } from "@/lib/subscription-store";
import type { SubscriptionDraft, SubscriptionRecord, SubscriptionStatus } from "@/lib/subscription-types";
import { isFutureDate, nextLocalDateKey } from "@/lib/subscription-utils";

const filters: Array<{ label: string; value: "all" | SubscriptionStatus }> = [{ label: "All", value: "all" }, { label: "Active", value: "active" }, { label: "Trials", value: "trial" }, { label: "Cancelled", value: "cancelled" }];
const type = { regular: "Poppins-Regular", semi: "Poppins-SemiBold", bold: "Poppins-Bold" };

export default function SubscriptionsScreen() {
  const { subscriptions, updateSubscription, deleteSubscription } = useSubscriptions();
  const [filter, setFilter] = useState<"all" | SubscriptionStatus>("all");
  const [quickEditRecord, setQuickEditRecord] = useState<SubscriptionRecord | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [amountError, setAmountError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<SubscriptionRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const filtered = useMemo(() => filter === "all" ? subscriptions : subscriptions.filter((item) => item.status === filter), [filter, subscriptions]);

  const openQuickEdit = (record: SubscriptionRecord) => {
    setQuickEditRecord(record);
    setAmountInput(String(record.amount));
    setRenewalDate(record.renewalDate);
    setAmountError("");
  };

  const closeQuickEdit = () => {
    if (isSaving) return;
    setQuickEditRecord(null);
    setShowDatePicker(false);
    setAmountError("");
  };

  const saveQuickEdit = async () => {
    if (!quickEditRecord || isSaving) return;
    const amount = Number.parseFloat(amountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      setAmountError("Enter an amount greater than 0.");
      return;
    }
    if (!isFutureDate(renewalDate)) {
      setAmountError("Choose a renewal date after today.");
      return;
    }

    setIsSaving(true);
    const { id, createdAt: _createdAt, updatedAt: _updatedAt, reminderIdentifier: _reminderIdentifier, ...draft } = quickEditRecord;
    try {
      await updateSubscription(id, { ...draft, amount, renewalDate } satisfies SubscriptionDraft);
      setQuickEditRecord(null);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteRecord = async () => {
    if (!deleteCandidate || isDeleting) return;
    const record = deleteCandidate;
    setDeleteCandidate(null);
    setIsDeleting(true);
    try {
      await deleteSubscription(record.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return <ScreenContainer className="px-5" containerClassName="bg-background">
    <FlatList
      data={filtered}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={<><ElectricPageHeader title="Subscriptions" subtitle="Everything you track, in one place." trailing={<Pressable accessibilityRole="button" accessibilityLabel="Add subscription" onPress={() => router.push("/(tabs)/discover")} style={({ pressed }) => [electric.addButton, pressed && styles.pressed]}><Text style={electric.addText}>Add</Text></Pressable>} /><View style={[styles.filters, revamp.filters]}>{filters.map((item) => <Pressable key={item.value} onPress={() => setFilter(item.value)} style={({ pressed }) => [styles.filter, filter === item.value && styles.filterSelected, filter === item.value && revamp.filterSelected, pressed && styles.pressed]}><Text style={[styles.filterText, filter === item.value && styles.filterTextSelected, filter === item.value && revamp.filterTextSelected]}>{item.label}</Text></Pressable>)}</View></>}
      ListEmptyComponent={<EmptyState title="No subscriptions here" body="Explore the catalog to add a plan, price, renewal date, and billing source." />}
      renderItem={({ item }) => <SubscriptionRow item={item} onPress={() => router.push(`/subscription/${item.id}` as never)} onQuickEdit={() => openQuickEdit(item)} onDelete={() => setDeleteCandidate(item)} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />

    <Modal visible={!!quickEditRecord} transparent animationType="slide" onRequestClose={closeQuickEdit}>
      <View style={styles.modalBackdrop}>
        <View style={styles.quickEditSheet}>
          <View style={styles.sheetHeader}><View><Text style={styles.sheetTitle}>Quick edit</Text><Text style={styles.sheetCaption}>Update this local amount and renewal date.</Text></View><Pressable onPress={closeQuickEdit} hitSlop={10}><Text style={styles.close}>×</Text></Pressable></View>
          <Text style={styles.fieldLabel}>Amount</Text>
          <TextInput value={amountInput} onChangeText={(value) => { setAmountInput(value); if (amountError) setAmountError(""); }} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#80868B" style={[styles.input, amountError && styles.inputError]} />
          <Text style={styles.errorText}>{amountError || " "}</Text>
          <Text style={styles.fieldLabel}>Next renewal</Text>
          <Pressable onPress={() => setShowDatePicker(true)} style={({ pressed }) => [styles.dateField, pressed && styles.pressed]}><Text style={styles.dateValue}>{renewalDate || "Select a date"}</Text><Text style={styles.calendarIcon}>⌄</Text></Pressable>
          <View style={styles.sheetActions}><Pressable onPress={closeQuickEdit} disabled={isSaving} style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}><Text style={styles.cancelButtonText}>Cancel</Text></Pressable><Pressable onPress={() => void saveQuickEdit()} disabled={isSaving} style={({ pressed }) => [styles.saveButton, isSaving && styles.disabled, pressed && styles.pressed]}><Text style={styles.saveButtonText}>{isSaving ? "Saving…" : "Save changes"}</Text></Pressable></View>
        </View>
      </View>
    </Modal>
    <DatePickerSheet visible={showDatePicker} value={renewalDate} minDate={nextLocalDateKey()} title="Select renewal date" onClose={() => setShowDatePicker(false)} onSelect={setRenewalDate} />

    <Modal visible={!!deleteCandidate} transparent animationType="fade" onRequestClose={() => !isDeleting && setDeleteCandidate(null)}>
      <View style={styles.modalBackdrop}>
        <View style={styles.deleteSheet}>
          <Text style={styles.deleteTitle}>Delete local record?</Text>
          <Text style={styles.deleteBody}>This removes the local subscription record and reminder. It does not cancel the provider subscription.</Text>
          <View style={styles.sheetActions}><Pressable disabled={isDeleting} onPress={() => setDeleteCandidate(null)} style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}><Text style={styles.cancelButtonText}>Cancel</Text></Pressable><Pressable disabled={isDeleting} onPress={() => void deleteRecord()} style={({ pressed }) => [styles.deleteButton, isDeleting && styles.disabled, pressed && styles.pressed]}><Text style={styles.deleteButtonText}>{isDeleting ? "Deleting…" : "Delete record"}</Text></Pressable></View>
        </View>
      </View>
    </Modal>
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 28, paddingTop: 16 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 17 },
  title: { color: "#202124", fontFamily: type.bold, fontSize: 27, letterSpacing: -0.8 },
  subtitle: { color: "#5F6368", fontFamily: type.regular, fontSize: 12, marginTop: 3 },
  addButton: { backgroundColor: "#1A73E8", borderRadius: 22, paddingHorizontal: 17, paddingVertical: 11 },
  addText: { color: "#FFFFFF", fontFamily: type.semi, fontSize: 12 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  filter: { backgroundColor: "#1D2212", borderColor: "#343A25", borderRadius: 10, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 8 },
  filterSelected: { backgroundColor: "#C9F72D" },
  filterText: { color: "#C5CBB8", fontFamily: type.semi, fontSize: 11 },
  filterTextSelected: { color: "#172108", fontFamily: type.semi, fontSize: 11 },
  separator: { height: 10 },
  modalBackdrop: { backgroundColor: "rgba(6,8,3,0.74)", flex: 1, justifyContent: "flex-end" },
  quickEditSheet: { backgroundColor: "#191E0F", borderColor: "#3A4227", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, padding: 20 },
  deleteSheet: { backgroundColor: "#191E0F", borderColor: "#3A4227", borderRadius: 20, borderWidth: 1, margin: 20, padding: 20 },
  sheetHeader: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  sheetTitle: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 17 },
  sheetCaption: { color: "#A8AD98", fontFamily: type.regular, fontSize: 11, marginTop: 3 },
  close: { color: "#A8AD98", fontFamily: type.regular, fontSize: 28, lineHeight: 28 },
  fieldLabel: { color: "#C5CBB8", fontFamily: type.semi, fontSize: 12, marginBottom: 7, marginTop: 3 },
  input: { backgroundColor: "#12160B", borderColor: "#3A4227", borderRadius: 12, borderWidth: 1, color: "#F4F2E8", fontFamily: type.regular, fontSize: 15, minHeight: 48, paddingHorizontal: 13 },
  inputError: { borderColor: "#FF8A7A" },
  errorText: { color: "#FF9B8C", fontFamily: type.regular, fontSize: 10, minHeight: 18, paddingTop: 4 },
  dateField: { alignItems: "center", backgroundColor: "#12160B", borderColor: "#3A4227", borderRadius: 12, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 48, paddingHorizontal: 13 },
  dateValue: { color: "#F4F2E8", fontFamily: type.regular, fontSize: 14 },
  calendarIcon: { color: "#C9F72D", fontFamily: type.semi, fontSize: 18 },
  sheetActions: { flexDirection: "row", gap: 10, justifyContent: "flex-end", marginTop: 22 },
  cancelButton: { alignItems: "center", borderColor: "#3A4227", borderRadius: 12, borderWidth: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: 17 },
  cancelButtonText: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 12 },
  saveButton: { alignItems: "center", backgroundColor: "#C9F72D", borderRadius: 12, justifyContent: "center", minHeight: 44, paddingHorizontal: 17 },
  saveButtonText: { color: "#172108", fontFamily: type.semi, fontSize: 12 },
  deleteTitle: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 17 },
  deleteBody: { color: "#A8AD98", fontFamily: type.regular, fontSize: 12, lineHeight: 18, marginTop: 8 },
  deleteButton: { alignItems: "center", backgroundColor: "#C5221F", borderRadius: 22, justifyContent: "center", minHeight: 44, paddingHorizontal: 17 },
  deleteButtonText: { color: "#FFFFFF", fontFamily: type.semi, fontSize: 12 },
  disabled: { opacity: 0.56 },
  pressed: { opacity: 0.75 },
});

const electric = StyleSheet.create({ addButton: { alignItems: "center", backgroundColor: "#C9F72D", borderRadius: 12, justifyContent: "center", minHeight: 38, paddingHorizontal: 13 }, addText: { color: "#172108", fontFamily: type.semi, fontSize: 12 } });

const revamp = StyleSheet.create({ filters: { marginTop: 16 }, filterSelected: { backgroundColor: "#C9F72D", borderColor: "#C9F72D" }, filterTextSelected: { color: "#172108" } });
