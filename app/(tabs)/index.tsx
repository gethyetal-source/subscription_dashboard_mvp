import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { EmptyState, Pill, PrimaryButton, SectionLabel, ServiceBadge, SubscriptionRow } from "@/components/subscription-ui";
import { getService } from "@/lib/catalog";
import { useSubscriptions } from "@/lib/subscription-store";
import { formatCurrency, getUpcomingSubscriptions, totalAnnual, totalMonthly } from "@/lib/subscription-utils";
import { ScreenContainer } from "@/components/screen-container";

export default function HomeScreen() {
  const { isReady, subscriptions } = useSubscriptions();
  const upcoming = getUpcomingSubscriptions(subscriptions).slice(0, 3);
  const activeCount = subscriptions.filter((item) => item.status !== "cancelled").length;

  if (!isReady) return <ScreenContainer><View style={styles.loading}><ActivityIndicator color="#0E9F8A" /></View></ScreenContainer>;

  return (
    <ScreenContainer containerClassName="bg-background" className="px-5">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.topbar}>
          <View>
            <Text style={styles.eyebrow}>SUBTRACK</Text>
            <Text style={styles.title}>Your subscriptions, clear.</Text>
          </View>
          <Pressable onPress={() => router.push("/(tabs)/discover")} style={({ pressed }) => [styles.addCircle, pressed && styles.pressed]}>
            <Text style={styles.addGlyph}>+</Text>
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroCardTop}>
            <View>
              <Text style={styles.heroLabel}>ESTIMATED MONTHLY</Text>
              <Text style={styles.heroAmount}>{formatCurrency(totalMonthly(subscriptions))}</Text>
            </View>
            <Pill label={`${activeCount} active`} tone="teal" />
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroFooter}>
            <Text style={styles.heroFooterText}>Estimated annual spend</Text>
            <Text style={styles.heroFooterValue}>{formatCurrency(totalAnnual(subscriptions))}</Text>
          </View>
          <View style={styles.glowOne} /><View style={styles.glowTwo} />
        </View>

        <View style={styles.callout}>
          <View style={styles.calloutDot}><Text style={styles.calloutDotText}>✓</Text></View>
          <View style={styles.calloutCopy}>
            <Text style={styles.calloutTitle}>Your data stays on this device</Text>
            <Text style={styles.calloutBody}>No bank connection, inbox scan, or provider password is required.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <SectionLabel title="Upcoming" action={subscriptions.length ? "View all" : undefined} onAction={() => router.push("/(tabs)/subscriptions")} />
          {upcoming.length ? (
            <View style={styles.listGap}>
              {upcoming.map((item) => <SubscriptionRow key={item.id} item={item} onPress={() => router.push(`/subscription/${item.id}` as never)} />)}
            </View>
          ) : (
            <EmptyState title="Nothing scheduled yet" body="Add a subscription to see renewals, trial deadlines, and your spending estimate." />
          )}
        </View>

        <View style={styles.section}>
          <SectionLabel title="Explore popular services" action="Discover" onAction={() => router.push("/(tabs)/discover")} />
          <View style={styles.quickGrid}>
            {["chatgpt", "netflix", "spotify", "google-one"].map((serviceId) => {
              const service = getService(serviceId)!;
              return (
                <Pressable key={serviceId} onPress={() => router.push(`/service/${serviceId}`)} style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}>
                  <ServiceBadge serviceId={serviceId} size="small" />
                  <Text style={styles.quickName} numberOfLines={1}>{service.name}</Text>
                  <Text style={styles.quickCategory}>{service.category}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {!subscriptions.length ? <PrimaryButton label="Add your first subscription" onPress={() => router.push("/(tabs)/discover")} /> : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingTop: 14, paddingBottom: 28, gap: 22 },
  topbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { color: "#0E9F8A", fontSize: 11, fontWeight: "900", letterSpacing: 1.7 },
  title: { color: "#10253F", fontSize: 25, fontWeight: "800", letterSpacing: -0.7, marginTop: 4 },
  addCircle: { width: 44, height: 44, borderRadius: 16, backgroundColor: "#10253F", justifyContent: "center", alignItems: "center" },
  addGlyph: { color: "#FFFFFF", fontSize: 28, fontWeight: "300", lineHeight: 29 },
  heroCard: { overflow: "hidden", backgroundColor: "#10253F", borderRadius: 24, padding: 21, minHeight: 166 },
  heroCardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", zIndex: 1 },
  heroLabel: { color: "#A7C5D7", fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  heroAmount: { color: "#FFFFFF", fontSize: 36, fontWeight: "800", letterSpacing: -1.2, marginTop: 5 },
  heroDivider: { height: 1, backgroundColor: "#31516E", marginTop: 18, zIndex: 1 },
  heroFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, zIndex: 1 },
  heroFooterText: { color: "#B5CFE0", fontSize: 12, fontWeight: "600" },
  heroFooterValue: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  glowOne: { position: "absolute", height: 160, width: 160, borderRadius: 80, backgroundColor: "#0E9F8A", opacity: 0.22, right: -55, top: -65 },
  glowTwo: { position: "absolute", height: 86, width: 86, borderRadius: 43, backgroundColor: "#E59D2D", opacity: 0.16, right: 48, bottom: -42 },
  callout: { flexDirection: "row", alignItems: "flex-start", gap: 11, padding: 15, backgroundColor: "#EDF7F5", borderRadius: 18 },
  calloutDot: { height: 23, width: 23, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#0E9F8A" },
  calloutDotText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  calloutCopy: { flex: 1 },
  calloutTitle: { color: "#087B6C", fontSize: 13, fontWeight: "800" },
  calloutBody: { color: "#3A6D66", fontSize: 12, lineHeight: 17, marginTop: 3 },
  section: { gap: 2 },
  listGap: { gap: 10 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickCard: { width: "48.5%", backgroundColor: "#FFFFFF", padding: 13, borderRadius: 17, borderWidth: 1, borderColor: "#E6ECF2" },
  quickName: { color: "#10253F", fontSize: 13, fontWeight: "800", marginTop: 9 },
  quickCategory: { color: "#667085", fontSize: 11, fontWeight: "600", marginTop: 3 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
});
