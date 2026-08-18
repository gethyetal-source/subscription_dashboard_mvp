import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeContext } from "@/lib/theme-provider";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useThemeContext();
  const isDark = colorScheme === "dark";
  const tabColors = isDark ? { active: "#172108", activeBackground: "#C9F72D", background: "#12160B", border: "#343A25", inactive: "#A8AD98" } : { active: "#F4F2E8", activeBackground: "#4A6510", background: "#F4F3EB", border: "#D9D9CC", inactive: "#65695B" };
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);
  const tabBarHeight = 60 + bottomPadding;
  return (
    <Tabs backBehavior="history" screenOptions={{ headerShown: false, lazy: false, tabBarHideOnKeyboard: false, tabBarActiveTintColor: tabColors.active, tabBarActiveBackgroundColor: tabColors.activeBackground, tabBarInactiveTintColor: tabColors.inactive, tabBarItemStyle: { borderRadius: 12, marginHorizontal: 4, minHeight: 44 }, tabBarLabelStyle: { fontFamily: "Poppins-Medium", fontSize: 10 }, tabBarStyle: { backgroundColor: tabColors.background, borderTopColor: tabColors.border, borderTopWidth: 1, display: "flex", height: tabBarHeight, paddingBottom: bottomPadding, paddingHorizontal: 8, paddingTop: 8 } }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color }) => <IconSymbol size={22} name="house.fill" color={color} /> }} />
      <Tabs.Screen name="discover" options={{ title: "Discover", tabBarIcon: ({ color }) => <IconSymbol size={22} name="safari.fill" color={color} /> }} />
      <Tabs.Screen name="subscriptions" options={{ title: "Subscriptions", tabBarIcon: ({ color }) => <IconSymbol size={22} name="rectangle.stack.fill" color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color }) => <IconSymbol size={22} name="gearshape.fill" color={color} /> }} />
    </Tabs>
  );
}
