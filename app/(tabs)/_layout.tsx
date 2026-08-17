import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeContext } from "@/lib/theme-provider";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useThemeContext();
  const isDark = colorScheme === "dark";
  const tabColors = isDark ? { active: "#C6FF00", activeBackground: "#2148EB", background: "#1238D7", border: "#3657E8", inactive: "#D7E0FF" } : { active: "#1238D7", activeBackground: "#E1E9FF", background: "#FFFFFF", border: "#CCD7F5", inactive: "#61749D" };
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);
  const tabBarHeight = 60 + bottomPadding;
  return (
    <Tabs backBehavior="history" screenOptions={{ headerShown: false, lazy: false, tabBarHideOnKeyboard: false, tabBarActiveTintColor: tabColors.active, tabBarActiveBackgroundColor: tabColors.activeBackground, tabBarInactiveTintColor: tabColors.inactive, tabBarItemStyle: { borderRadius: 14, marginHorizontal: 3, minHeight: 44 }, tabBarLabelStyle: { fontFamily: "Poppins-Medium", fontSize: 10 }, tabBarStyle: { backgroundColor: tabColors.background, borderTopColor: tabColors.border, display: "flex", height: tabBarHeight, paddingBottom: bottomPadding, paddingHorizontal: 7, paddingTop: 8 } }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color }) => <IconSymbol size={22} name="house.fill" color={color} /> }} />
      <Tabs.Screen name="discover" options={{ title: "Discover", tabBarIcon: ({ color }) => <IconSymbol size={22} name="safari.fill" color={color} /> }} />
      <Tabs.Screen name="subscriptions" options={{ title: "Subscriptions", tabBarIcon: ({ color }) => <IconSymbol size={22} name="rectangle.stack.fill" color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color }) => <IconSymbol size={22} name="gearshape.fill" color={color} /> }} />
    </Tabs>
  );
}
