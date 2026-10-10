import { Redirect } from "expo-router";
import { useAccount } from "@/lib/account";

// Keep old bookmarks valid without exposing an upload or restore action.
export default function FormerCloudSyncScreen() {
  const account = useAccount();
  return <Redirect href={account.canAccessApp ? "/(tabs)/profile" : "/login"} />;
}
