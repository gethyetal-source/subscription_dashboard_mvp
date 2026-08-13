import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useMemo, useState } from "react";

import { EmptyState, SubscriptionRow } from "@/components/subscription-ui";
import { useSubscriptions } from "@/lib/subscription-store";
import type { SubscriptionStatus } from "@/lib/subscription-types";
import { ScreenContainer } from "@/components/screen-container";

const filters: Array<{ label: string; value: "all" | SubscriptionStatus }> = [{ label: "All", value: "all" }, { label: "Active", value: "active" }, { label: "Trials", value: "trial" }, { label: "Cancelled", value: "cancelled" }];
const type = { regular: "Poppins-Regular", semi: "Poppins-SemiBold", bold: "Poppins-Bold" };

export default function SubscriptionsScreen() {
  const { subscriptions } = useSubscriptions(); const [filter, setFilter] = useState<"all" | SubscriptionStatus>("all");
  const filtered = useMemo(() => filter === "all" ? subscriptions : subscriptions.filter((item) => item.status === filter), [filter, subscriptions]);
  return <ScreenContainer className="px-5" containerClassName="bg-background"><FlatList data={filtered} keyExtractor={(item) => item.id} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
    ListHeaderComponent={<><View style={styles.header}><View><Text style={styles.title}>Subscriptions</Text><Text style={styles.subtitle}>Everything you track, in one place.</Text></View><Pressable onPress={() => router.push("/(tabs)/discover")} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}><Text style={styles.addText}>Add</Text></Pressable></View><View style={styles.filters}>{filters.map((item) => <Pressable key={item.value} onPress={() => setFilter(item.value)} style={({ pressed }) => [styles.filter, filter === item.value && styles.filterSelected, pressed && styles.pressed]}><Text style={[styles.filterText, filter === item.value && styles.filterTextSelected]}>{item.label}</Text></Pressable>)}</View></>}
    ListEmptyComponent={<EmptyState title="No subscriptions here" body="Explore the catalog to add a plan, price, renewal date, and billing source." />}
    renderItem={({ item }) => <SubscriptionRow item={item} onPress={() => router.push(`/subscription/${item.id}` as never)} />} ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
  /></ScreenContainer>;
}
const styles = StyleSheet.create({ content: { paddingBottom: 28, paddingTop: 16 }, header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 17 }, title: { color: "#202124", fontFamily: type.bold, fontSize: 27, letterSpacing: -0.8 }, subtitle: { color: "#5F6368", fontFamily: type.regular, fontSize: 12, marginTop: 3 }, addButton: { backgroundColor: "#1A73E8", borderRadius: 22, paddingHorizontal: 17, paddingVertical: 11 }, addText: { color: "#FFFFFF", fontFamily: type.semi, fontSize: 12 }, filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }, filter: { backgroundColor: "#F1F3F4", borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8 }, filterSelected: { backgroundColor: "#E8F0FE" }, filterText: { color: "#3C4043", fontFamily: type.semi, fontSize: 11 }, filterTextSelected: { color: "#1967D2" }, pressed: { opacity: 0.75 } });
