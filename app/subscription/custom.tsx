import { router } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useState } from "react";

import { DatePickerSheet } from "@/components/date-picker-sheet";
import { PrimaryButton } from "@/components/subscription-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useSubscriptions } from "@/lib/subscription-store";
import type { BillingCadence, BillingSource } from "@/lib/subscription-types";
import { isFutureDate, nextLocalDateKey } from "@/lib/subscription-utils";

const type = { regular: "Poppins-Regular", semi: "Poppins-SemiBold", bold: "Poppins-Bold" };
const cadences: BillingCadence[] = ["weekly", "monthly", "quarterly", "yearly"];
const sources: BillingSource[] = ["provider", "apple", "google", "carrier", "reseller", "unknown"];

export default function CustomSubscriptionScreen() {
  const { addSubscription } = useSubscriptions();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [cadence, setCadence] = useState<BillingCadence>("monthly");
  const [renewalDate, setRenewalDate] = useState("");
  const [billingSource, setBillingSource] = useState<BillingSource>("provider");
  const [dateOpen, setDateOpen] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    const value = Number.parseFloat(amount.replace(",", "."));
    if (!name.trim() || !Number.isFinite(value) || value <= 0 || !isFutureDate(renewalDate)) {
      setError("Add a service name, an amount greater than zero, and a renewal date after today.");
      return;
    }
    try {
      const saved = await addSubscription({ serviceId: "custom", planId: "custom", planName: name.trim(), amount: value, currency: currency.trim().toUpperCase() || "USD", cadence, renewalDate, billingSource, status: "active", reminderEnabled: true, notes: "Custom service added locally." });
      router.replace(`/subscription/${saved.id}` as never);
    } catch (saveError) {
      Alert.alert("Could not save", saveError instanceof Error ? saveError.message : "Please try again.");
    }
  };

  return <ScreenContainer className="px-5" containerClassName="bg-background" edges={["top", "bottom", "left", "right"]}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}><View style={styles.nav}><Pressable onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.title}>Add custom service</Text><View style={{ width: 24 }} /></View><Text style={styles.subtitle}>Track any subscription privately, even when it is not in the catalog.</Text><View style={styles.privacy}><Text style={styles.privacyTitle}>Local only</Text><Text style={styles.privacyBody}>No provider login, bank access, inbox access, or cloud account is required.</Text></View><Text style={styles.section}>Service name *</Text><TextInput value={name} onChangeText={setName} placeholder="For example, local gym" placeholderTextColor="#80868B" style={styles.input} /><Text style={styles.section}>Amount and currency *</Text><View style={styles.row}><TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#80868B" style={[styles.input, styles.amount]} /><TextInput value={currency} onChangeText={setCurrency} autoCapitalize="characters" maxLength={3} style={[styles.input, styles.currency]} /></View><Text style={styles.section}>Billing cadence</Text><View style={styles.chips}>{cadences.map((item) => <Pressable key={item} onPress={() => setCadence(item)} style={[styles.chip, cadence === item && styles.selected]}><Text style={[styles.chipText, cadence === item && styles.selectedText]}>{item}</Text></Pressable>)}</View><Text style={styles.section}>Next renewal *</Text><Pressable onPress={() => setDateOpen(true)} style={styles.date}><Text style={renewalDate ? styles.dateText : styles.placeholder}>{renewalDate || "Select date"}</Text><Text style={styles.calendar}>▣</Text></Pressable><Text style={styles.section}>Billing source</Text><View style={styles.chips}>{sources.map((item) => <Pressable key={item} onPress={() => setBillingSource(item)} style={[styles.chip, billingSource === item && styles.selected]}><Text style={[styles.chipText, billingSource === item && styles.selectedText]}>{item}</Text></Pressable>)}</View>{error ? <Text style={styles.error}>{error}</Text> : null}<PrimaryButton label="Add custom subscription" onPress={() => void save()} /></ScrollView><DatePickerSheet visible={dateOpen} value={renewalDate} minDate={nextLocalDateKey()} title="Select renewal date" onClose={() => setDateOpen(false)} onSelect={(date) => { setRenewalDate(date); setDateOpen(false); setError(""); }} /></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { paddingBottom: 30, paddingTop: 10 }, nav: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, back: { color: "#F4F2E8", fontFamily: type.regular, fontSize: 34 }, title: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 14 }, subtitle: { color: "#A8AD98", fontFamily: type.regular, fontSize: 12, lineHeight: 18, marginTop: 8 }, privacy: { backgroundColor: "#202713", borderColor: "#485632", borderRadius: 14, borderWidth: 1, marginTop: 18, padding: 14 }, privacyTitle: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 13 }, privacyBody: { color: "#A8AD98", fontFamily: type.regular, fontSize: 11, lineHeight: 16, marginTop: 3 }, section: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 14, marginBottom: 7, marginTop: 20 }, input: { backgroundColor: "#191E0F", borderColor: "#3A4227", borderRadius: 12, borderWidth: 1, color: "#F4F2E8", fontFamily: type.regular, fontSize: 14, height: 48, paddingHorizontal: 12 }, row: { flexDirection: "row", gap: 8 }, amount: { flex: 1 }, currency: { width: 90 }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, chip: { backgroundColor: "#1D2212", borderColor: "#343A25", borderRadius: 10, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8 }, selected: { backgroundColor: "#C9F72D", borderColor: "#C9F72D" }, chipText: { color: "#C5CBB8", fontFamily: type.semi, fontSize: 10, textTransform: "capitalize" }, selectedText: { color: "#172108" }, date: { alignItems: "center", backgroundColor: "#191E0F", borderColor: "#3A4227", borderRadius: 12, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 48, paddingHorizontal: 12 }, dateText: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 14 }, placeholder: { color: "#727A62", fontFamily: type.regular, fontSize: 14 }, calendar: { color: "#C9F72D", fontFamily: type.semi, fontSize: 15 }, error: { color: "#FF9B8C", fontFamily: type.regular, fontSize: 11, marginVertical: 12 },
});
