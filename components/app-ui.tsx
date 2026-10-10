import { Modal, Pressable, Switch, Text, TextInput, View, type TextInputProps } from "react-native";
import type { PropsWithChildren } from "react";
import { usePalette } from "@/lib/ui-theme";
import { FinancePage } from "./finance-ui";

export function Page({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle?: string }>) {
  return <FinancePage title={title}>{subtitle ? <Copy muted>{subtitle}</Copy> : null}{children}</FinancePage>;
}
export function Card({ title, children }: PropsWithChildren<{ title?: string }>) {
  const colors = usePalette();
  return <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 18, gap: 14, minWidth: 0 }}>
    {title ? <Text accessibilityRole="header" style={{ color: colors.foreground, fontFamily: "Poppins-SemiBold", fontSize: 17 }}>{title}</Text> : null}{children}
  </View>;
}
export function Copy({ children, muted = false, selectable = false }: PropsWithChildren<{ muted?: boolean; selectable?: boolean }>) {
  const colors = usePalette();
  return <Text selectable={selectable} style={{ color: muted ? colors.muted : colors.foreground, fontFamily: "Poppins-Regular", fontSize: 14, lineHeight: 22 }}>{children}</Text>;
}
export function Button({ label, onPress, disabled = false, secondary = false, danger = false }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean; danger?: boolean }) {
  const colors = usePalette();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} accessibilityLabel={label} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ backgroundColor: secondary || danger ? colors.surface : colors.primary, borderColor: danger ? colors.danger : secondary ? colors.border : colors.primary, borderWidth: 1, borderRadius: 14, minHeight: 48, padding: 12, justifyContent: "center", alignItems: "center", opacity: disabled ? 0.5 : pressed ? 0.75 : 1 })}>
    <Text style={{ color: danger ? colors.danger : secondary ? colors.foreground : colors.onPrimary, fontSize: 14, fontFamily: "Poppins-Medium", textAlign: "center", flexShrink: 1 }}>{label}</Text>
  </Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const colors = usePalette();
  return <View style={{ gap: 6 }}><Copy>{label}</Copy><TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} {...props}
    style={[{ color: colors.foreground, backgroundColor: colors.surface, fontFamily: "Poppins-Regular", fontSize: 14, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 12, minHeight: 48, minWidth: 0, textAlignVertical: props.multiline ? "top" : "center" }, props.style]} /></View>;
}

export function ChoiceChips<T extends string | number>({ label, options, value, onChange, disabled = false }: { label: string; options: { label: string; value: T }[]; value: T; onChange: (value: T) => void; disabled?: boolean }) {
  const colors = usePalette();
  return <View style={{ gap: 8 }}>
    <Copy>{label}</Copy>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((option) => <Pressable key={option.value} accessibilityRole="button" accessibilityLabel={`${label}: ${option.label}`} accessibilityState={{ selected: value === option.value, disabled }} disabled={disabled} onPress={() => onChange(option.value)}
        style={({ pressed }) => ({ backgroundColor: value === option.value ? colors.primary : colors.surface, borderColor: value === option.value ? colors.primary : colors.border, borderWidth: 1, borderRadius: 8, minHeight: 44, justifyContent: "center", paddingHorizontal: 12, paddingVertical: 8, maxWidth: "100%", opacity: disabled ? 0.5 : pressed ? 0.75 : 1 })}>
        <Text style={{ color: value === option.value ? colors.onPrimary : colors.foreground, fontFamily: "Poppins-Medium", fontSize: 13 }}>{option.label}</Text>
      </Pressable>)}
    </View>
  </View>;
}

export function ToggleRow({ label, description, value, onChange, disabled = false }: { label: string; description?: string; value: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  const colors = usePalette();
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
    <View style={{ flex: 1, minWidth: 0 }}><Copy>{label}</Copy>{description ? <Copy muted>{description}</Copy> : null}</View>
    <Switch accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} value={value} onValueChange={onChange} trackColor={{ false: colors.border, true: colors.primary }} />
  </View>;
}

export function Notice({ children, error = false }: PropsWithChildren<{ error?: boolean }>) {
  const colors = usePalette();
  return <Text accessibilityRole="alert" style={{ color: error ? colors.danger : colors.foreground, fontFamily: "Poppins-Regular", fontSize: 14, lineHeight: 22 }}>{children}</Text>;
}

export function ActionLink({ title, description, onPress, danger = false }: { title: string; description?: string; onPress: () => void; danger?: boolean }) {
  const colors = usePalette();
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48, paddingVertical: 8, opacity: pressed ? 0.7 : 1 })}>
    <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: danger ? colors.danger : colors.foreground, fontFamily: "Poppins-Medium", fontSize: 14 }}>{title}</Text>{description ? <Copy muted>{description}</Copy> : null}</View>
    <Text style={{ color: colors.muted, fontSize: 22 }}>›</Text>
  </Pressable>;
}

export function ConfirmDialog({ visible, title, message, confirmLabel, onConfirm, onCancel, busy = false, danger = false, hideCancel = false }: { visible: boolean; title: string; message: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void; busy?: boolean; danger?: boolean; hideCancel?: boolean }) {
  const colors = usePalette();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (!busy) onCancel(); }}>
    <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 }}>
      <View accessibilityViewIsModal style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20, gap: 16, width: "100%", maxWidth: 440, alignSelf: "center" }}>
        <Text accessibilityRole="header" style={{ color: colors.foreground, fontFamily: "Poppins-SemiBold", fontSize: 20 }}>{title}</Text>
        <Copy>{message}</Copy>
        <Button label={busy ? "Working…" : confirmLabel} disabled={busy} danger={danger} onPress={onConfirm} />
        {!hideCancel ? <Button label="Cancel" secondary disabled={busy} onPress={onCancel} /> : null}
      </View>
    </View>
  </Modal>;
}
