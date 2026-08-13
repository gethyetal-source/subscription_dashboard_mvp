import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { getService } from "@/lib/catalog";
import type { SubscriptionRecord } from "@/lib/subscription-types";
import { formatCurrency, formatRelativeRenewal } from "@/lib/subscription-utils";

export function ServiceBadge({ serviceId, size = "regular" }: { serviceId: string; size?: "small" | "regular" | "large" }) {
  const service = getService(serviceId);
  const dimension = size === "small" ? 34 : size === "large" ? 56 : 42;
  const labelSize = size === "small" ? 12 : size === "large" ? 19 : 15;
  return (
    <View style={[styles.badge, { width: dimension, height: dimension, borderRadius: dimension / 3, backgroundColor: service?.accent ?? "#0E9F8A" }]}>
      <Text style={[styles.badgeText, { fontSize: labelSize }]}>{service?.initials ?? "?"}</Text>
    </View>
  );
}

export function Pill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "teal" | "amber" | "coral" }) {
  const toneStyle = tone === "teal" ? styles.pillTeal : tone === "amber" ? styles.pillAmber : tone === "coral" ? styles.pillCoral : styles.pillNeutral;
  const textTone = tone === "teal" ? styles.pillTextTeal : tone === "amber" ? styles.pillTextAmber : tone === "coral" ? styles.pillTextCoral : styles.pillTextNeutral;
  return <View style={[styles.pill, toneStyle]}><Text style={[styles.pillText, textTone]}>{label}</Text></View>;
}

export function SectionLabel({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? <Pressable onPress={onAction} hitSlop={8}><Text style={styles.sectionAction}>{action}</Text></Pressable> : null}
    </View>
  );
}

export function PrimaryButton({ label, onPress, style, disabled = false }: { label: string; onPress: () => void; style?: ViewStyle; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.primaryButton, style, (pressed || disabled) && styles.buttonPressed, disabled && styles.buttonDisabled]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, style }: { label: string; onPress: () => void; style?: ViewStyle }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.secondaryButton, style, pressed && styles.buttonPressed]}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function SubscriptionRow({ item, onPress }: { item: SubscriptionRecord; onPress: () => void }) {
  const service = getService(item.serviceId);
  const tone = item.status === "trial" ? "amber" : item.status === "cancelled" ? "coral" : item.status === "uncertain" ? "neutral" : "teal";
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.subscriptionRow, pressed && styles.rowPressed]}>
      <ServiceBadge serviceId={item.serviceId} />
      <View style={styles.subscriptionCopy}>
        <Text style={styles.subscriptionName}>{service?.name ?? "Subscription"}</Text>
        <Text style={styles.subscriptionMeta}>{item.planName} · {formatRelativeRenewal(item.renewalDate)}</Text>
      </View>
      <View style={styles.subscriptionAmount}>
        <Text style={styles.amount}>{formatCurrency(item.amount, item.currency)}</Text>
        <Pill label={item.status} tone={tone} />
      </View>
    </Pressable>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyOrb}><Text style={styles.emptyGlyph}>+</Text></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#FFFFFF", fontWeight: "800" },
  pill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 10, fontWeight: "800", textTransform: "capitalize" },
  pillNeutral: { backgroundColor: "#EEF2F6" },
  pillTeal: { backgroundColor: "#DDF6EE" },
  pillAmber: { backgroundColor: "#FFF2D9" },
  pillCoral: { backgroundColor: "#FCE6E6" },
  pillTextNeutral: { color: "#5D6B7A" },
  pillTextTeal: { color: "#087B6C" },
  pillTextAmber: { color: "#A9680B" },
  pillTextCoral: { color: "#AA4141" },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { color: "#10253F", fontSize: 17, fontWeight: "800", letterSpacing: -0.2 },
  sectionAction: { color: "#0E9F8A", fontSize: 14, fontWeight: "800" },
  primaryButton: { minHeight: 50, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#0E9F8A", paddingHorizontal: 18 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  secondaryButton: { minHeight: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, backgroundColor: "#E8F6F3" },
  secondaryButtonText: { color: "#087B6C", fontSize: 14, fontWeight: "800" },
  buttonPressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  buttonDisabled: { backgroundColor: "#8ACEC2" },
  subscriptionRow: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 13, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#E6ECF2" },
  rowPressed: { opacity: 0.7 },
  subscriptionCopy: { flex: 1, minWidth: 0 },
  subscriptionName: { color: "#10253F", fontSize: 15, fontWeight: "800" },
  subscriptionMeta: { color: "#667085", fontSize: 12, fontWeight: "600", marginTop: 3 },
  subscriptionAmount: { alignItems: "flex-end", gap: 5 },
  amount: { color: "#10253F", fontSize: 14, fontWeight: "800" },
  emptyState: { alignItems: "center", paddingVertical: 38, paddingHorizontal: 24, backgroundColor: "#FFFFFF", borderRadius: 22, borderWidth: 1, borderColor: "#E6ECF2" },
  emptyOrb: { height: 44, width: 44, borderRadius: 22, backgroundColor: "#DDF6EE", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyGlyph: { color: "#0E9F8A", fontSize: 26, fontWeight: "500", lineHeight: 28 },
  emptyTitle: { color: "#10253F", fontSize: 16, fontWeight: "800", textAlign: "center" },
  emptyBody: { color: "#667085", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 7, maxWidth: 260 },
});
