import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePalette } from "@/lib/ui-theme";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const colors = usePalette();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);
  const tabBarHeight = 60 + bottomPadding;
  return (
    <Tabs backBehavior="history" screenOptions={{ headerShown: false, lazy: true, tabBarHideOnKeyboard: true, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, tabBarItemStyle: { minHeight: 44 }, tabBarLabelStyle: { fontFamily: "Poppins-Medium", fontSize: 10 }, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, height: tabBarHeight, paddingBottom: bottomPadding, paddingTop: 8 } }}>
      <Tabs.Screen name="index" options={{ title: "Overview", tabBarAccessibilityLabel: "Overview", tabBarIcon: ({ color, focused }) => <Ionicons size={22} name={focused ? "grid" : "grid-outline"} color={color} aria-hidden /> }} />
      <Tabs.Screen name="subscriptions" options={{ title: "Subscriptions", tabBarAccessibilityLabel: "Subscriptions", tabBarIcon: ({ color, focused }) => <Ionicons size={22} name={focused ? "layers" : "layers-outline"} color={color} aria-hidden /> }} />
      <Tabs.Screen name="insights" options={{ title: "Insights", tabBarAccessibilityLabel: "Insights", tabBarIcon: ({ color, focused }) => <Ionicons size={22} name={focused ? "pie-chart" : "pie-chart-outline"} color={color} aria-hidden /> }} />
      <Tabs.Screen name="discover" options={{ title: "Discover", href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", href: null, tabBarStyle: { display: "none" } }} />
    </Tabs>
  );
}
