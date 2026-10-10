import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import type { ComponentProps, PropsWithChildren, ReactNode } from "react";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { ScreenContainer } from "./screen-container";
import { usePalette } from "@/lib/ui-theme";

export const financeType = { regular: "Poppins-Regular", medium: "Poppins-Medium", semi: "Poppins-SemiBold", bold: "Poppins-Bold" };
type IconName = ComponentProps<typeof Ionicons>["name"];

export function RoundAction({ icon, label, onPress, primary = false }: { icon: IconName; label: string; onPress: () => void; primary?: boolean }) {
  const colors = usePalette();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: primary ? colors.primary : colors.surface, borderWidth: primary ? 0 : 1, borderColor: colors.border, opacity: pressed ? 0.7 : 1 })}>
    <Ionicons name={icon} size={21} color={primary ? colors.onPrimary : colors.foreground} aria-hidden />
  </Pressable>;
}

export function FinanceHeader({ title, eyebrow, trailing, back = false }: { title: string; eyebrow?: string; trailing?: ReactNode; back?: boolean }) {
  const colors = usePalette();
  const { width } = useWindowDimensions();
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 }}>
    {back ? <RoundAction icon="chevron-back" label="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")} /> : null}
    <View style={{ flex: 1, minWidth: 0 }}>
      {eyebrow ? <Text style={{ color: colors.muted, fontFamily: financeType.medium, fontSize: 11, marginBottom: 4 }}>{eyebrow}</Text> : null}
      <Text accessibilityRole="header" style={{ color: colors.foreground, fontFamily: financeType.bold, fontSize: back ? 21 : width < 360 ? 23 : 27, letterSpacing: -0.7 }}>{title}</Text>
    </View>
    {trailing}
  </View>;
}

export function FinancePage({ title, children, trailing }: PropsWithChildren<{ title: string; trailing?: ReactNode }>) {
  return <ScreenContainer edges={["top", "left", "right", "bottom"]}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 22, gap: 24, paddingBottom: 40 }}>
      <FinanceHeader title={title} back trailing={trailing} />
      {children}
    </ScrollView>
    </KeyboardAvoidingView>
  </ScreenContainer>;
}

export function SectionHeading({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  const colors = usePalette();
  return <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
    <Text accessibilityRole="header" style={{ color: colors.foreground, fontFamily: financeType.semi, fontSize: 17, flex: 1 }}>{title}</Text>
    {action && onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={{ minHeight: 44, justifyContent: "center" }}><Text style={{ color: colors.primary, fontFamily: financeType.medium, fontSize: 12 }}>{action}</Text></Pressable> : null}
  </View>;
}

export function Surface({ children }: PropsWithChildren) {
  const colors = usePalette();
  return <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 18, gap: 14, borderWidth: 1, borderColor: colors.border }}>{children}</View>;
}

export function HeroBackdrop() {
  return <Svg pointerEvents="none" width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0 }}>
    <Defs><LinearGradient id="finance-hero" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#064B3B" /><Stop offset="1" stopColor="#066C54" /></LinearGradient></Defs>
    <Rect width="100%" height="100%" fill="url(#finance-hero)" />
    <Circle cx="93%" cy="20%" r="85" fill="#24AD86" opacity="0.1" />
    <Path d="M0 190 Q120 110 250 200 T550 180 L550 400 H0Z" fill="#003C31" opacity="0.35" />
  </Svg>;
}

export function MetricLabel({ children }: PropsWithChildren) {
  const colors = usePalette();
  return <Text style={{ color: colors.muted, fontFamily: financeType.medium, fontSize: 11 }}>{children}</Text>;
}

export function RowDivider() {
  const colors = usePalette();
  return <View style={{ height: 1, backgroundColor: colors.border }} />;
}

export function SearchField({ value, onChange, placeholder, label }: { value: string; onChange: (value: string) => void; placeholder: string; label: string }) {
  const colors = usePalette();
  return <View style={{ flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 14, minHeight: 48 }}>
    <Ionicons name="search-outline" size={19} color={colors.muted} aria-hidden />
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.muted} style={{ flex: 1, minWidth: 0, fontSize: 14, color: colors.foreground, fontFamily: financeType.regular, minHeight: 48 }} />
  </View>;
}

export function CurrencyPicker({ currencies, value, onChange, inverse = false }: { currencies: string[]; value: string; onChange: (value: string) => void; inverse?: boolean }) {
  const colors = usePalette();
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
    {currencies.map((currency) => <Pressable key={currency} accessibilityRole="button" accessibilityLabel={`Show ${currency} amounts`} accessibilityState={{ selected: currency === value }} onPress={() => onChange(currency)}
      style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 11, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: inverse ? currency === value ? "#BAF1D9" : "rgba(255,255,255,0.09)" : currency === value ? colors.primary : colors.surface, opacity: pressed ? 0.7 : 1 })}>
      <Text style={{ fontFamily: financeType.medium, fontSize: 11, color: inverse ? currency === value ? "#064B3B" : "#D9F6EB" : currency === value ? colors.onPrimary : colors.muted }}>{currency}</Text>
    </Pressable>)}
  </View>;
}

export function ActionSheet({ visible, title, children, onClose }: PropsWithChildren<{ visible: boolean; title: string; onClose: () => void }>) {
  const colors = usePalette();
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(4,24,17,0.35)" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View accessibilityViewIsModal style={{ backgroundColor: colors.surface, width: "100%", maxWidth: 480, maxHeight: "90%", alignSelf: "center", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 32, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Text accessibilityRole="header" style={{ color: colors.foreground, fontFamily: financeType.semi, fontSize: 19, flex: 1 }}>{title}</Text>
          <RoundAction icon="close" label="Close actions" onPress={onClose} />
        </View>
        <ScrollView role={Platform.OS === "web" ? "region" : undefined} accessibilityLabel={`${title} content`} tabIndex={Platform.OS === "web" ? 0 : undefined} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>{children}</ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

export function EmptyIllustration({ title, body, action }: { title: string; body: string; action: ReactNode }) {
  const colors = usePalette();
  return <View style={{ paddingVertical: 30, alignItems: "center", gap: 16 }}>
    <View style={{ width: 88, height: 88, borderRadius: 30, backgroundColor: colors.elevated, alignItems: "center", justifyContent: "center" }}><Ionicons name="wallet-outline" size={40} color={colors.primary} aria-hidden /></View>
    <Text accessibilityRole="header" style={{ color: colors.foreground, fontFamily: financeType.semi, fontSize: 23, textAlign: "center", maxWidth: 280 }}>{title}</Text>
    <Text style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 14, lineHeight: 22, textAlign: "center", maxWidth: 280 }}>{body}</Text>
    <View style={{ width: "100%", maxWidth: 280 }}>{action}</View>
  </View>;
}

export function FinanceLink({ icon, title, detail, onPress, danger = false, disabled = false, selected }: { icon: IconName; title: string; detail?: string; onPress: () => void; danger?: boolean; disabled?: boolean; selected?: boolean }) {
  const colors = usePalette();
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled, selected }} disabled={disabled} onPress={onPress} style={({ pressed }) => ({ minHeight: 52, flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 8, opacity: disabled ? 0.5 : pressed ? 0.65 : 1 })}>
    <View style={{ width: 34, height: 34, backgroundColor: colors.elevated, borderRadius: 11, alignItems: "center", justifyContent: "center" }}><Ionicons name={icon} size={18} color={danger ? colors.danger : colors.primary} aria-hidden /></View>
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={{ color: danger ? colors.danger : colors.foreground, fontFamily: financeType.medium, fontSize: 14 }}>{title}</Text>
      {detail ? <Text style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 11, marginTop: 3 }}>{detail}</Text> : null}
    </View>
    <Ionicons name="chevron-forward" size={16} color={colors.muted} aria-hidden />
  </Pressable>;
}

export function Disclosure({ title, children, open, onToggle }: PropsWithChildren<{ title: string; open: boolean; onToggle: () => void }>) {
  const colors = usePalette();
  return <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: open }} onPress={onToggle} style={{ minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Text style={{ flex: 1, color: colors.foreground, fontFamily: financeType.medium, fontSize: 14 }}>{title}</Text>
      <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} aria-hidden />
    </Pressable>
    {open ? <View style={{ gap: 16, paddingBottom: 16 }}>{children}</View> : null}
  </View>;
}
