import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

const type = { regular: "Poppins-Regular", bold: "Poppins-Bold" };

export function ElectricPageHeader({ title, subtitle, trailing }: { title: string; subtitle: string; trailing?: ReactNode }) {
  return <View style={styles.header}><View style={styles.copy}><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View>{trailing ? <View style={styles.trailing}>{trailing}</View> : null}</View>;
}

const styles = StyleSheet.create({
  header: { alignItems: "center", backgroundColor: "#1238D7", borderColor: "#3657E8", borderRadius: 20, borderWidth: 1, flexDirection: "row", gap: 12, minHeight: 86, paddingHorizontal: 17, paddingVertical: 15 },
  copy: { flex: 1, minWidth: 0 },
  title: { color: "#C6FF00", fontFamily: type.bold, fontSize: 27, letterSpacing: -0.8 },
  subtitle: { color: "#E6ECFF", fontFamily: type.regular, fontSize: 11, lineHeight: 16, marginTop: 3 },
  trailing: { flexShrink: 0 },
});
