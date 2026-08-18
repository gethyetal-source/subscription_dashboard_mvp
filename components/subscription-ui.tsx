import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { Image } from "expo-image";
import { useState } from "react";

import { getService, serviceLogoSources } from "@/lib/catalog";
import type { SubscriptionRecord } from "@/lib/subscription-types";
import { formatCurrency, formatRelativeRenewal, monthlyAmount } from "@/lib/subscription-utils";
import { useThemeContext } from "@/lib/theme-provider";

const type = {
  regular: "Poppins-Regular",
  medium: "Poppins-Medium",
  semi: "Poppins-SemiBold",
  bold: "Poppins-Bold",
};

export function ServiceBadge({ serviceId, size = "regular" }: { serviceId: string; size?: "small" | "regular" | "large" }) {
  const service = getService(serviceId);
  const [failed, setFailed] = useState(false);
  const dimension = size === "small" ? 36 : size === "large" ? 54 : 42;
  const labelSize = size === "small" ? 11 : size === "large" ? 16 : 13;
  const logoSource = serviceLogoSources[serviceId];
  return (
    <View style={[styles.badge, { width: dimension, height: dimension, borderRadius: dimension / 2 }]}> 
      {logoSource && !failed ? <Image source={logoSource} contentFit="contain" transition={120} cachePolicy="disk" accessibilityLabel={`${service?.name ?? "Service"} logo`} style={{ width: dimension * 0.7, height: dimension * 0.7 }} onError={() => setFailed(true)} /> : <View style={[styles.fallbackBadge, { width: dimension, height: dimension, borderRadius: dimension / 2, backgroundColor: service?.accent ?? "#1A73E8" }]}><Text style={[styles.badgeText, { fontSize: labelSize }]}>{service?.initials ?? "?"}</Text></View>}
    </View>
  );
}

export function Pill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "teal" | "amber" | "coral" }) {
  const fill = tone === "teal" ? styles.pillGreen : tone === "amber" ? styles.pillAmber : tone === "coral" ? styles.pillRed : styles.pillNeutral;
  const labelStyle = tone === "teal" ? styles.pillLabelGreen : tone === "amber" ? styles.pillLabelAmber : tone === "coral" ? styles.pillLabelRed : styles.pillLabelNeutral;
  return <View style={[styles.pill, fill]}><Text style={[styles.pillLabel, labelStyle]}>{label}</Text></View>;
}

export function SectionLabel({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { colorScheme } = useThemeContext();
  const sectionTheme = colorScheme === "dark" ? sectionThemes.dark : sectionThemes.light;
  return <View style={styles.sectionRow}><Text style={[styles.sectionTitle, sectionTheme.title]}>{title}</Text>{action && onAction ? <Pressable hitSlop={10} onPress={onAction}><Text style={[styles.sectionAction, sectionTheme.action]}>{action}</Text></Pressable> : null}</View>;
}

export function PrimaryButton({ label, onPress, style, disabled = false }: { label: string; onPress: () => void; style?: ViewStyle; disabled?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.primaryButton, style, (pressed || disabled) && styles.buttonPressed, disabled && styles.buttonDisabled]}><Text style={styles.primaryButtonText}>{label}</Text></Pressable>;
}

export function SecondaryButton({ label, onPress, style }: { label: string; onPress: () => void; style?: ViewStyle }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.secondaryButton, style, pressed && styles.buttonPressed]}><Text style={styles.secondaryButtonText}>{label}</Text></Pressable>;
}

export function SubscriptionRow({ item, onPress, onQuickEdit, onDelete }: { item: SubscriptionRecord; onPress: () => void; onQuickEdit?: () => void; onDelete?: () => void }) {
  const service = getService(item.serviceId);
  const tone = item.status === "trial" ? "amber" : item.status === "cancelled" ? "coral" : item.status === "uncertain" ? "neutral" : "teal";
  return (
    <View style={styles.subscriptionCard}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.subscriptionRow, pressed && styles.rowPressed]}>
        <ServiceBadge serviceId={item.serviceId} />
        <View style={styles.subscriptionCopy}><Text style={styles.subscriptionName}>{service?.name ?? "Subscription"}</Text><Text style={styles.subscriptionMeta}>{item.planName} · {formatRelativeRenewal(item.renewalDate)}</Text>{(item.sharedMemberIds?.length ?? 1) > 1 ? <Text style={styles.sharedHint}>Shared plan · {formatCurrency(monthlyAmount(item.amount, item.cadence) / (item.sharedMemberIds?.length ?? 1), item.currency)} each / month</Text> : null}</View>
        <View style={styles.subscriptionAmount}><Text style={styles.amount}>{formatCurrency(item.amount, item.currency)}</Text><Pill label={item.status} tone={tone} /></View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      {onQuickEdit || onDelete ? <><View style={styles.rowDivider} /><View style={styles.rowActions}>{onQuickEdit ? <Pressable onPress={onQuickEdit} style={({ pressed }) => [styles.rowAction, pressed && styles.rowPressed]}><Text style={styles.quickEditText}>Quick edit</Text></Pressable> : null}{onDelete ? <Pressable onPress={onDelete} style={({ pressed }) => [styles.rowAction, pressed && styles.rowPressed]}><Text style={styles.deleteText}>Delete</Text></Pressable> : null}</View></> : null}
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return <View style={styles.emptyState}><View style={styles.emptySymbol}><Text style={styles.emptySymbolText}>+</Text></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyBody}>{body}</Text></View>;
}

const styles = StyleSheet.create({
  badge: { alignItems: "center", backgroundColor: "#171C0E", borderColor: "#3A4227", borderWidth: 1, justifyContent: "center", overflow: "hidden" },
  fallbackBadge: { alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#FFFFFF", fontFamily: type.bold },
  pill: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  pillLabel: { fontFamily: type.semi, fontSize: 10, textTransform: "capitalize" },
  pillNeutral: { backgroundColor: "#2A3020" }, pillGreen: { backgroundColor: "#253722" }, pillAmber: { backgroundColor: "#463E20" }, pillRed: { backgroundColor: "#422326" },
  pillLabelNeutral: { color: "#C8CEBC" }, pillLabelGreen: { color: "#A6DE87" }, pillLabelAmber: { color: "#ECD47B" }, pillLabelRed: { color: "#FFAB9E" },
  sectionRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 18, letterSpacing: -0.2 },
  sectionAction: { color: "#C9F72D", fontFamily: type.semi, fontSize: 13 },
  primaryButton: { alignItems: "center", backgroundColor: "#C9F72D", borderColor: "#C9F72D", borderRadius: 14, borderWidth: 1, justifyContent: "center", minHeight: 48, paddingHorizontal: 20 },
  primaryButtonText: { color: "#162007", fontFamily: type.semi, fontSize: 14 },
  secondaryButton: { alignItems: "center", backgroundColor: "#191E0F", borderColor: "#3A4227", borderRadius: 14, borderWidth: 1, justifyContent: "center", minHeight: 48, paddingHorizontal: 18 },
  secondaryButtonText: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 14 },
  buttonPressed: { opacity: 0.78, transform: [{ scale: 0.99 }] }, buttonDisabled: { backgroundColor: "#687542" },
  subscriptionCard: { backgroundColor: "#191E0F", borderColor: "#343A25", borderRadius: 14, borderWidth: 1, overflow: "hidden" }, subscriptionRow: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 76, padding: 12 },
  rowPressed: { backgroundColor: "#222916" }, subscriptionCopy: { flex: 1, minWidth: 0 }, subscriptionName: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 14 }, subscriptionMeta: { color: "#A8AD98", fontFamily: type.regular, fontSize: 11, marginTop: 3 }, sharedHint: { color: "#C9F72D", fontFamily: type.semi, fontSize: 9, marginTop: 3 },
  subscriptionAmount: { alignItems: "flex-end", gap: 4 }, amount: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 13 }, chevron: { color: "#A8AD98", fontFamily: type.regular, fontSize: 24, lineHeight: 24 }, rowDivider: { backgroundColor: "#343A25", height: 1 }, rowActions: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 6, paddingVertical: 4 }, rowAction: { paddingHorizontal: 12, paddingVertical: 7 }, quickEditText: { color: "#C9F72D", fontFamily: type.semi, fontSize: 11 }, deleteText: { color: "#FF9B8C", fontFamily: type.semi, fontSize: 11 },
  emptyState: { alignItems: "center", backgroundColor: "#191E0F", borderColor: "#3A4227", borderRadius: 14, borderStyle: "dashed", borderWidth: 1, paddingHorizontal: 28, paddingVertical: 34 },
  emptySymbol: { alignItems: "center", backgroundColor: "#28301B", borderRadius: 22, height: 44, justifyContent: "center", marginBottom: 12, width: 44 }, emptySymbolText: { color: "#C9F72D", fontFamily: type.regular, fontSize: 26, lineHeight: 28 },
  emptyTitle: { color: "#F4F2E8", fontFamily: type.semi, fontSize: 15, textAlign: "center" }, emptyBody: { color: "#A8AD98", fontFamily: type.regular, fontSize: 12, lineHeight: 18, marginTop: 6, maxWidth: 270, textAlign: "center" },
});

const sectionThemes = {
  light: StyleSheet.create({ title: { color: "#293015" }, action: { color: "#4A6510" } }),
  dark: StyleSheet.create({ title: { color: "#F4F2E8" }, action: { color: "#C9F72D" } }),
};
