import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useMemo, useState } from "react";

import { Pill, ServiceBadge } from "@/components/subscription-ui";
import { categoryOrder, services } from "@/lib/catalog";
import { ScreenContainer } from "@/components/screen-container";

export default function DiscoverScreen() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof categoryOrder)[number]>("All");
  const filtered = useMemo(() => services.filter((service) => {
    const matchesCategory = category === "All" || service.category === category;
    const value = `${service.name} ${service.category} ${service.description}`.toLowerCase();
    return matchesCategory && value.includes(query.trim().toLowerCase());
  }), [category, query]);

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <Text style={styles.eyebrow}>CATALOG</Text>
            <Text style={styles.title}>Discover subscriptions</Text>
            <Text style={styles.subtitle}>Explore popular services, compare plan options, then record your actual subscription.</Text>
            <View style={styles.searchBox}><Text style={styles.searchIcon}>⌕</Text><TextInput value={query} onChangeText={setQuery} placeholder="Search services" placeholderTextColor="#98A3B3" style={styles.searchInput} /></View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={categoryOrder as unknown as string[]}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.chips}
              renderItem={({ item }) => {
                const selected = category === item;
                return <Pressable onPress={() => setCategory(item as (typeof categoryOrder)[number])} style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}><Text style={[styles.chipText, selected && styles.chipTextSelected]}>{item}</Text></Pressable>;
              }}
            />
            <View style={styles.catalogHeader}><Text style={styles.catalogTitle}>{category === "All" ? "Popular services" : category}</Text><Text style={styles.count}>{filtered.length} services</Text></View>
          </>
        }
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>No services found</Text><Text style={styles.emptyBody}>Try a different service name or category.</Text></View>}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/service/${item.id}`)} style={({ pressed }) => [styles.serviceCard, pressed && styles.pressed]}>
            <ServiceBadge serviceId={item.id} size="large" />
            <View style={styles.serviceCopy}>
              <Text style={styles.serviceName}>{item.name}</Text>
              <Text style={styles.serviceDescription} numberOfLines={2}>{item.description}</Text>
              <View style={styles.serviceFoot}><Pill label={item.category} tone="neutral" /><Text style={styles.planCount}>{item.plans.length} plan options</Text></View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 14, paddingBottom: 26 },
  eyebrow: { color: "#0E9F8A", fontSize: 11, fontWeight: "900", letterSpacing: 1.7 },
  title: { color: "#10253F", fontSize: 27, fontWeight: "800", letterSpacing: -0.8, marginTop: 4 },
  subtitle: { color: "#667085", fontSize: 13, lineHeight: 19, marginTop: 7, marginBottom: 18 },
  searchBox: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DDE4EC", height: 50, borderRadius: 15, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 8 },
  searchIcon: { color: "#667085", fontSize: 24, lineHeight: 25 },
  searchInput: { flex: 1, color: "#10253F", fontSize: 15, fontWeight: "600", height: "100%" },
  chips: { paddingVertical: 16, gap: 8 },
  chip: { paddingVertical: 9, paddingHorizontal: 13, borderRadius: 999, backgroundColor: "#EAF0F5" },
  chipSelected: { backgroundColor: "#10253F" },
  chipText: { color: "#526476", fontSize: 12, fontWeight: "800" },
  chipTextSelected: { color: "#FFFFFF" },
  catalogHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 },
  catalogTitle: { color: "#10253F", fontSize: 17, fontWeight: "800" },
  count: { color: "#667085", fontSize: 12, fontWeight: "600" },
  serviceCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 14, flexDirection: "row", gap: 13, alignItems: "center", borderWidth: 1, borderColor: "#E6ECF2" },
  serviceCopy: { flex: 1, minWidth: 0 },
  serviceName: { color: "#10253F", fontSize: 16, fontWeight: "800" },
  serviceDescription: { color: "#667085", fontSize: 12, lineHeight: 17, marginTop: 4 },
  serviceFoot: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 9 },
  planCount: { color: "#667085", fontSize: 11, fontWeight: "700" },
  chevron: { color: "#98A3B3", fontSize: 28, fontWeight: "300" },
  empty: { padding: 30, alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 18 },
  emptyTitle: { color: "#10253F", fontSize: 16, fontWeight: "800" },
  emptyBody: { color: "#667085", marginTop: 5, fontSize: 13 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
});
