import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Button, Copy, Notice } from "@/components/app-ui";
import { FinanceLink, FinancePage, Surface, financeType } from "@/components/finance-ui";
import { ServiceBadge } from "@/components/subscription-ui";
import { getService } from "@/lib/catalog";
import { usePalette } from "@/lib/ui-theme";

export default function ComparePlansScreen() {
  const colors = usePalette();
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const service = getService(serviceId);
  const [error, setError] = useState("");
  if (!service) return <FinancePage title="Compare plans"><Copy muted>This service is not in the catalog.</Copy></FinancePage>;
  return <FinancePage title="Compare plans">
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><ServiceBadge serviceId={service.id} /><Text style={{ color: colors.foreground, fontFamily: financeType.semi, fontSize: 22 }}>{service.name}</Text></View>
    <Copy muted>Compare reference plans here. Confirm current prices and eligibility with the provider before changing anything.</Copy>
    {service.plans.map((plan) => <Surface key={plan.id}>
      <Text style={{ color: colors.foreground, fontFamily: financeType.semi, fontSize: 19 }}>{plan.name}</Text>
      <Text style={{ color: colors.primary, fontFamily: financeType.medium, fontSize: 14 }}>{plan.priceLabel}</Text>
      <Copy muted>{plan.summary}</Copy>
      {plan.features.map((feature) => <Text key={feature} style={{ color: colors.foreground, fontFamily: financeType.regular, fontSize: 12, lineHeight: 20 }}>• {feature}</Text>)}
    </Surface>)}
    <FinanceLink icon="globe-outline" title="Compare prices in your region" onPress={() => router.push({ pathname: "/regional-plans", params: { serviceId: service.id } })} />
    <FinanceLink icon="open-outline" title="Open official plans" onPress={() => void WebBrowser.openBrowserAsync(service.officialUrl).catch(() => setError("Could not open the provider page."))} />
    {error ? <Notice error>{error}</Notice> : null}
    <Button label="Add my actual subscription" onPress={() => router.push({ pathname: "/quick-add", params: { serviceId: service.id, name: service.name } })} />
  </FinancePage>;
}
