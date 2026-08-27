import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { catalogPriceInboxBaseline, getCatalogInboxSummary, type CatalogPriceInboxItem } from "@/lib/catalog-price-inbox";
import { ScreenContainer } from "@/components/screen-container";
import { useSubscriptions } from "@/lib/subscription-store";

const type = { regular: "Poppins-Regular", semi: "Poppins-SemiBold", bold: "Poppins-Bold" };

function statusCopy(status: CatalogPriceInboxItem["status"]) {
  if (status === "reviewable-india-source") return "India source available";
  if (status === "context-required") return "India context required";
  return "Manual source review";
}

export default function CatalogUpdatesScreen() {
  const { catalogCorrectionRequests } = useSubscriptions();
  const summary = getCatalogInboxSummary(catalogCorrectionRequests);
  return <ScreenContainer className="px-5" containerClassName="bg-background" edges={["top", "bottom", "left", "right"]}>
    <FlatList
      data={catalogPriceInboxBaseline}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      ListHeaderComponent={<View><View style={styles.nav}><Pressable accessibilityLabel="Go back" onPress={() => router.back()} hitSlop={10}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.navTitle}>Catalog updates</Text><View style={styles.navSpacer} /></View><Text style={styles.title}>India price reference inbox</Text><Text style={styles.subtitle}>A weekly official-source research report is scheduled for Monday at 9:00 AM IST. It proposes references for review; it never changes your subscriptions or catalog automatically.</Text><View style={styles.summary}><View style={styles.summaryItem}><Text style={styles.summaryNumber}>{summary.reviewableSourceCount}</Text><Text style={styles.summaryLabel}>sources ready for review</Text></View><View style={styles.summaryItem}><Text style={styles.summaryNumber}>{summary.contextRequiredCount}</Text><Text style={styles.summaryLabel}>need India context</Text></View><View style={styles.summaryItem}><Text style={styles.summaryNumber}>{summary.localCorrectionCount}</Text><Text style={styles.summaryLabel}>local correction drafts</Text></View></View><Pressable accessibilityRole="button" onPress={() => router.push("/catalog-correction" as never)} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}><Text style={styles.primaryText}>Report a catalog correction</Text></Pressable><Text style={styles.section}>Source baseline</Text></View>}
      renderItem={({ item }) => <View style={styles.card}><View style={styles.cardTop}><Text style={styles.service}>{item.serviceName}</Text><Text style={[styles.status, item.status === "reviewable-india-source" ? styles.statusReady : item.status === "context-required" ? styles.statusContext : styles.statusManual]}>{statusCopy(item.status)}</Text></View><Text style={styles.detail}>{item.detail}</Text><Pressable accessibilityRole="link" accessibilityLabel={`Open ${item.sourceLabel}`} onPress={() => void WebBrowser.openBrowserAsync(item.sourceUrl, { controlsColor: "#C9F72D", showTitle: true })} style={({ pressed }) => [styles.sourceLink, pressed && styles.pressed]}><Text style={styles.sourceLinkText}>Review {item.sourceLabel} ↗</Text></Pressable></View>}
      ListFooterComponent={<View style={styles.footer}><Text style={styles.footerTitle}>Why prices stay review-only</Text><Text style={styles.footerBody}>Country, tax, store, carrier, account, promotion, family, student, and legacy-plan conditions can change what a person pays. The inbox records that context rather than converting or guessing a price.</Text></View>}
    />
  </ScreenContainer>;
}

const styles = StyleSheet.create({ content: { gap: 10, paddingBottom: 30, paddingTop: 10 }, nav: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, back: { color: "#F4F2E8", fontFamily: type.regular, fontSize: 34, lineHeight: 34 }, navTitle: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 13 }, navSpacer: { width: 24 }, title: { color: "#F4F2E8", fontFamily: type.bold, fontSize: 25, letterSpacing: -0.7, marginTop: 8 }, subtitle: { color: "#A8AD98", fontFamily: type.regular, fontSize: 11, lineHeight: 17, marginTop: 5 }, summary: { backgroundColor: "#202713", borderColor: "#485632", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 6, marginTop: 12, padding: 12 }, summaryItem: { flex: 1 }, summaryNumber: { color: "#C9F72D", fontFamily: type.bold, fontSize: 21 }, summaryLabel: { color: "#C5CBB8", fontFamily: type.regular, fontSize: 9, lineHeight: 13, marginTop: 2 }, primary: { alignItems: "center", backgroundColor: "#C9F72D", borderRadius: 12, marginTop: 10, minHeight: 46, justifyContent: "center", paddingHorizontal: 14 }, primaryText: { color: "#172108", fontFamily: type.semi, fontSize: 12 }, section: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 15, marginTop: 14 }, card: { backgroundColor: "#191E0F", borderColor: "#343A25", borderRadius: 13, borderWidth: 1, padding: 13 }, cardTop: { alignItems: "flex-start", flexDirection: "row", gap: 8, justifyContent: "space-between" }, service: { color: "#F4F2E8", flex: 1, fontFamily: type.semi, fontSize: 13 }, status: { borderRadius: 8, fontFamily: type.semi, fontSize: 8, overflow: "hidden", paddingHorizontal: 7, paddingVertical: 4 }, statusReady: { backgroundColor: "#34410F", color: "#DFFF7C" }, statusContext: { backgroundColor: "#3D3520", color: "#FFCF9B" }, statusManual: { backgroundColor: "#31362B", color: "#D7D9D0" }, detail: { color: "#A8AD98", fontFamily: type.regular, fontSize: 10, lineHeight: 15, marginTop: 8 }, sourceLink: { alignSelf: "flex-start", marginTop: 10, minHeight: 26, justifyContent: "center" }, sourceLinkText: { color: "#C9F72D", fontFamily: type.semi, fontSize: 10 }, footer: { backgroundColor: "#202713", borderColor: "#485632", borderRadius: 13, borderWidth: 1, marginTop: 4, padding: 13 }, footerTitle: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 12 }, footerBody: { color: "#C5CBB8", fontFamily: type.regular, fontSize: 10, lineHeight: 15, marginTop: 5 }, pressed: { opacity: 0.75 } });
