import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useMemo, useState } from "react";
import { Copy } from "@/components/app-ui";
import { FinanceHeader, FinanceLink, SearchField, financeType } from "@/components/finance-ui";
import { ServiceBadge } from "@/components/subscription-ui";
import { categoryOrder, services } from "@/lib/catalog";
import { ScreenContainer } from "@/components/screen-container";
import { usePalette } from "@/lib/ui-theme";

export default function BrowseServicesScreen() {
  const colors = usePalette();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof categoryOrder)[number]>("All");
  const filtered = useMemo(() => services.filter((service) => (category === "All" || service.category === category) && `${service.name} ${service.category}`.toLowerCase().includes(query.trim().toLowerCase())), [category, query]);
  return <ScreenContainer edges={["top", "bottom", "left", "right"]}>
    <FlatList data={filtered} keyExtractor={(item) => item.id} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 22, paddingBottom: 32 }}
      ListHeaderComponent={<View style={{ gap: 18, marginBottom: 16 }}>
        <FinanceHeader title="Browse services" back />
        <SearchField value={query} onChange={setQuery} label="Search services" placeholder="Search services" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {categoryOrder.map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: category === item }} onPress={() => setCategory(item)} style={({ pressed }) => ({ minHeight: 44, justifyContent: "center", paddingHorizontal: 13, borderRadius: 11, backgroundColor: category === item ? colors.primary : colors.elevated, opacity: pressed ? 0.7 : 1 })}><Text style={{ color: category === item ? colors.onPrimary : colors.foreground, fontFamily: financeType.medium, fontSize: 12 }}>{item}</Text></Pressable>)}
        </ScrollView>
        <Text style={{ color: colors.muted, fontFamily: financeType.medium, fontSize: 11 }}>{filtered.length} services · reference plan information</Text>
      </View>}
      ListEmptyComponent={<Copy muted>No matching services. Try another name or category.</Copy>}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`View ${item.name} plans`} onPress={() => router.push(`/service/${item.id}`)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 15, borderBottomColor: colors.border, borderBottomWidth: 1, opacity: pressed ? 0.7 : 1 })}>
        <ServiceBadge serviceId={item.id} />
        <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: colors.foreground, fontFamily: financeType.medium, fontSize: 14 }}>{item.name}</Text><Text style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 11, marginTop: 3 }}>{item.category} · {item.plans.length} plans</Text></View>
        <Ionicons name="chevron-forward" size={17} color={colors.muted} />
      </Pressable>}
      ListFooterComponent={<View style={{ paddingTop: 18 }}><FinanceLink icon="add-circle-outline" title="Add a different service" detail="Track any subscription by name" onPress={() => router.push({ pathname: "/quick-add", params: { serviceId: "custom", name: query.trim() } })} /></View>}
    />
  </ScreenContainer>;
}
