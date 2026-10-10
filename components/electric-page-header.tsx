import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useThemedStyles } from "@/lib/ui-theme";

const type = { regular: "Poppins-Regular", bold: "Poppins-Bold" };

const baseStyles = () => styles;
export function ElectricPageHeader({ title, subtitle, trailing }: { title: string; subtitle: string; trailing?: ReactNode }) {
  const styles = useThemedStyles(baseStyles());
  return <View style={styles.header}><View style={styles.copy}><Text accessibilityRole="header" style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View>{trailing ? <View style={styles.trailing}>{trailing}</View> : null}</View>;
}

const styles = StyleSheet.create({
  header: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 76, paddingVertical: 8 },
  copy: { flex: 1, minWidth: 0 },
  title: { color: "#F4F2E8", fontFamily: type.bold, fontSize: 27, letterSpacing: -0.8 },
  subtitle: { color: "#A8AD98", fontFamily: type.regular, fontSize: 13, lineHeight: 20, marginTop: 3 },
  trailing: { flexShrink: 0 },
});
