import { router } from "expo-router";
import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useSubscriptions } from "@/lib/subscription-store";
import { getSubscriptionControlIssues, type SubscriptionControlIssue, type SubscriptionControlIssueKind } from "@/lib/subscription-utils";

const type = { regular: "Poppins-Regular", semi: "Poppins-SemiBold", bold: "Poppins-Bold" };

const issueTone: Record<SubscriptionControlIssueKind, { glyph: string; color: string; background: string }> = {
  "cancellation-follow-up": { glyph: "!", color: "#FF9B8C", background: "#36221C" },
  "possible-duplicate": { glyph: "=", color: "#F4D56E", background: "#363019" },
  "category-overlap": { glyph: "≈", color: "#F4D56E", background: "#363019" },
  "annual-renewal": { glyph: "$", color: "#F4D56E", background: "#363019" },
  "trial-deadline": { glyph: "!", color: "#F4D56E", background: "#363019" },
  "renewal-setting": { glyph: "↻", color: "#C9F72D", background: "#2A3511" },
  "billing-identity": { glyph: "#", color: "#C9F72D", background: "#2A3511" },
  "billing-source": { glyph: "?", color: "#C9F72D", background: "#2A3511" },
  "uncertain-status": { glyph: "?", color: "#C9F72D", background: "#2A3511" },
};

function IssueRow({ issue }: { issue: SubscriptionControlIssue }) {
  const tone = issueTone[issue.kind];
  const firstSubscription = issue.subscriptionIds[0];
  return <Pressable accessibilityRole="button" accessibilityLabel={`Review: ${issue.title}`} onPress={() => firstSubscription && router.push(`/subscription/${firstSubscription}` as never)} style={({ pressed }) => [styles.issue, pressed && styles.pressed]}>
    <View style={[styles.issueGlyph, { backgroundColor: tone.background }]}><Text style={[styles.issueGlyphText, { color: tone.color }]}>{tone.glyph}</Text></View>
    <View style={styles.issueCopy}><Text style={styles.issueTitle}>{issue.title}</Text><Text style={styles.issueBody}>{issue.body}</Text><Text style={styles.issueAction}>Review record ›</Text></View>
  </Pressable>;
}

export default function ControlCenterScreen() {
  const { isReady, subscriptions } = useSubscriptions();
  const issues = useMemo(() => getSubscriptionControlIssues(subscriptions), [subscriptions]);
  const activeCount = subscriptions.filter((item) => item.status !== "cancelled").length;
  const header = <View style={styles.header}>
    <View style={styles.nav}><Pressable onPress={() => router.back()} hitSlop={10} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.eyebrow}>SUBTRACK / CONTROL</Text><View style={styles.navSpacer} /></View>
    <Text style={styles.title}>Stay in control of recurring charges.</Text>
    <Text style={styles.subtitle}>Local checks for the records you add. No bank access, inbox scanning, or provider-password access.</Text>
    <View style={styles.summary}><View><Text style={styles.summaryValue}>{activeCount}</Text><Text style={styles.summaryLabel}>ACTIVE RECORDS</Text></View><View style={styles.summaryDivider} /><View><Text style={styles.summaryValue}>{issues.length}</Text><Text style={styles.summaryLabel}>LOCAL CHECKS</Text></View></View>
    <View style={styles.privacy}><Text style={styles.privacyMark}>✓</Text><View style={styles.privacyCopy}><Text style={styles.privacyTitle}>You verify; SubTrack remembers.</Text><Text style={styles.privacyBody}>Use statement labels, official billing pages, and confirmation receipts. Your records stay on this device.</Text></View></View>
    {issues.length ? <Text style={styles.sectionLabel}>REVIEW IN ORDER</Text> : null}
  </View>;
  if (!isReady) return <ScreenContainer className="px-5" containerClassName="bg-background"><View style={styles.loading}><Text style={styles.loadingText}>Preparing local control checks…</Text></View></ScreenContainer>;
  return <ScreenContainer className="px-5" containerClassName="bg-background" edges={["top", "bottom", "left", "right"]}><FlatList data={issues} keyExtractor={(item) => item.id} renderItem={({ item }) => <IssueRow issue={item} />} ListHeaderComponent={header} ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>{subscriptions.length ? "Everything is recorded" : "Nothing to inspect yet"}</Text><Text style={styles.emptyBody}>{subscriptions.length ? "Your saved records have no local follow-up checks right now." : "Add a subscription first, then record its billing source, renewal setting, and any cancellation follow-up."}</Text>{subscriptions.length ? null : <Pressable onPress={() => router.push("/(tabs)/discover" as never)} style={({ pressed }) => [styles.emptyButton, pressed && styles.pressed]}><Text style={styles.emptyButtonText}>Browse services</Text></Pressable>}</View>} ListFooterComponent={issues.length ? <Text style={styles.footer}>A check is a reminder to review your own record. It is not a claim that a provider has charged you incorrectly.</Text> : null} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} /></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { gap: 10, paddingBottom: 28, paddingTop: 8 }, loading: { alignItems: "center", flex: 1, justifyContent: "center" }, loadingText: { color: "#A8AD98", fontFamily: type.regular, fontSize: 12 }, header: { gap: 10, paddingBottom: 8 }, nav: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, backButton: { alignItems: "center", height: 28, justifyContent: "center", width: 28 }, back: { color: "#F4F2E8", fontFamily: type.regular, fontSize: 34, lineHeight: 34 }, eyebrow: { color: "#C9F72D", fontFamily: type.semi, fontSize: 9, letterSpacing: 1.2 }, navSpacer: { width: 28 }, title: { color: "#F4F2E8", fontFamily: type.bold, fontSize: 28, letterSpacing: -1, lineHeight: 34, maxWidth: 310, marginTop: 8 }, subtitle: { color: "#A8AD98", fontFamily: type.regular, fontSize: 12, lineHeight: 18, maxWidth: 340 }, summary: { alignItems: "center", backgroundColor: "#191E0F", borderColor: "#343A25", borderRadius: 14, borderWidth: 1, flexDirection: "row", marginTop: 4, padding: 15 }, summaryDivider: { backgroundColor: "#343A25", height: 28, marginHorizontal: 20, width: 1 }, summaryValue: { color: "#C9F72D", fontFamily: type.bold, fontSize: 24, letterSpacing: -0.6 }, summaryLabel: { color: "#A8AD98", fontFamily: type.semi, fontSize: 8, letterSpacing: 0.7, marginTop: 2 }, privacy: { alignItems: "flex-start", backgroundColor: "#202713", borderColor: "#485632", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 10, padding: 13 }, privacyMark: { color: "#C9F72D", fontFamily: type.bold, fontSize: 14, lineHeight: 18 }, privacyCopy: { flex: 1 }, privacyTitle: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 12 }, privacyBody: { color: "#A8AD98", fontFamily: type.regular, fontSize: 10, lineHeight: 15, marginTop: 3 }, sectionLabel: { color: "#89917A", fontFamily: type.semi, fontSize: 9, letterSpacing: 1, marginTop: 10 }, issue: { alignItems: "flex-start", backgroundColor: "#191E0F", borderColor: "#343A25", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 11, padding: 13 }, issueGlyph: { alignItems: "center", borderRadius: 11, height: 26, justifyContent: "center", width: 26 }, issueGlyphText: { fontFamily: type.bold, fontSize: 14 }, issueCopy: { flex: 1 }, issueTitle: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 13, lineHeight: 18 }, issueBody: { color: "#A8AD98", fontFamily: type.regular, fontSize: 10, lineHeight: 15, marginTop: 3 }, issueAction: { color: "#C9F72D", fontFamily: type.semi, fontSize: 10, marginTop: 8 }, empty: { alignItems: "flex-start", backgroundColor: "#191E0F", borderColor: "#343A25", borderRadius: 14, borderWidth: 1, marginTop: 6, padding: 18 }, emptyTitle: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 15 }, emptyBody: { color: "#A8AD98", fontFamily: type.regular, fontSize: 11, lineHeight: 17, marginTop: 6 }, emptyButton: { backgroundColor: "#C9F72D", borderRadius: 10, marginTop: 14, paddingHorizontal: 14, paddingVertical: 10 }, emptyButtonText: { color: "#172108", fontFamily: type.semi, fontSize: 11 }, footer: { color: "#89917A", fontFamily: type.regular, fontSize: 10, lineHeight: 15, paddingHorizontal: 8, paddingTop: 10, textAlign: "center" }, pressed: { opacity: 0.72 } });
