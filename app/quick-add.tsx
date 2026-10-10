import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { FinanceLink, FinancePage, SearchField, SectionHeading, Surface, financeType } from "@/components/finance-ui";
import { ServiceBadge } from "@/components/subscription-ui";
import { SubscriptionForm, type SubscriptionPrefill } from "@/components/subscription-form";
import { getService, services } from "@/lib/catalog";
import { usePalette } from "@/lib/ui-theme";

const popularIds = ["netflix", "spotify", "youtube-premium", "chatgpt", "disney-plus", "prime-video"];

export default function AddSubscriptionScreen() {
  const colors = usePalette();
  const params = useLocalSearchParams<SubscriptionPrefill>();
  const [selected, setSelected] = useState<SubscriptionPrefill | null>(params.name || params.serviceId ? params : null);
  const [query, setQuery] = useState("");
  const matching = query.trim() ? services.filter((service) => service.name.toLowerCase().includes(query.trim().toLowerCase())) : popularIds.flatMap((id) => { const service = getService(id); return service ? [service] : []; });
  if (selected) return <SubscriptionForm key={`${selected.serviceId}-${selected.name}`} prefill={selected} onChangeService={() => setSelected(null)} />;
  return <FinancePage title="Add subscription">
    <SearchField label="Find your service" placeholder="Search Netflix, Spotify, and more" value={query} onChange={setQuery} />
    <View style={{ gap: 12 }}>
      <SectionHeading title={query ? "Matching services" : "Popular services"} />
      <Surface>
        {matching.length ? matching.map((service) => <Pressable key={service.id} accessibilityRole="button" accessibilityLabel={`Add ${service.name}`} onPress={() => setSelected({ serviceId: service.id, name: service.name })}
          style={({ pressed }) => ({ minHeight: 56, flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 5, opacity: pressed ? 0.7 : 1 })}>
          <ServiceBadge serviceId={service.id} />
          <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: colors.foreground, fontFamily: financeType.medium, fontSize: 14 }}>{service.name}</Text><Text style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 11, marginTop: 3 }}>{service.category}</Text></View>
          <Ionicons name="chevron-forward" size={17} color={colors.muted} />
        </Pressable>) : <Text style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 13 }}>No service found. Add it with your own name below.</Text>}
      </Surface>
    </View>
    <View>
      <FinanceLink icon="add-circle-outline" title={query ? `Add “${query.trim()}” manually` : "Add a different service"} detail="Use any name and your actual price" onPress={() => setSelected({ serviceId: "custom", name: query.trim() })} />
      <FinanceLink icon="scan-outline" title="Import a receipt or CSV" detail="Review the details before adding" onPress={() => router.push("/import")} />
      <FinanceLink icon="compass-outline" title="Browse all services & plans" onPress={() => router.push("/(tabs)/discover")} />
    </View>
  </FinancePage>;
}
