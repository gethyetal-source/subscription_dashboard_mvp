import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useMemo, useState } from "react";

import { Pill, ServiceBadge } from "@/components/subscription-ui";
import { categoryOrder, services } from "@/lib/catalog";
import { ScreenContainer } from "@/components/screen-container";

const type = { regular: "Poppins-Regular", semi: "Poppins-SemiBold", bold: "Poppins-Bold" };

export default function DiscoverScreen() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof categoryOrder)[number]>("All");
  const filtered = useMemo(() => services.filter((service) => (category === "All" || service.category === category) && `${service.name} ${service.category} ${service.description}`.toLowerCase().includes(query.trim().toLowerCase())), [category, query]);
  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <FlatList data={filtered} keyExtractor={(item) => item.id} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
        ListHeaderComponent={<><Text style={styles.title}>Discover</Text><Text style={styles.subtitle}>Find services, compare plan choices, then add what you actually pay.</Text><View style={styles.search}><Text style={styles.searchIcon}>⌕</Text><TextInput value={query} onChangeText={setQuery} placeholder="Search services" placeholderTextColor="#80868B" style={styles.searchInput} /></View><FlatList horizontal showsHorizontalScrollIndicator={false} data={categoryOrder as unknown as string[]} keyExtractor={(item) => item} contentContainerStyle={styles.chips} renderItem={({ item }) => { const selected = category === item; return <Pressable onPress={() => setCategory(item as (typeof categoryOrder)[number])} style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}><Text style={[styles.chipText, selected && styles.chipTextSelected]}>{item}</Text></Pressable>; }} /><View style={styles.catalogRow}><Text style={styles.catalogTitle}>{category === "All" ? "All services" : category}</Text><Text style={styles.count}>{filtered.length} available</Text></View><Pressable onPress={() => router.push("/subscription/custom" as never)} style={({ pressed }) => [styles.customCard, pressed && styles.pressed]}><Text style={styles.customTitle}>Can’t find your service?</Text><Text style={styles.customBody}>Add any subscription manually and keep it local.</Text><Text style={styles.customAction}>Add custom service ›</Text></Pressable></>}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>No matching services</Text><Text style={styles.emptyBody}>Try a broader search or a different category.</Text></View>}
        renderItem={({ item }) => <Pressable onPress={() => router.push(`/service/${item.id}`)} style={({ pressed }) => [styles.serviceCard, pressed && styles.pressed]}><ServiceBadge serviceId={item.id} size="large" /><View style={styles.serviceCopy}><Text style={styles.serviceName}>{item.name}</Text><Text numberOfLines={2} style={styles.serviceDescription}>{item.description}</Text><View style={styles.serviceMeta}><Pill label={item.category} tone="neutral" /><Text style={styles.planCount}>{item.plans.length} plans</Text></View></View><Text style={styles.chevron}>›</Text></Pressable>}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 28, paddingTop: 16 }, title: { color: "#202124", fontFamily: type.bold, fontSize: 27, letterSpacing: -0.8 }, subtitle: { color: "#5F6368", fontFamily: type.regular, fontSize: 12, lineHeight: 18, marginBottom: 18, marginTop: 5 },
  search: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#DADCE0", borderRadius: 24, borderWidth: 1, flexDirection: "row", gap: 8, height: 48, paddingHorizontal: 15 }, searchIcon: { color: "#5F6368", fontFamily: type.regular, fontSize: 24, lineHeight: 24 }, searchInput: { color: "#202124", flex: 1, fontFamily: type.regular, fontSize: 14, height: "100%" },
  chips: { gap: 8, paddingVertical: 16 }, chip: { backgroundColor: "#F1F3F4", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 }, chipSelected: { backgroundColor: "#E8F0FE" }, chipText: { color: "#3C4043", fontFamily: type.semi, fontSize: 11 }, chipTextSelected: { color: "#1967D2" },
  catalogRow: { alignItems: "baseline", flexDirection: "row", justifyContent: "space-between", marginBottom: 11 }, customCard: { backgroundColor: "#E8F0FE", borderRadius: 16, marginBottom: 12, padding: 14 }, customTitle: { color: "#174EA6", fontFamily: type.semi, fontSize: 13 }, customBody: { color: "#3C4043", fontFamily: type.regular, fontSize: 11, marginTop: 3 }, customAction: { color: "#1A73E8", fontFamily: type.semi, fontSize: 11, marginTop: 8 }, catalogTitle: { color: "#202124", fontFamily: type.semi, fontSize: 17 }, count: { color: "#5F6368", fontFamily: type.regular, fontSize: 11 },
  serviceCard: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#DADCE0", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 13, minHeight: 92, padding: 14 }, serviceCopy: { flex: 1, minWidth: 0 }, serviceName: { color: "#202124", fontFamily: type.semi, fontSize: 15 }, serviceDescription: { color: "#5F6368", fontFamily: type.regular, fontSize: 11, lineHeight: 16, marginTop: 3 }, serviceMeta: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 8 }, planCount: { color: "#5F6368", fontFamily: type.regular, fontSize: 10 }, chevron: { color: "#9AA0A6", fontFamily: type.regular, fontSize: 26 },
  empty: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#DADCE0", borderRadius: 16, borderStyle: "dashed", borderWidth: 1, padding: 30 }, emptyTitle: { color: "#202124", fontFamily: type.semi, fontSize: 15 }, emptyBody: { color: "#5F6368", fontFamily: type.regular, fontSize: 12, marginTop: 4 }, pressed: { opacity: 0.75 },
});
