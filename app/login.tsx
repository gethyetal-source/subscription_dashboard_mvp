import { Redirect } from "expo-router";
import { AccountLogin } from "@/components/account-login";
import { useAccount } from "@/lib/account";

export default function LoginScreen() {
  const account = useAccount();
  if (!account.isLoading && account.recoveryRequired && account.isSignedIn) return <Redirect href="/password-reset" />;
  if (account.canAccessApp) return <Redirect href="/(tabs)" />;
  return <AccountLogin />;
}
