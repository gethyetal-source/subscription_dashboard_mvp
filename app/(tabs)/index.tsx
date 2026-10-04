import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useMemo } from "react";
import { router } from "expo-router";

import { EmptyState, ServiceBadge } from "@/components/subscription-ui";
import { ScreenContainer } from "@/components/screen-container";
import { getService } from "@/lib/catalog";
import { useSubscriptions } from "@/lib/subscription-store";
import { formatRelativeRenewal, getSpendSummary } from "@/lib/subscription-utils";
import { useMoneyFormatter } from "@/lib/privacy";
import { Button } from "@/components/app-ui";
import type { SubscriptionRecord } from "@/lib/subscription-types";
import { useThemeContext } from "@/lib/theme-provider";

const FONT = {
  regular: "Poppins-Regular",
  medium: "Poppins-Medium",
  semi: "Poppins-SemiBold",
  bold: "Poppins-Bold",
};

const dayLabel = (dateString: string) => {
  const date = new Date(`${dateString}T12:00:00`);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(undefined, { day: "numeric" }).format(date);
};

function CommandHeader({
  isDark,
  nextAction,
  onReview,
  onAdd,
}: {
  isDark: boolean;
  nextAction?: SubscriptionRecord;
  onReview: () => void;
  onAdd: () => void;
}) {
  const formatCurrency = useMoneyFormatter();
  const styles = useMemo(() => makeStyles(isDark), [isDark]);
  const service = nextAction ? getService(nextAction.serviceId) : undefined;
  const actionTitle = nextAction?.status === "trial" ? "Your trial needs a decision" : "Your next charge is approaching";
  const actionDetail = nextAction?.status === "trial" ? "Review before the trial converts to a paid plan." : nextAction ? `${formatRelativeRenewal(nextAction.renewalDate)} · ${formatCurrency(nextAction.amount, nextAction.currency)}` : "Add a subscription to begin tracking renewal dates.";

  return <View style={styles.headerBlock}>
    <View style={styles.topLine}>
      <View>
        <Text style={styles.eyebrow}>SUBTRACK / TODAY</Text>
        <Text style={styles.headline}>{nextAction ? actionTitle : "A calmer view of what you pay for."}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Add a subscription" onPress={onAdd} style={({ pressed }) => [styles.addControl, pressed && styles.pressed]}>
        <Text style={styles.addControlText}>+</Text>
      </Pressable>
    </View>
    <Pressable accessibilityRole="button" disabled={!nextAction} onPress={onReview} style={({ pressed }) => [styles.actionCard, !nextAction && styles.actionCardInactive, pressed && nextAction && styles.pressed]}>
      <View style={styles.actionRule} />
      {nextAction ? <ServiceBadge serviceId={nextAction.serviceId} /> : <View style={styles.placeholderMark}><Text style={styles.placeholderMarkText}>+</Text></View>}
      <View style={styles.actionCopy}>
        <Text style={styles.actionKicker}>{nextAction?.status === "trial" ? "TRIAL CHECK" : "NEXT UP"}</Text>
        <Text numberOfLines={1} style={styles.actionService}>{service?.name ?? "Start tracking"}</Text>
        <Text numberOfLines={2} style={styles.actionDetail}>{actionDetail}</Text>
      </View>
      {nextAction ? <View style={styles.reviewButton}><Text style={styles.reviewButtonText}>Review</Text></View> : <View style={styles.reviewButton}><Text style={styles.reviewButtonText}>Add</Text></View>}
    </Pressable>
  </View>;
}

function ChargeStrip({ items, isDark }: { items: SubscriptionRecord[]; isDark: boolean }) {
  const formatCurrency = useMoneyFormatter();
  const styles = useMemo(() => makeStyles(isDark), [isDark]);
  return <View style={styles.runRateBlock}>
    <View style={styles.sectionHeadingRow}>
      <View><Text style={styles.sectionKicker}>THIS MONTH</Text><Text style={styles.sectionHeading}>Scheduled charges</Text></View>
      <Text style={styles.sectionMeta}>{items.length ? `${items.length} ahead` : "No dates yet"}</Text>
    </View>
    <FlatList
      data={items}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.chargeStrip}
      renderItem={({ item, index }) => {
        const service = getService(item.serviceId);
        return <Pressable accessibilityRole="button" onPress={() => router.push(`/subscription/${item.id}` as never)} style={({ pressed }) => [styles.chargeToken, index === 0 && styles.chargeTokenFirst, pressed && styles.pressed]}>
          <Text style={styles.chargeDay}>{dayLabel(item.renewalDate)}</Text>
          <View style={styles.chargeDot} />
          <Text numberOfLines={1} style={styles.chargeName}>{service?.name ?? item.planName}</Text>
          <Text style={styles.chargeAmount}>{formatCurrency(item.amount, item.currency)}</Text>
        </Pressable>;
      }}
      ListEmptyComponent={<Text style={styles.emptyChargeText}>Your upcoming renewals will appear here.</Text>}
    />
  </View>;
}

function SubscriptionLedgerRow({ item, isDark }: { item: SubscriptionRecord; isDark: boolean }) {
  const formatCurrency = useMoneyFormatter();
  const styles = useMemo(() => makeStyles(isDark), [isDark]);
  const service = getService(item.serviceId);
  const urgency = item.status === "trial" ? styles.urgencyTrial : item.status === "uncertain" ? styles.urgencyMuted : styles.urgencyActive;
  return <Pressable accessibilityRole="button" onPress={() => router.push(`/subscription/${item.id}` as never)} style={({ pressed }) => [styles.ledgerRow, pressed && styles.pressed]}>
    <View style={[styles.urgencyRail, urgency]} />
    <ServiceBadge serviceId={item.serviceId} />
    <View style={styles.ledgerCopy}>
      <Text numberOfLines={1} style={styles.ledgerName}>{service?.name ?? item.planName}</Text>
      <Text numberOfLines={1} style={styles.ledgerMeta}>{item.planName} · {formatRelativeRenewal(item.renewalDate)}</Text>
    </View>
    <View style={styles.ledgerValue}><Text style={styles.ledgerAmount}>{formatCurrency(item.amount, item.currency)}</Text><Text style={styles.ledgerCadence}>{item.cadence === "yearly" ? "yearly" : "monthly"}</Text></View>
  </Pressable>;
}

export default function HomeScreen() {
  const formatCurrency = useMoneyFormatter();
  const formatCurrencySpendGroups = (groups: { monthly: number; currency: string }[]) => groups.map((group) => formatCurrency(group.monthly, group.currency)).join(" · ");
  const { isReady, subscriptions, settings } = useSubscriptions();
  const { colorScheme } = useThemeContext();
  const isDark = colorScheme === "dark";
  const styles = useMemo(() => makeStyles(isDark), [isDark]);
  const activeSubscriptions = useMemo(() => subscriptions.filter((item) => item.status !== "cancelled").sort((a, b) => a.renewalDate.localeCompare(b.renewalDate)), [subscriptions]);
  const spend = useMemo(() => getSpendSummary(subscriptions), [subscriptions]);
  const nextAction = activeSubscriptions.find((item) => item.status === "trial") ?? activeSubscriptions[0];
  const ledgerItems = activeSubscriptions.slice(0, 5);
  const chargeStripItems = activeSubscriptions.slice(0, 6);
  const budgetDelta = settings.monthlyBudget && !spend.hasMixedCurrencies && (settings.budgetCurrency ?? "USD") === spend.currency ? settings.monthlyBudget - spend.monthly : undefined;

  if (!isReady) return <ScreenContainer><View style={styles.loading}><ActivityIndicator color={styles.loadingIndicator.color as string} /></View></ScreenContainer>;

  return <ScreenContainer containerClassName="bg-background" style={styles.screen}>
    <FlatList
      data={ledgerItems}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      renderItem={({ item }) => <SubscriptionLedgerRow item={item} isDark={isDark} />}
      ListHeaderComponent={<>
        <CommandHeader isDark={isDark} nextAction={nextAction} onReview={() => router.push("/renewals" as never)} onAdd={() => router.push("/quick-add" as never)} />
        <View style={{ gap: 8, marginBottom: 16 }}><Button label="Renewal action center" secondary onPress={() => router.push("/renewals" as never)} /><Button label="Spending, value & savings" secondary onPress={() => router.push("/insights" as never)} /></View>
        <View style={styles.monthOverview}>
          <View><Text style={styles.overviewKicker}>{spend.hasMixedCurrencies ? "MONTHLY RUN RATE BY CURRENCY" : "MONTHLY RUN RATE"}</Text><Text style={styles.runRate}>{spend.hasMixedCurrencies ? formatCurrencySpendGroups(spend.currencyGroups) : formatCurrency(spend.monthly, spend.currency)}</Text></View>
          <View style={styles.annualBlock}><Text style={styles.annualLabel}>{spend.hasMixedCurrencies ? "Not converted" : "Annual cost"}</Text><Text style={styles.annualValue}>{spend.hasMixedCurrencies ? "Review per currency" : formatCurrency(spend.annual, spend.currency)}</Text></View>
        </View>
        {spend.hasMixedCurrencies ? <Text style={styles.currencyGuard}>Currencies are kept separate. SubTrack does not use exchange rates or combine unlike currencies.</Text> : null}
        <ChargeStrip items={chargeStripItems} isDark={isDark} />
        <View style={styles.contextCard}>
          <View style={styles.contextIcon}><Text style={styles.contextIconText}>{budgetDelta === undefined ? "◎" : budgetDelta >= 0 ? "↓" : "!"}</Text></View>
          <View style={styles.contextCopy}><Text style={styles.contextTitle}>{spend.hasMixedCurrencies ? "Budget comparison is paused" : budgetDelta === undefined ? "Give your spending a reference point" : budgetDelta >= 0 ? `${formatCurrency(budgetDelta, spend.currency)} below your monthly budget` : `${formatCurrency(Math.abs(budgetDelta), spend.currency)} over your monthly budget`}</Text><Text style={styles.contextBody}>{spend.hasMixedCurrencies ? "Choose one currency for budget comparison, or review each saved currency separately." : budgetDelta === undefined ? "Set a monthly budget to put each renewal in context." : `${spend.activeCount} active subscriptions are included.`}</Text></View>
          <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/settings")} style={({ pressed }) => [styles.contextLink, pressed && styles.pressed]}><Text style={styles.contextLinkText}>{spend.hasMixedCurrencies ? "Review" : budgetDelta === undefined ? "Set" : "View"}</Text></Pressable>
        </View>
        <View style={styles.ledgerHeading}><View><Text style={styles.sectionKicker}>YOUR LIBRARY</Text><Text style={styles.sectionHeading}>Subscriptions</Text></View><Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/subscriptions")} style={({ pressed }) => [styles.manageLink, pressed && styles.pressed]}><Text style={styles.manageLinkText}>Manage all</Text></Pressable></View>
      </>}
      ListEmptyComponent={<EmptyState title="Nothing to manage yet" body="Add a service to see its next renewal, monthly run rate, and a direct official-management handoff." />}
      ListFooterComponent={<View style={styles.footerBlock}><View style={styles.privacyRow}><Text style={styles.privacyMark}>◇</Text><Text style={styles.privacyText}>Local by default. No bank, inbox, or provider access.</Text></View><Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/discover")} style={({ pressed }) => [styles.discoverButton, pressed && styles.pressed]}><Text style={styles.discoverButtonText}>Explore services</Text><Text style={styles.discoverArrow}>→</Text></Pressable></View>}
      ListFooterComponentStyle={styles.listFooter}
    />
  </ScreenContainer>;
}

function makeStyles(isDark: boolean) {
  const palette = isDark ? {
    canvas: "#12160B", surface: "#191E0F", surfaceRaised: "#202713", text: "#F4F2E8", muted: "#A8AD98", quiet: "#727A62", border: "#343A25", rail: "#3F482C", accent: "#C9F72D", alert: "#FF8A7A", good: "#92D172", softAccent: "#28301B", softAlert: "#452422", pressed: 0.76,
  } : {
    canvas: "#F4F3EB", surface: "#FFFEF8", surfaceRaised: "#EAEADE", text: "#20241A", muted: "#65695B", quiet: "#858979", border: "#D9D9CC", rail: "#C7C8B9", accent: "#4A6510", alert: "#B53A33", good: "#397A44", softAccent: "#E5EDD2", softAlert: "#FBEDE8", pressed: 0.72,
  };
  return StyleSheet.create({
    screen: { backgroundColor: palette.canvas },
    loading: { alignItems: "center", backgroundColor: palette.canvas, flex: 1, justifyContent: "center" },
    loadingIndicator: { color: palette.accent },
    content: { paddingBottom: 34, paddingHorizontal: 20, paddingTop: 18 },
    headerBlock: { gap: 18, paddingBottom: 26 },
    topLine: { alignItems: "flex-start", flexDirection: "row", gap: 16, justifyContent: "space-between" },
    eyebrow: { color: palette.accent, fontFamily: FONT.semi, fontSize: 10, letterSpacing: 1.4 },
    headline: { color: palette.text, fontFamily: FONT.bold, fontSize: 27, letterSpacing: -0.9, lineHeight: 35, marginTop: 6, maxWidth: 272 },
    addControl: { alignItems: "center", borderColor: palette.border, borderRadius: 24, borderWidth: 1, height: 46, justifyContent: "center", width: 46 },
    addControlText: { color: palette.text, fontFamily: FONT.regular, fontSize: 28, lineHeight: 30 },
    actionCard: { alignItems: "center", backgroundColor: palette.surface, borderColor: palette.alert, borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 12, minHeight: 110, overflow: "hidden", paddingHorizontal: 14, paddingVertical: 16 },
    actionCardInactive: { borderColor: palette.border },
    actionRule: { alignSelf: "stretch", backgroundColor: palette.alert, borderRadius: 2, width: 3 },
    placeholderMark: { alignItems: "center", backgroundColor: palette.softAccent, borderRadius: 15, height: 46, justifyContent: "center", width: 46 },
    placeholderMarkText: { color: palette.accent, fontFamily: FONT.medium, fontSize: 24 },
    actionCopy: { flex: 1, minWidth: 0 },
    actionKicker: { color: palette.alert, fontFamily: FONT.semi, fontSize: 9, letterSpacing: 1.15 },
    actionService: { color: palette.text, fontFamily: FONT.semi, fontSize: 15, marginTop: 4 },
    actionDetail: { color: palette.muted, fontFamily: FONT.regular, fontSize: 11, lineHeight: 16, marginTop: 4 },
    reviewButton: { alignItems: "center", borderColor: palette.alert, borderRadius: 13, borderWidth: 1, minHeight: 38, justifyContent: "center", paddingHorizontal: 12 },
    reviewButtonText: { color: palette.alert, fontFamily: FONT.semi, fontSize: 11 },
    monthOverview: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between", paddingBottom: 20 },
    overviewKicker: { color: palette.quiet, fontFamily: FONT.semi, fontSize: 9, letterSpacing: 1.2 },
    runRate: { color: palette.text, fontFamily: FONT.bold, fontSize: 39, letterSpacing: -1.8, marginTop: 3 },
    currencyGuard: { color: palette.muted, fontFamily: FONT.regular, fontSize: 10, lineHeight: 15, marginTop: -10, paddingBottom: 10 },
    annualBlock: { alignItems: "flex-end", paddingBottom: 5 },
    annualLabel: { color: palette.quiet, fontFamily: FONT.regular, fontSize: 10 },
    annualValue: { color: palette.text, fontFamily: FONT.semi, fontSize: 13, marginTop: 3 },
    runRateBlock: { borderBottomColor: palette.border, borderBottomWidth: 1, borderTopColor: palette.border, borderTopWidth: 1, paddingVertical: 17 },
    sectionHeadingRow: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
    sectionKicker: { color: palette.quiet, fontFamily: FONT.semi, fontSize: 9, letterSpacing: 1.15 },
    sectionHeading: { color: palette.text, fontFamily: FONT.semi, fontSize: 17, letterSpacing: -0.3, marginTop: 4 },
    sectionMeta: { color: palette.muted, fontFamily: FONT.regular, fontSize: 10, marginTop: 9 },
    chargeStrip: { gap: 10, paddingTop: 16 },
    chargeToken: { borderColor: palette.border, borderRadius: 12, borderWidth: 1, minWidth: 93, paddingHorizontal: 10, paddingVertical: 10 },
    chargeTokenFirst: { borderColor: palette.alert },
    chargeDay: { color: palette.text, fontFamily: FONT.bold, fontSize: 15 },
    chargeDot: { backgroundColor: palette.accent, borderRadius: 3, height: 6, marginTop: 8, width: 6 },
    chargeName: { color: palette.text, fontFamily: FONT.medium, fontSize: 10, marginTop: 8 },
    chargeAmount: { color: palette.muted, fontFamily: FONT.regular, fontSize: 9, marginTop: 2 },
    emptyChargeText: { color: palette.muted, fontFamily: FONT.regular, fontSize: 12, paddingVertical: 8 },
    contextCard: { alignItems: "center", backgroundColor: palette.surfaceRaised, borderColor: palette.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 11, marginTop: 18, padding: 14 },
    contextIcon: { alignItems: "center", backgroundColor: palette.softAccent, borderRadius: 16, height: 32, justifyContent: "center", width: 32 },
    contextIconText: { color: palette.accent, fontFamily: FONT.semi, fontSize: 17 },
    contextCopy: { flex: 1 },
    contextTitle: { color: palette.text, fontFamily: FONT.semi, fontSize: 11, lineHeight: 16 },
    contextBody: { color: palette.muted, fontFamily: FONT.regular, fontSize: 10, lineHeight: 14, marginTop: 2 },
    contextLink: { minHeight: 38, justifyContent: "center", paddingHorizontal: 4 },
    contextLinkText: { color: palette.accent, fontFamily: FONT.semi, fontSize: 11 },
    ledgerHeading: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between", paddingBottom: 12, paddingTop: 28 },
    manageLink: { minHeight: 38, justifyContent: "center" },
    manageLinkText: { color: palette.accent, fontFamily: FONT.semi, fontSize: 11 },
    ledgerRow: { alignItems: "center", borderBottomColor: palette.border, borderBottomWidth: 1, flexDirection: "row", gap: 11, minHeight: 76, overflow: "hidden", paddingVertical: 10 },
    urgencyRail: { alignSelf: "stretch", borderRadius: 2, width: 3 },
    urgencyActive: { backgroundColor: palette.good },
    urgencyTrial: { backgroundColor: palette.alert },
    urgencyMuted: { backgroundColor: palette.quiet },
    ledgerCopy: { flex: 1, minWidth: 0 },
    ledgerName: { color: palette.text, fontFamily: FONT.semi, fontSize: 14 },
    ledgerMeta: { color: palette.muted, fontFamily: FONT.regular, fontSize: 10, marginTop: 3 },
    ledgerValue: { alignItems: "flex-end" },
    ledgerAmount: { color: palette.text, fontFamily: FONT.semi, fontSize: 13 },
    ledgerCadence: { color: palette.quiet, fontFamily: FONT.regular, fontSize: 9, marginTop: 3 },
    listFooter: { paddingTop: 24 },
    footerBlock: { gap: 18 },
    privacyRow: { alignItems: "center", flexDirection: "row", gap: 9 },
    privacyMark: { color: palette.accent, fontFamily: FONT.semi, fontSize: 17 },
    privacyText: { color: palette.muted, fontFamily: FONT.regular, fontSize: 10 },
    discoverButton: { alignItems: "center", backgroundColor: palette.text, borderRadius: 15, flexDirection: "row", justifyContent: "space-between", minHeight: 54, paddingHorizontal: 17 },
    discoverButtonText: { color: palette.canvas, fontFamily: FONT.semi, fontSize: 13 },
    discoverArrow: { color: palette.canvas, fontFamily: FONT.regular, fontSize: 19 },
    pressed: { opacity: palette.pressed, transform: [{ scale: 0.99 }] },
  });
}
