import { router } from "expo-router";
import { Pressable, ScrollView, Text, TextInput, View, type TextInputProps } from "react-native";
import type { PropsWithChildren } from "react";
import { ScreenContainer } from "./screen-container";
import { usePalette } from "@/lib/ui-theme";

export function Page({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle?: string }>) {
  const colors = usePalette();
  return <ScreenContainer style={{ backgroundColor: colors.background }} edges={["top", "bottom", "left", "right"]}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")} style={{ minHeight: 44, justifyContent: "center" }}><Text style={{ color: colors.primary, fontSize: 16 }}>‹ Back</Text></Pressable>
      <Text accessibilityRole="header" style={{ color: colors.foreground, fontSize: 26, fontFamily: "Poppins-Bold" }}>{title}</Text>
      {subtitle ? <Copy muted>{subtitle}</Copy> : null}{children}
    </ScrollView>
  </ScreenContainer>;
}
export function Card({ title, children }: PropsWithChildren<{ title?: string }>) {
  const colors = usePalette();
  return <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 }}>
    {title ? <Text accessibilityRole="header" style={{ color: colors.foreground, fontFamily: "Poppins-SemiBold", fontSize: 17 }}>{title}</Text> : null}{children}
  </View>;
}
export function Copy({ children, muted = false }: PropsWithChildren<{ muted?: boolean }>) {
  const colors = usePalette();
  return <Text style={{ color: muted ? colors.muted : colors.foreground, fontSize: 14, lineHeight: 22 }}>{children}</Text>;
}
export function Button({ label, onPress, disabled = false, secondary = false }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  const colors = usePalette();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} accessibilityLabel={label} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ backgroundColor: secondary ? colors.elevated : colors.primary, borderRadius: 12, minHeight: 48, padding: 12, justifyContent: "center", alignItems: "center", opacity: disabled ? 0.5 : pressed ? 0.75 : 1 })}>
    <Text style={{ color: secondary ? colors.foreground : colors.onPrimary, fontSize: 14, fontFamily: "Poppins-SemiBold" }}>{label}</Text>
  </Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const colors = usePalette();
  return <View style={{ gap: 6 }}><Copy>{label}</Copy><TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} {...props}
    style={[{ color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 48 }, props.style]} /></View>;
}
