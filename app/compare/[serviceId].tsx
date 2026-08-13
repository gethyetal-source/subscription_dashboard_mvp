import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { PrimaryButton, ServiceBadge } from "@/components/subscription-ui";
import { getService } from "@/lib/catalog";
import { ScreenContainer } from "@/components/screen-container";

const type = { regular: "Poppins-Regular", semi: "Poppins-SemiBold", bold: "Poppins-Bold" };

export default function ComparePlansScreen() {
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>(); const service = getService(serviceId);
  if (!service) return <ScreenContainer className="p-5"><Text>Service not found.</Text></ScreenContainer>;
  return <ScreenContainer className="px-5" containerClassName="bg-background"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
    <View style={styles.nav}><Pressable onPress={() => router.back()} hitSlop={10}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.navTitle}>Compare plans</Text><View style={{ width: 26 }} /></View>
    <View style={styles.heading}><ServiceBadge serviceId={service.id} /><View><Text style={styles.title}>{service.name}</Text><Text style={styles.subtitle}>Plan overview</Text></View></View>
    <View style={styles.notice}><Text style={styles.noticeText}>Plans, prices, and eligibility can vary by country. Confirm the official provider terms before changing or buying a plan.</Text></View>
    <View style={styles.plans}>{service.plans.map((plan, index) => <View key={plan.id} style={[styles.plan, index === 1 && styles.featured]}><Text style={styles.kicker}>{index === 1 ? "POPULAR OPTION" : "PLAN"}</Text><Text style={styles.planName}>{plan.name}</Text><Text style={styles.price}>{plan.priceLabel}</Text><Text style={styles.cadence}>{plan.cadence === "yearly" ? "Annual billing" : "Billing depends on the selected plan"}</Text><View style={styles.line} />{plan.features.map((feature) => <View key={feature} style={styles.feature}><Text style={styles.check}>✓</Text><Text style={styles.featureText}>{feature}</Text></View>)}</View>)}</View>
    <PrimaryButton label="Add my actual subscription" onPress={() => router.push(`/subscription/edit?serviceId=${service.id}` as never)} />
  </ScrollView></ScreenContainer>;
}
const styles = StyleSheet.create({ content: { gap: 16, paddingBottom: 30, paddingTop: 12 }, nav: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, back: { color: "#3C4043", fontFamily: type.regular, fontSize: 34, lineHeight: 34 }, navTitle: { color: "#3C4043", fontFamily: type.semi, fontSize: 13 }, heading: { alignItems: "center", flexDirection: "row", gap: 12, paddingTop: 5 }, title: { color: "#202124", fontFamily: type.bold, fontSize: 23, letterSpacing: -0.6 }, subtitle: { color: "#5F6368", fontFamily: type.regular, fontSize: 11, marginTop: 2 }, notice: { backgroundColor: "#F8F9FA", borderColor: "#E8EAED", borderRadius: 14, borderWidth: 1, padding: 13 }, noticeText: { color: "#5F6368", fontFamily: type.regular, fontSize: 11, lineHeight: 16 }, plans: { gap: 10 }, plan: { backgroundColor: "#FFFFFF", borderColor: "#DADCE0", borderRadius: 16, borderWidth: 1, padding: 15 }, featured: { backgroundColor: "#F8FBFF", borderColor: "#AECBFA", borderWidth: 2 }, kicker: { color: "#1A73E8", fontFamily: type.semi, fontSize: 9, letterSpacing: 0.8 }, planName: { color: "#202124", fontFamily: type.semi, fontSize: 17, marginTop: 5 }, price: { color: "#1967D2", fontFamily: type.semi, fontSize: 13, marginTop: 8 }, cadence: { color: "#5F6368", fontFamily: type.regular, fontSize: 10, marginTop: 2 }, line: { backgroundColor: "#E8EAED", height: 1, marginVertical: 12 }, feature: { alignItems: "center", flexDirection: "row", gap: 8, marginBottom: 7 }, check: { color: "#188038", fontFamily: type.bold, fontSize: 12 }, featureText: { color: "#3C4043", fontFamily: type.regular, fontSize: 12 } });
