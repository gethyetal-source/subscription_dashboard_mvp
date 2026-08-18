import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMemo, useState } from "react";

import { ElectricPageHeader } from "@/components/electric-page-header";
import { ScreenContainer } from "@/components/screen-container";
import { useThemeContext } from "@/lib/theme-provider";

const FONT = { regular: "Poppins-Regular", medium: "Poppins-Medium", semi: "Poppins-SemiBold", bold: "Poppins-Bold" };

type Plan = {
  id: "plus" | "household" | "referral" | "benefits";
  number: string;
  title: string;
  label: string;
  summary: string;
  revenue: string;
  value: string[];
  guardrail: string;
};

const plans: Plan[] = [
  {
    id: "plus",
    number: "01",
    title: "Free core + Plus",
    label: "Recommended first test",
    summary: "Keep manual tracking, renewal dates, and local storage free. Offer a paid Plus tier for people who want deeper control.",
    revenue: "Illustrative price: $3.99/month or $34.99/year.",
    value: ["Unlimited history and renewal insights", "Flexible reminder rules and calendar controls", "Private export formats and plan-change watchlists"],
    guardrail: "The core tracker remains useful without a paid plan; no advertising or data sale is required.",
  },
  {
    id: "household",
    number: "02",
    title: "Household membership",
    label: "Natural expansion",
    summary: "Build on the existing shared-plan view with a household tier for people who track spending together.",
    revenue: "Illustrative price: $6.99/month or $59.99/year per household.",
    value: ["Shared-plan allocations and household summaries", "Optional encrypted backup and multi-device restore", "A simple renewal review for a household coordinator"],
    guardrail: "Keep sharing opt-in. Local-only household tracking stays available to people who prefer it.",
  },
  {
    id: "referral",
    number: "03",
    title: "Transparent referrals",
    label: "Supplementary revenue",
    summary: "Earn a clearly disclosed fee only when a user chooses an eligible provider offer or partner destination.",
    revenue: "Revenue is paid per qualifying referral, not for personal data.",
    value: ["A separate, clearly labelled offers area", "Unbiased plan comparison remains available", "Provider options ranked by relevance, never by hidden payment"],
    guardrail: "Never place a sponsored result in cancellation or renewal-critical flows, and always label paid placements.",
  },
  {
    id: "benefits",
    number: "04",
    title: "Benefits licenses",
    label: "Business channel",
    summary: "Offer an optional wellness benefit to employers, communities, or financial-coaching programmes.",
    revenue: "Organisation pays for access; individual records remain private.",
    value: ["Co-branded access without account-data sharing", "Aggregate, consented adoption reporting only", "Support materials for financial-wellness programmes"],
    guardrail: "Do not expose an individual’s subscriptions, spending, or renewal decisions to the organisation.",
  },
];

export default function MonetizationScreen() {
  const { colorScheme } = useThemeContext();
  const isDark = colorScheme === "dark";
  const styles = useMemo(() => makeStyles(isDark), [isDark]);
  const [expandedPlan, setExpandedPlan] = useState<Plan["id"] | null>("plus");

  return (
    <ScreenContainer containerClassName="bg-background" style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ElectricPageHeader title="Membership possibilities" subtitle="Ways SubTrack could grow without selling your personal data." />

        <View style={styles.noteCard}>
          <Text style={styles.noteEyebrow}>STRATEGY NOTE</Text>
          <Text style={styles.noteTitle}>Start with a paid layer, not a paywall.</Text>
          <Text style={styles.noteBody}>The strongest first model is a useful free tracker paired with a lightweight Plus membership. The example prices below are discussion points, not live offers.</Text>
        </View>

        <View style={styles.sectionHeader}>
          <View><Text style={styles.sectionEyebrow}>POSSIBLE MODELS</Text><Text style={styles.sectionTitle}>Four revenue paths</Text></View>
          <Text style={styles.sectionMeta}>Tap to expand</Text>
        </View>

        <View style={styles.planList}>
          {plans.map((plan) => {
            const selected = expandedPlan === plan.id;
            return (
              <Pressable
                key={plan.id}
                accessibilityRole="button"
                accessibilityLabel={`${plan.title} monetization plan`}
                accessibilityHint={selected ? "Collapse plan details" : "Expand plan details"}
                accessibilityState={{ expanded: selected }}
                onPress={() => setExpandedPlan(selected ? null : plan.id)}
                style={({ pressed }) => [styles.planCard, selected && styles.planCardSelected, pressed && styles.pressed]}
              >
                <View style={styles.planTopline}>
                  <Text style={[styles.planNumber, selected && styles.planNumberSelected]}>{plan.number}</Text>
                  <View style={[styles.planTag, selected && styles.planTagSelected]}><Text style={[styles.planTagText, selected && styles.planTagTextSelected]}>{plan.label}</Text></View>
                  <Text style={styles.planChevron}>{selected ? "−" : "+"}</Text>
                </View>
                <Text style={styles.planTitle}>{plan.title}</Text>
                <Text style={styles.planSummary}>{plan.summary}</Text>
                {selected && <View style={styles.expandedContent}>
                  <View style={styles.revenueRow}><Text style={styles.detailLabel}>REVENUE</Text><Text style={styles.revenueText}>{plan.revenue}</Text></View>
                  <View style={styles.valueList}><Text style={styles.detailLabel}>MEMBER VALUE</Text>{plan.value.map((item) => <View key={item} style={styles.valueRow}><View style={styles.valueDot} /><Text style={styles.valueText}>{item}</Text></View>)}</View>
                  <View style={styles.guardrail}><Text style={styles.guardrailLabel}>NON-NEGOTIABLE</Text><Text style={styles.guardrailText}>{plan.guardrail}</Text></View>
                </View>}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.rollout}>
          <Text style={styles.sectionEyebrow}>SENSIBLE SEQUENCE</Text>
          <Text style={styles.sectionTitle}>Test value before adding complexity</Text>
          <View style={styles.rolloutSteps}>
            <View style={styles.step}><Text style={styles.stepNumber}>1</Text><View style={styles.stepCopy}><Text style={styles.stepTitle}>Validate Plus</Text><Text style={styles.stepBody}>Invite active users to try a simple paid tier and learn which controls matter most.</Text></View></View>
            <View style={styles.step}><Text style={styles.stepNumber}>2</Text><View style={styles.stepCopy}><Text style={styles.stepTitle}>Expand carefully</Text><Text style={styles.stepBody}>Add household and backup benefits only after privacy expectations and support needs are clear.</Text></View></View>
            <View style={styles.step}><Text style={styles.stepNumber}>3</Text><View style={styles.stepCopy}><Text style={styles.stepTitle}>Add business channels</Text><Text style={styles.stepBody}>Pilot transparent referrals or benefits licenses without compromising the neutral tracker.</Text></View></View>
          </View>
        </View>

        <View style={styles.pledge}><Text style={styles.pledgeTitle}>Privacy pledge</Text><Text style={styles.pledgeBody}>SubTrack should never sell subscription records, read a bank account or inbox by default, or make a paid offer harder to cancel. Any paid relationship should be clear, optional, and reversible.</Text></View>
      </ScrollView>
    </ScreenContainer>
  );
}

function makeStyles(isDark: boolean) {
  const palette = isDark
    ? { canvas: "#12160B", surface: "#191E0F", raised: "#202713", text: "#F4F2E8", muted: "#A8AD98", quiet: "#727A62", border: "#343A25", accent: "#C9F72D", soft: "#28301B", pressed: 0.76 }
    : { canvas: "#F4F3EB", surface: "#FFFEF8", raised: "#EAEADE", text: "#20241A", muted: "#65695B", quiet: "#858979", border: "#D9D9CC", accent: "#4A6510", soft: "#E5EDD2", pressed: 0.72 };

  return StyleSheet.create({
    screen: { backgroundColor: palette.canvas },
    content: { paddingBottom: 36, paddingHorizontal: 20, paddingTop: 16 },
    noteCard: { backgroundColor: palette.raised, borderColor: palette.border, borderRadius: 18, borderWidth: 1, marginTop: 20, padding: 17 },
    noteEyebrow: { color: palette.accent, fontFamily: FONT.semi, fontSize: 9, letterSpacing: 1.2 },
    noteTitle: { color: palette.text, fontFamily: FONT.bold, fontSize: 19, letterSpacing: -0.45, lineHeight: 26, marginTop: 6 },
    noteBody: { color: palette.muted, fontFamily: FONT.regular, fontSize: 11, lineHeight: 17, marginTop: 7 },
    sectionHeader: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between", marginTop: 28, paddingBottom: 12 },
    sectionEyebrow: { color: palette.quiet, fontFamily: FONT.semi, fontSize: 9, letterSpacing: 1.15 },
    sectionTitle: { color: palette.text, fontFamily: FONT.semi, fontSize: 17, letterSpacing: -0.3, marginTop: 4 },
    sectionMeta: { color: palette.muted, fontFamily: FONT.regular, fontSize: 10, paddingBottom: 2 },
    planList: { gap: 10 },
    planCard: { backgroundColor: palette.surface, borderColor: palette.border, borderRadius: 16, borderWidth: 1, overflow: "hidden", padding: 15 },
    planCardSelected: { borderColor: palette.accent },
    planTopline: { alignItems: "center", flexDirection: "row" },
    planNumber: { color: palette.quiet, fontFamily: FONT.bold, fontSize: 11, letterSpacing: 0.5, width: 31 },
    planNumberSelected: { color: palette.accent },
    planTag: { backgroundColor: palette.raised, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4 },
    planTagSelected: { backgroundColor: palette.soft },
    planTagText: { color: palette.muted, fontFamily: FONT.semi, fontSize: 9 },
    planTagTextSelected: { color: palette.accent },
    planChevron: { color: palette.accent, fontFamily: FONT.regular, fontSize: 21, lineHeight: 21, marginLeft: "auto" },
    planTitle: { color: palette.text, fontFamily: FONT.semi, fontSize: 15, marginTop: 12 },
    planSummary: { color: palette.muted, fontFamily: FONT.regular, fontSize: 11, lineHeight: 16, marginTop: 5 },
    expandedContent: { borderTopColor: palette.border, borderTopWidth: 1, gap: 14, marginTop: 15, paddingTop: 15 },
    revenueRow: { gap: 5 },
    detailLabel: { color: palette.quiet, fontFamily: FONT.semi, fontSize: 8, letterSpacing: 1.05 },
    revenueText: { color: palette.text, fontFamily: FONT.medium, fontSize: 11, lineHeight: 16 },
    valueList: { gap: 7 },
    valueRow: { alignItems: "flex-start", flexDirection: "row", gap: 8 },
    valueDot: { backgroundColor: palette.accent, borderRadius: 3, height: 5, marginTop: 6, width: 5 },
    valueText: { color: palette.muted, flex: 1, fontFamily: FONT.regular, fontSize: 10, lineHeight: 15 },
    guardrail: { backgroundColor: palette.soft, borderRadius: 12, padding: 11 },
    guardrailLabel: { color: palette.accent, fontFamily: FONT.semi, fontSize: 8, letterSpacing: 1.05 },
    guardrailText: { color: palette.text, fontFamily: FONT.medium, fontSize: 10, lineHeight: 15, marginTop: 4 },
    rollout: { borderTopColor: palette.border, borderTopWidth: 1, marginTop: 28, paddingTop: 21 },
    rolloutSteps: { gap: 16, marginTop: 15 },
    step: { alignItems: "flex-start", flexDirection: "row", gap: 11 },
    stepNumber: { alignItems: "center", backgroundColor: palette.soft, borderRadius: 12, color: palette.accent, fontFamily: FONT.bold, fontSize: 11, lineHeight: 24, textAlign: "center", width: 24 },
    stepCopy: { flex: 1, paddingTop: 2 },
    stepTitle: { color: palette.text, fontFamily: FONT.semi, fontSize: 12 },
    stepBody: { color: palette.muted, fontFamily: FONT.regular, fontSize: 10, lineHeight: 15, marginTop: 3 },
    pledge: { backgroundColor: palette.raised, borderColor: palette.border, borderRadius: 16, borderWidth: 1, marginTop: 28, padding: 16 },
    pledgeTitle: { color: palette.accent, fontFamily: FONT.semi, fontSize: 12 },
    pledgeBody: { color: palette.muted, fontFamily: FONT.regular, fontSize: 10, lineHeight: 16, marginTop: 5 },
    pressed: { opacity: palette.pressed, transform: [{ scale: 0.99 }] },
  });
}
