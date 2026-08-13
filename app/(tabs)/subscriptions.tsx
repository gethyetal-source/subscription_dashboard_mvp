import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useMemo, useState } from "react";

import { EmptyState, SubscriptionRow } from "@/components/subscription-ui";
import { useSubscriptions } from "@/lib/subscription-store";
import type { SubscriptionStatus } from "@/lib/subscription-types";
import { ScreenContainer } from "@/components/screen-container";

const filters: Array<{ label: string; value: "all" | SubscriptionStatus }> = [
  { label: "All", value: "all" }, { label: "Active", value: "active" }, { label: "Trials", value: "trial" }, { label: "Cancelled", value: "cancelled" },
];

export default function SubscriptionsScreen() {
  const { subscriptions } = useSubscriptions();
  const [filter, setFilter] = useState<"all" | SubscriptionStatus>("all");
  const filtered = useMemo(() => filter === "all" ? subscriptions : subscriptions.filter((item) => item.status === filter), [filter, subscriptions]);

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<>
          <View style={styles.header}><View><Text style={styles.eyebrow}>YOUR LIST</Text><Text style={styles.title}>My subscriptions</Text></View><Pressable onPress={() => router.push("/(tabs)/discover")} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}><Text style={styles.addText}>+ Add</Text></Pressable></View>
          <View style={styles.filterRow}>{filters.map((item) => <Pressable key={item.value} onPress={() => setFilter(item.value)} style={({ pressed }) => [styles.filter, filter === item.value && styles.filterSelected, pressed && styles.pressed]}><Text style={[styles.filterText, filter === item.value && styles.filterTextSelected]}>{item.label}</Text></Pressable>)}</View>
        </>}
        ListEmptyComponent={<EmptyState title="Your list is ready" body="Discover a service to start tracking its price, renewal date, and billing source." />}
        renderItem={({ item }) => <SubscriptionRow item={item} onPress={() => router.push(`/subscription/${item.id}` as never)} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 14, paddingBottom: 28 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  eyebrow: { color: "#0E9F8A", fontSize: 11, fontWeight: "900", letterSpacing: 1.7 },
  title: { color: "#10253F", fontSize: 27, fontWeight: "800", letterSpacing: -0.8, marginTop: 4 },
  addButton: { backgroundColor: "#10253F", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 13 },
  addText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  filterRow: { flexDirection: "row", gap: 7, flexWrap: "wrap", marginBottom: 16 },
  filter: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, backgroundColor: "#EAF0F5" },
  filterSelected: { backgroundColor: "#DDF6EE" },
  filterText: { color: "#667085", fontSize: 12, fontWeight: "800" },
  filterTextSelected: { color: "#087B6C" },
  pressed: { opacity: 0.72 },
});
