import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Button, Card, Copy, Field, Page } from "@/components/app-ui";
import { services, getService } from "@/lib/catalog";
import { monthlyAmount, localDateKey } from "@/lib/subscription-utils";
import { useMoneyFormatter } from "@/lib/privacy";
import { useSubscriptions } from "@/lib/subscription-store";
import type { BillingCadence } from "@/lib/subscription-types";
import { localDateSchema } from "@/lib/data-safety";

export default function RegionalPlansScreen() {
  const params = useLocalSearchParams<{ serviceId?: string }>();
  const store = useSubscriptions(); const money = useMoneyFormatter();
  const [serviceId, setServiceId] = useState(params.serviceId ?? services[0].id);
  const service = getService(serviceId)!;
  const [query, setQuery] = useState(""); const [country, setCountry] = useState("IN");
  const [currency, setCurrency] = useState(store.settings.budgetCurrency ?? "USD");
  const [quotes, setQuotes] = useState<Record<string, { amount: string; cadence: BillingCadence }>>({});
  const [verifiedOn, setVerifiedOn] = useState(localDateKey()); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  return <Page title="Regional plan comparison" subtitle="Catalog labels are references, not live quotes. Enter the price shown on the official page for your country; no currency conversion is performed.">
    <Card title="Choose your market">
      <Field label="Find a service" value={query} onChangeText={setQuery} />
      {services.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())).slice(0, query ? 8 : 3).map((item) => <Button key={item.id} label={item.name} secondary={serviceId !== item.id} onPress={() => { setServiceId(item.id); setQuotes({}); }} />)}
      <Field label="Country code" value={country} onChangeText={setCountry} maxLength={2} autoCapitalize="characters" />
      <Field label="Currency for every quote below" value={currency} onChangeText={setCurrency} maxLength={3} autoCapitalize="characters" />
      <Field label="Date you checked the official prices" value={verifiedOn} onChangeText={setVerifiedOn} />
      <Button label={`Open ${service.name}'s official page`} secondary onPress={() => void WebBrowser.openBrowserAsync(service.officialUrl).catch(() => setMessage("Could not open the provider page."))} />
      <Copy muted>Catalog verification date: not recorded per plan. Market eligibility, tax, promotions, and seat counts must be checked with the provider.</Copy>
    </Card>
    {service.plans.map((plan) => {
      const quote = quotes[plan.id] ?? { amount: "", cadence: plan.cadence };
      const valid = quote.amount.trim() !== "" && Number.isFinite(Number(quote.amount)) && Number(quote.amount) >= 0;
      return <Card key={plan.id} title={plan.name}>
        <Copy muted>Catalog reference: {plan.priceLabel} · {plan.summary}</Copy>
        <Field label="Your recurring official quote (not an introductory offer)" value={quote.amount} keyboardType="decimal-pad" onChangeText={(amount) => setQuotes((current) => ({ ...current, [plan.id]: { ...quote, amount } }))} />
        {(["monthly", "yearly"] as const).map((cadence) => <Button key={cadence} label={`${quote.cadence === cadence ? "Selected: " : ""}${cadence} billing`} secondary={quote.cadence !== cadence} onPress={() => setQuotes((current) => ({ ...current, [plan.id]: { ...quote, cadence } }))} />)}
        {valid ? <Copy>{money(monthlyAmount(Number(quote.amount), quote.cadence), currency.toUpperCase())}/month equivalent · {money(monthlyAmount(Number(quote.amount), quote.cadence) * 12, currency.toUpperCase())}/year estimate</Copy> : null}
        <Button label="Save quote as a local catalog correction draft" secondary disabled={busy || !valid} onPress={() => {
          if (!/^[A-Za-z]{2}$/.test(country) || !/^[A-Za-z]{3}$/.test(currency) || !localDateSchema.safeParse(verifiedOn).success || verifiedOn > localDateKey()) { setMessage("Enter a country code, currency, and valid verification date no later than today."); return; }
          setBusy(true);
          void store.saveCatalogCorrectionRequest({ serviceId, serviceName: service.name, country, planName: plan.name,
            observedPrice: `${currency.toUpperCase()} ${quote.amount} ${quote.cadence}`, sourceUrl: service.officialUrl,
            note: `User-entered recurring quote checked on ${verifiedOn}. Not independently verified by SubTrack.` })
            .then(() => setMessage("Quote saved locally. Your actual subscription price was not changed."))
            .catch(() => setMessage("Could not save the quote.")).finally(() => setBusy(false));
        }} />
      </Card>;
    })}
    {message ? <Copy>{message}</Copy> : null}
  </Page>;
}
