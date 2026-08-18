import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useMemo, useState } from "react";

import { Pill, ServiceBadge } from "@/components/subscription-ui";
import { categoryOrder, services } from "@/lib/catalog";
import { ScreenContainer } from "@/components/screen-container";
import { ElectricPageHeader } from "@/components/electric-page-header";
import { useThemeContext } from "@/lib/theme-provider";

const type = { regular: "Poppins-Regular", semi: "Poppins-SemiBold", bold: "Poppins-Bold" };

export default function DiscoverScreen() {
  const { colorScheme } = useThemeContext();
  const headingTheme = colorScheme === "dark" ? electric.dark : electric.light;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof categoryOrder)[number]>("All");
  const filtered = useMemo(() => services.filter((service) => (category === "All" || service.category === category) && `${service.name} ${service.category} ${service.description}`.toLowerCase().includes(query.trim().toLowerCase())), [category, query]);
  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <FlatList data={filtered} keyExtractor={(item) => item.id} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
        ListHeaderComponent={<><ElectricPageHeader title="Discover" subtitle="Find services, compare plan choices, then add what you actually pay." /><View style={[styles.search, revamp.search]}><Text style={styles.searchIcon}>⌕</Text><TextInput value={query} onChangeText={setQuery} placeholder="Search services" placeholderTextColor="#80868B" returnKeyType="search" style={styles.searchInput} /></View><FlatList horizontal showsHorizontalScrollIndicator={false} data={categoryOrder as unknown as string[]} keyExtractor={(item) => item} contentContainerStyle={styles.chips} renderItem={({ item }) => { const selected = category === item; return <Pressable onPress={() => setCategory(item as (typeof categoryOrder)[number])} style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}><Text style={[styles.chipText, selected && styles.chipTextSelected]}>{item}</Text></Pressable>; }} /><View style={styles.catalogRow}><Text style={[styles.catalogTitle, headingTheme.catalogTitle]}>{category === "All" ? "All services" : category}</Text><Text style={[styles.count, headingTheme.count]}>{filtered.length} available</Text></View><Pressable onPress={() => router.push("/subscription/custom" as never)} style={({ pressed }) => [styles.customCard, revamp.customCard, pressed && styles.pressed]}><Text style={[styles.customTitle, revamp.customTitle]}>Can’t find your service?</Text><Text style={[styles.customBody, revamp.customBody]}>Add any subscription manually and keep it local.</Text><Text style={[styles.customAction, revamp.customAction]}>Add custom service <Text style={revamp.arrow}>›</Text></Text></Pressable></>}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>No matching services</Text><Text style={styles.emptyBody}>Try a broader search or a different category.</Text></View>}
        renderItem={({ item }) => <Pressable onPress={() => router.push(`/service/${item.id}`)} style={({ pressed }) => [styles.serviceCard, revamp.serviceCard, pressed && styles.pressed]}><ServiceBadge serviceId={item.id} size="large" /><View style={styles.serviceCopy}><Text style={styles.serviceName}>{item.name}</Text><Text numberOfLines={2} style={styles.serviceDescription}>{item.description}</Text><View style={styles.serviceMeta}><Pill label={item.category} tone="neutral" /><Text style={styles.planCount}>{item.plans.length} plans</Text></View></View><Text style={[styles.chevron, revamp.chevron]}>›</Text></Pressable>}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 28, paddingTop: 16 }, title: { color: "#F4F2E8", fontFamily: type.bold, fontSize: 27, letterSpacing: -0.8 }, subtitle: { color: "#A8AD98", fontFamily: type.regular, fontSize: 12, lineHeight: 18, marginBottom: 18, marginTop: 5 },
  search: { alignItems: "center", backgroundColor: "#191E0F", borderColor: "#3A4227", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 8, height: 48, paddingHorizontal: 15 }, searchIcon: { color: "#A8AD98", fontFamily: type.regular, fontSize: 24, lineHeight: 24 }, searchInput: { color: "#F4F2E8", flex: 1, fontFamily: type.regular, fontSize: 14, height: "100%" },
  chips: { gap: 8, paddingVertical: 16 }, chip: { backgroundColor: "#1D2212", borderColor: "#343A25", borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 }, chipSelected: { backgroundColor: "#C9F72D", borderColor: "#C9F72D" }, chipText: { color: "#C5CBB8", fontFamily: type.semi, fontSize: 11 }, chipTextSelected: { color: "#172108" },
  catalogRow: { alignItems: "baseline", flexDirection: "row", justifyContent: "space-between", marginBottom: 11 }, customCard: { backgroundColor: "#1D2411", borderRadius: 14, marginBottom: 12, padding: 15 }, customTitle: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 13 }, customBody: { color: "#A8AD98", fontFamily: type.regular, fontSize: 11, marginTop: 3 }, customAction: { color: "#C9F72D", fontFamily: type.semi, fontSize: 11, marginTop: 8 }, catalogTitle: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 17 }, count: { color: "#A8AD98", fontFamily: type.regular, fontSize: 11 },
  serviceCard: { alignItems: "center", backgroundColor: "#191E0F", borderColor: "#343A25", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 13, minHeight: 92, padding: 14 }, serviceCopy: { flex: 1, minWidth: 0 }, serviceName: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 15 }, serviceDescription: { color: "#A8AD98", fontFamily: type.regular, fontSize: 11, lineHeight: 16, marginTop: 3 }, serviceMeta: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 8 }, planCount: { color: "#89917A", fontFamily: type.regular, fontSize: 10 }, chevron: { color: "#C9F72D", fontFamily: type.regular, fontSize: 26 },
  empty: { alignItems: "center", backgroundColor: "#191E0F", borderColor: "#3A4227", borderRadius: 14, borderStyle: "dashed", borderWidth: 1, padding: 30 }, emptyTitle: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 15 }, emptyBody: { color: "#A8AD98", fontFamily: type.regular, fontSize: 12, marginTop: 4 }, pressed: { opacity: 0.75 },
});

const electric = { light: { catalogTitle: { color: "#293015" }, count: { color: "#65695B" } }, dark: { catalogTitle: { color: "#F4F2E8" }, count: { color: "#A8AD98" } } };

const revamp = StyleSheet.create({ search: { marginTop: 14 }, customCard: { borderColor: "#485632", borderWidth: 1 }, customTitle: { color: "#F4F2E8" }, customBody: { color: "#A8AD98" }, customAction: { color: "#C9F72D", marginTop: 10 }, arrow: { color: "#C9F72D", fontFamily: type.bold, fontSize: 18 }, serviceCard: { shadowColor: "#000000", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 10 }, chevron: { color: "#C9F72D" } });
