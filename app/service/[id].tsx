import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Button, Copy, Notice } from "@/components/app-ui";
import { Disclosure, FinanceLink, FinancePage, SectionHeading, Surface, financeType } from "@/components/finance-ui";
import { ServiceBadge } from "@/components/subscription-ui";
import { getService } from "@/lib/catalog";
import { usePalette } from "@/lib/ui-theme";

export default function ServiceDetailScreen() {
  const colors = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const service = getService(id);
  const [information, setInformation] = useState(false);
  const [error, setError] = useState("");
  if (!service) return <FinancePage title="Service"><Copy muted>This service is not in the catalog.</Copy></FinancePage>;
  return <FinancePage title="Service plans">
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
      <ServiceBadge serviceId={service.id} size="large" />
      <View style={{ flex: 1 }}><Text style={{ color: colors.foreground, fontFamily: financeType.bold, fontSize: 25 }}>{service.name}</Text><Text style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 12, marginTop: 3 }}>{service.category}</Text></View>
    </View>
    <Copy muted>{service.description}</Copy>
    <Button label="Add my subscription" onPress={() => router.push({ pathname: "/quick-add", params: { serviceId: service.id, name: service.name } })} />
    <View style={{ gap: 12 }}>
      <SectionHeading title="Plan options" action="Compare" onPress={() => router.push(`/compare/${service.id}`)} />
      {service.plans.map((plan) => <Surface key={plan.id}>
        <Text style={{ color: colors.foreground, fontFamily: financeType.semi, fontSize: 17 }}>{plan.name}</Text>
        <Text style={{ color: colors.primary, fontFamily: financeType.medium, fontSize: 13 }}>{plan.priceLabel}</Text>
        <Text style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 12, lineHeight: 20 }}>{plan.summary}</Text>
        {plan.features.slice(0, 3).map((feature) => <Text key={feature} style={{ color: colors.foreground, fontFamily: financeType.regular, fontSize: 12, lineHeight: 19 }}>• {feature}</Text>)}
      </Surface>)}
      <Text style={{ color: colors.muted, fontFamily: financeType.regular, fontSize: 11, lineHeight: 19 }}>Reference prices, not live quotes. Your country, tax, billing platform, or offer may change what you pay.</Text>
      <FinanceLink icon="open-outline" title="Check official prices" onPress={() => void WebBrowser.openBrowserAsync(service.officialUrl).catch(() => setError("Could not open the provider page."))} />
    </View>
    <Disclosure title="More plan information" open={information} onToggle={() => setInformation(!information)}>
      <FinanceLink icon="globe-outline" title="Compare regional prices" onPress={() => router.push({ pathname: "/regional-plans", params: { serviceId: service.id } })} />
      <FinanceLink icon="create-outline" title="Suggest a catalog correction" onPress={() => router.push({ pathname: "/catalog-correction", params: { serviceId: service.id } })} />
      <Copy muted>{service.managementHint}</Copy>
    </Disclosure>
    {error ? <Notice error>{error}</Notice> : null}
  </FinancePage>;
}
