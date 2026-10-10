import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ActionSheet, financeType } from "./finance-ui";
import { usePalette } from "@/lib/ui-theme";
import { localDateSchema } from "@/lib/data-safety";

const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

function toKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function parseKey(value?: string) { const date = value ? new Date(`${value}T00:00:00`) : new Date(); return Number.isNaN(date.getTime()) ? new Date() : date; }
function isDateKey(value?: string) { return localDateSchema.safeParse(value).success; }

export function DatePickerSheet({ visible, value, title, minDate, onClose, onSelect }: { visible: boolean; value?: string; title: string; minDate?: string; onClose: () => void; onSelect: (date: string) => void }) {
  const colors = usePalette();
  const minKey = isDateKey(minDate) ? minDate : undefined;
  const [displayedMonth, setDisplayedMonth] = useState(() => {
    const initial = parseKey(value);
    const safeInitial = minKey && toKey(initial) < minKey ? parseKey(minKey) : initial;
    return new Date(safeInitial.getFullYear(), safeInitial.getMonth(), 1);
  });
  useEffect(() => {
    if (!visible) return;
    const selectedDate = parseKey(value);
    const safeDate = minKey && toKey(selectedDate) < minKey ? parseKey(minKey) : selectedDate;
    setDisplayedMonth(new Date(safeDate.getFullYear(), safeDate.getMonth(), 1));
  }, [minKey, value, visible]);
  const days = useMemo(() => {
    const start = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), 1);
    const first = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), 1 - start.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(first.getFullYear(), first.getMonth(), first.getDate() + index);
      return { date, key: toKey(date), current: date.getMonth() === displayedMonth.getMonth() };
    });
  }, [displayedMonth]);
  const selected = value ?? "";
  const minimumMonth = minKey ? new Date(parseKey(minKey).getFullYear(), parseKey(minKey).getMonth(), 1) : undefined;
  const canGoPrevious = !minimumMonth || displayedMonth.getTime() > minimumMonth.getTime();
  const selectDate = (key: string) => { if (minKey && key < minKey) return; onSelect(key); onClose(); };

  return <ActionSheet visible={visible} title={title} onClose={onClose}>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Previous month" disabled={!canGoPrevious} onPress={() => setDisplayedMonth(new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() - 1, 1))} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.elevated, alignItems: "center", justifyContent: "center", opacity: canGoPrevious ? 1 : 0.3 }}><Ionicons name="chevron-back" size={19} color={colors.primary} /></Pressable>
      <Text style={{ color: colors.foreground, fontFamily: financeType.semi, fontSize: 14 }}>{new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(displayedMonth)}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => setDisplayedMonth(new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 1))} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.elevated, alignItems: "center", justifyContent: "center" }}><Ionicons name="chevron-forward" size={19} color={colors.primary} /></Pressable>
    </View>
    <View>
      <View style={{ flexDirection: "row", marginBottom: 8 }}>{weekdays.map((day, index) => <Text key={`${day}-${index}`} style={{ color: colors.muted, fontFamily: financeType.medium, fontSize: 11, width: "14.2857%", textAlign: "center" }}>{day}</Text>)}</View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>{days.map((item) => {
        const isSelected = item.key === selected;
        const today = item.key === toKey(new Date());
        const disabled = Boolean(minKey && item.key < minKey);
        return <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={`Choose ${item.key}`} accessibilityState={{ selected: isSelected, disabled }} disabled={disabled} onPress={() => selectDate(item.key)}
          style={({ pressed }) => ({ width: "14.2857%", height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: isSelected ? colors.primary : "transparent", borderWidth: today ? 1 : 0, borderColor: colors.primary, opacity: disabled ? 0.35 : pressed ? 0.6 : 1 })}>
          <Text style={{ color: isSelected ? colors.onPrimary : item.current ? colors.foreground : colors.muted, fontFamily: isSelected ? financeType.semi : financeType.regular, fontSize: 12 }}>{item.date.getDate()}</Text>
        </Pressable>;
      })}</View>
    </View>
    <Pressable accessibilityRole="button" onPress={() => selectDate(minKey ?? toKey(new Date()))} style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}><Text style={{ color: colors.primary, fontFamily: financeType.medium, fontSize: 13 }}>{minKey && minKey !== toKey(new Date()) ? "Use earliest available date" : "Use today"}</Text></Pressable>
  </ActionSheet>;
}
