import { router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Pill, PrimaryButton, SecondaryButton, ServiceBadge } from "@/components/subscription-ui";
import { getService } from "@/lib/catalog";
import { ScreenContainer } from "@/components/screen-container";

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const service = getService(id);
  if (!service) return <ScreenContainer className="p-5"><Text style={styles.missing}>This catalog service could not be found.</Text></ScreenContainer>;

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.nav}><Pressable onPress={() => router.back()} hitSlop={8}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.navTitle}>Service details</Text><View style={{ width: 24 }} /></View>
        <View style={styles.hero}><ServiceBadge serviceId={service.id} size="large" /><View style={styles.heroCopy}><Pill label={service.category} tone="teal" /><Text style={styles.title}>{service.name}</Text><Text style={styles.description}>{service.description}</Text></View></View>
        <View style={styles.notice}><Text style={styles.noticeTitle}>Reference information</Text><Text style={styles.noticeBody}>Plan details are a guide. Check the official website for your country before purchasing or changing a plan.</Text></View>
        <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Plan options</Text><Pressable onPress={() => router.push(`/compare/${service.id}`)}><Text style={styles.compareLink}>Compare all</Text></Pressable></View>
        <View style={styles.planList}>{service.plans.map((plan) => <View key={plan.id} style={styles.planCard}><View style={styles.planTop}><View><Text style={styles.planName}>{plan.name}</Text><Text style={styles.planSummary}>{plan.summary}</Text></View><Text style={styles.price}>{plan.priceLabel}</Text></View><View style={styles.featureRow}>{plan.features.slice(0, 3).map((feature) => <View key={feature} style={styles.feature}><Text style={styles.featureDot}>•</Text><Text style={styles.featureText}>{feature}</Text></View>)}</View></View>)}</View>
        <SecondaryButton label="Compare plans" onPress={() => router.push(`/compare/${service.id}`)} />
        <PrimaryButton label="Add to my subscriptions" onPress={() => router.push(`/subscription/edit?serviceId=${service.id}` as never)} />
        <Pressable onPress={() => Alert.alert("Official management", service.managementHint)}><Text style={styles.managementHint}>Already subscribed? We’ll guide you to the official management page after you add the subscription.</Text></Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 30, gap: 16 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { color: "#10253F", fontSize: 34, lineHeight: 34, fontWeight: "300" },
  navTitle: { color: "#10253F", fontSize: 14, fontWeight: "800" },
  hero: { flexDirection: "row", gap: 15, alignItems: "flex-start", paddingTop: 10 },
  heroCopy: { flex: 1 },
  title: { color: "#10253F", fontSize: 25, fontWeight: "800", letterSpacing: -0.7, marginTop: 9 },
  description: { color: "#667085", fontSize: 13, lineHeight: 19, marginTop: 5 },
  notice: { backgroundColor: "#FFF4DF", borderRadius: 16, padding: 14 },
  noticeTitle: { color: "#9B650E", fontSize: 12, fontWeight: "900" },
  noticeBody: { color: "#806128", fontSize: 12, lineHeight: 17, marginTop: 4 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 3 },
  sectionTitle: { color: "#10253F", fontSize: 17, fontWeight: "800" },
  compareLink: { color: "#0E9F8A", fontSize: 13, fontWeight: "800" },
  planList: { gap: 10 },
  planCard: { borderWidth: 1, borderColor: "#E6ECF2", borderRadius: 18, padding: 15, backgroundColor: "#FFFFFF" },
  planTop: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  planName: { color: "#10253F", fontSize: 15, fontWeight: "800" },
  planSummary: { color: "#667085", fontSize: 12, lineHeight: 17, marginTop: 4, maxWidth: 210 },
  price: { color: "#087B6C", fontSize: 11, lineHeight: 16, textAlign: "right", fontWeight: "800", maxWidth: 95 },
  featureRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 13 },
  feature: { flexDirection: "row", gap: 4, alignItems: "center", backgroundColor: "#F2F6F9", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 5 },
  featureDot: { color: "#0E9F8A", fontSize: 12, fontWeight: "900" },
  featureText: { color: "#526476", fontSize: 10, fontWeight: "700" },
  managementHint: { color: "#667085", fontSize: 12, lineHeight: 17, textAlign: "center", marginTop: -5 },
  missing: { color: "#667085", fontSize: 15 },
});
