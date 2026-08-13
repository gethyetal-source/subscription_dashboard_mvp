import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);
  const tabBarHeight = 60 + bottomPadding;
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: "#1A73E8", tabBarInactiveTintColor: "#5F6368", tabBarLabelStyle: { fontFamily: "Poppins-Medium", fontSize: 10 }, tabBarStyle: { backgroundColor: "#FFFFFF", borderTopColor: "#E8EAED", height: tabBarHeight, paddingBottom: bottomPadding, paddingTop: 8 } }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color }) => <IconSymbol size={22} name="house.fill" color={color} /> }} />
      <Tabs.Screen name="discover" options={{ title: "Discover", tabBarIcon: ({ color }) => <IconSymbol size={22} name="safari.fill" color={color} /> }} />
      <Tabs.Screen name="subscriptions" options={{ title: "Subscriptions", tabBarIcon: ({ color }) => <IconSymbol size={22} name="rectangle.stack.fill" color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color }) => <IconSymbol size={22} name="gearshape.fill" color={color} /> }} />
    </Tabs>
  );
}
