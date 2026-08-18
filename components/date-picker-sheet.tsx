import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useThemeContext } from "@/lib/theme-provider";

const weekdays = ["S", "M", "T", "W", "T", "F", "S"];
const type = { regular: "Poppins-Regular", semi: "Poppins-SemiBold" };

function toKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function parseKey(value?: string) { const date = value ? new Date(`${value}T00:00:00`) : new Date(); return Number.isNaN(date.getTime()) ? new Date() : date; }
function isDateKey(value?: string) { return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime())); }

export function DatePickerSheet({ visible, value, title, minDate, onClose, onSelect }: { visible: boolean; value?: string; title: string; minDate?: string; onClose: () => void; onSelect: (date: string) => void }) {
  const { colorScheme } = useThemeContext();
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
  const isDark = colorScheme === "dark";
  const palette = isDark ? dark : light;
  const selectDate = (key: string) => { if (minKey && key < minKey) return; onSelect(key); onClose(); };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.backdrop}><View style={[styles.sheet, palette.sheet]}><View style={styles.header}><Text style={[styles.title, palette.title]}>{title}</Text><Pressable onPress={onClose} hitSlop={10}><Text style={[styles.close, palette.close]}>×</Text></Pressable></View><View style={styles.monthNav}><Pressable disabled={!canGoPrevious} onPress={() => canGoPrevious && setDisplayedMonth(new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() - 1, 1))} style={({ pressed }) => [styles.navButton, palette.navButton, !canGoPrevious && styles.disabled, pressed && styles.pressed]}><Text style={[styles.navText, palette.navText]}>‹</Text></Pressable><Text style={[styles.month, palette.month]}>{new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(displayedMonth)}</Text><Pressable onPress={() => setDisplayedMonth(new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 1))} style={({ pressed }) => [styles.navButton, palette.navButton, pressed && styles.pressed]}><Text style={[styles.navText, palette.navText]}>›</Text></Pressable></View><View style={styles.weekdays}>{weekdays.map((day, index) => <Text key={`${day}-${index}`} style={[styles.weekday, palette.weekday]}>{day}</Text>)}</View><View style={styles.grid}>{days.map((item) => { const isSelected = item.key === selected; const today = item.key === toKey(new Date()); const disabled = Boolean(minKey && item.key < minKey); return <Pressable key={item.key} disabled={disabled} onPress={() => selectDate(item.key)} style={({ pressed }) => [styles.day, isSelected && styles.daySelected, today && !isSelected && palette.dayToday, disabled && styles.dayDisabled, pressed && styles.pressed]}><Text style={[styles.dayText, palette.dayText, !item.current && palette.dayMuted, disabled && palette.dayDisabledText, isSelected && styles.daySelectedText, today && !isSelected && palette.dayTodayText]}>{item.date.getDate()}</Text></Pressable>; })}</View>{minKey ? <Pressable onPress={() => selectDate(minKey)} style={({ pressed }) => [styles.todayButton, pressed && styles.pressed]}><Text style={[styles.todayText, palette.todayText]}>Use earliest available date</Text></Pressable> : <Pressable onPress={() => selectDate(toKey(new Date()))} style={({ pressed }) => [styles.todayButton, pressed && styles.pressed]}><Text style={[styles.todayText, palette.todayText]}>Use today</Text></Pressable>}</View></View></Modal>;
}

const styles = StyleSheet.create({ backdrop: { backgroundColor: "rgba(6,8,3,0.72)", flex: 1, justifyContent: "flex-end" }, sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }, header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, title: { fontFamily: type.semi, fontSize: 16 }, close: { fontFamily: type.regular, fontSize: 28, lineHeight: 28 }, monthNav: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 15 }, navButton: { alignItems: "center", borderRadius: 12, height: 36, justifyContent: "center", width: 36 }, navText: { fontFamily: type.regular, fontSize: 25, lineHeight: 25 }, month: { fontFamily: type.semi, fontSize: 14 }, weekdays: { flexDirection: "row", marginTop: 16 }, weekday: { fontFamily: type.semi, fontSize: 10, textAlign: "center", width: "14.2857%" }, grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 7 }, day: { alignItems: "center", borderRadius: 12, height: 38, justifyContent: "center", width: "14.2857%" }, dayText: { fontFamily: type.regular, fontSize: 12 }, daySelected: { backgroundColor: "#C9F72D" }, daySelectedText: { color: "#172108", fontFamily: type.semi }, todayButton: { alignItems: "center", marginTop: 12, paddingVertical: 10 }, todayText: { fontFamily: type.semi, fontSize: 13 }, disabled: { opacity: 0.34 }, dayDisabled: { opacity: 0.42 }, pressed: { opacity: 0.72 } });
const light = StyleSheet.create({ sheet: { backgroundColor: "#FFFEF8", borderColor: "#D9D9CC", borderTopWidth: 1 }, title: { color: "#20241A" }, close: { color: "#65695B" }, navButton: { backgroundColor: "#E5EDD2" }, navText: { color: "#4A6510" }, month: { color: "#20241A" }, weekday: { color: "#65695B" }, dayText: { color: "#20241A" }, dayMuted: { color: "#A9AC9E" }, dayDisabledText: { color: "#A9AC9E" }, dayToday: { borderColor: "#4A6510", borderWidth: 1 }, dayTodayText: { color: "#4A6510", fontFamily: type.semi }, todayText: { color: "#4A6510" } });
const dark = StyleSheet.create({ sheet: { backgroundColor: "#191E0F", borderColor: "#3A4227", borderTopWidth: 1 }, title: { color: "#F4F2E8" }, close: { color: "#A8AD98" }, navButton: { backgroundColor: "#28301B" }, navText: { color: "#C9F72D" }, month: { color: "#F4F2E8" }, weekday: { color: "#A8AD98" }, dayText: { color: "#F4F2E8" }, dayMuted: { color: "#68715A" }, dayDisabledText: { color: "#68715A" }, dayToday: { borderColor: "#C9F72D", borderWidth: 1 }, dayTodayText: { color: "#C9F72D", fontFamily: type.semi }, todayText: { color: "#C9F72D" } });
