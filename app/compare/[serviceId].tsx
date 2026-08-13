import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { PrimaryButton, ServiceBadge } from "@/components/subscription-ui";
import { getService } from "@/lib/catalog";
import { ScreenContainer } from "@/components/screen-container";

export default function ComparePlansScreen() {
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const service = getService(serviceId);
  if (!service) return <ScreenContainer className="p-5"><Text>Service not found.</Text></ScreenContainer>;

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.nav}><Pressable onPress={() => router.back()} hitSlop={8}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.navTitle}>Compare plans</Text><View style={{ width: 24 }} /></View>
        <View style={styles.heading}><ServiceBadge serviceId={service.id} /><View><Text style={styles.title}>{service.name}</Text><Text style={styles.subtitle}>Indicative plan differences</Text></View></View>
        <View style={styles.warning}><Text style={styles.warningText}>Prices and eligibility vary by country. Confirm current terms on the official provider page.</Text></View>
        <View style={styles.matrix}>{service.plans.map((plan, index) => <View key={plan.id} style={[styles.plan, index === 1 && styles.planFeatured]}><Text style={styles.planKicker}>{index === 1 ? "COMMON CHOICE" : "PLAN"}</Text><Text style={styles.planName}>{plan.name}</Text><Text style={styles.price}>{plan.priceLabel}</Text><Text style={styles.cadence}>{plan.cadence === "yearly" ? "Billed yearly" : "Billing varies by plan"}</Text><View style={styles.line} />{plan.features.map((feature) => <View key={feature} style={styles.feature}><Text style={styles.check}>✓</Text><Text style={styles.featureText}>{feature}</Text></View>)}</View>)}</View>
        <PrimaryButton label="Add my actual subscription" onPress={() => router.push(`/subscription/edit?serviceId=${service.id}` as never)} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 30, gap: 16 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { color: "#10253F", fontSize: 34, lineHeight: 34, fontWeight: "300" },
  navTitle: { color: "#10253F", fontSize: 14, fontWeight: "800" },
  heading: { flexDirection: "row", gap: 12, alignItems: "center", paddingTop: 10 },
  title: { color: "#10253F", fontSize: 24, fontWeight: "800", letterSpacing: -0.7 },
  subtitle: { color: "#667085", fontSize: 12, marginTop: 3, fontWeight: "600" },
  warning: { backgroundColor: "#FFF4DF", borderRadius: 15, padding: 13 },
  warningText: { color: "#806128", fontSize: 12, lineHeight: 17, fontWeight: "600" },
  matrix: { gap: 10 },
  plan: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E6ECF2", borderRadius: 18, padding: 16 },
  planFeatured: { borderColor: "#73CDBE", borderWidth: 2, backgroundColor: "#F6FEFC" },
  planKicker: { color: "#0E9F8A", fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  planName: { color: "#10253F", fontSize: 18, fontWeight: "800", marginTop: 5 },
  price: { color: "#087B6C", fontSize: 14, fontWeight: "800", marginTop: 9 },
  cadence: { color: "#667085", fontSize: 11, fontWeight: "600", marginTop: 3 },
  line: { height: 1, backgroundColor: "#E6ECF2", marginVertical: 13 },
  feature: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  check: { color: "#0E9F8A", fontSize: 13, fontWeight: "900" },
  featureText: { color: "#425466", fontSize: 13, fontWeight: "600" },
});
