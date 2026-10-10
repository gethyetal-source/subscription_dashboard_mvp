import { router, useLocalSearchParams } from "expo-router";
import { Button, Copy } from "@/components/app-ui";
import { FinancePage } from "@/components/finance-ui";
import { SubscriptionForm } from "@/components/subscription-form";
import { useSubscriptions } from "@/lib/subscription-store";

export default function EditSubscriptionScreen() {
  const { subscriptionId, serviceId, section } = useLocalSearchParams<{ subscriptionId?: string; serviceId?: string; section?: string }>();
  const store = useSubscriptions();
  const existing = store.subscriptions.find((record) => record.id === subscriptionId);
  if (!store.isReady) return <FinancePage title="Subscription"><Copy muted>Loading your subscription…</Copy></FinancePage>;
  if (subscriptionId && !existing) return <FinancePage title="Subscription not found"><Copy muted>This record is no longer on this device.</Copy><Button label="View subscriptions" onPress={() => router.replace("/(tabs)/subscriptions")} /></FinancePage>;
  return <SubscriptionForm key={existing?.id ?? serviceId ?? "custom"} existing={existing} prefill={{ serviceId: serviceId ?? "custom" }} initialSection={section} />;
}
