import { router } from "expo-router";
import { useState } from "react";
import * as WebBrowser from "expo-web-browser";
import { Button, Card, Copy, Page } from "@/components/app-ui";
import { useSubscriptions } from "@/lib/subscription-store";
import { useMoneyFormatter } from "@/lib/privacy";
import { getService } from "@/lib/catalog";
import { billingOccurrences, addBillingPeriod } from "@/lib/renewal-engine";
import { localDateKey, resolveManagementUrl } from "@/lib/subscription-utils";

export default function RenewalCenter() {
  const store = useSubscriptions(); const money = useMoneyFormatter();
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const today = localDateKey();
  const queue = store.subscriptions.filter((record) => record.status !== "cancelled").map((record) => ({
    record, due: record.status === "trial" && record.trialEndDate ? record.trialEndDate : billingOccurrences(record, today, addBillingPeriod(today, "yearly"), 1)[0] ?? record.renewalDate,
  })).sort((a, b) => a.due.localeCompare(b.due));
  return <Page title="Renewal action center" subtitle="Keep, review, or open official management. Decisions here never change a provider account.">
    <Button label="Quick add subscription" onPress={() => router.push("/quick-add" as never)} />
    {queue.length ? queue.map(({ record, due }) => <Card key={record.id} title={getService(record.serviceId)?.name ?? record.planName}>
      <Copy>{record.status === "trial" ? "Trial ends" : "Next projected renewal"}: {due} · {money(record.expectedNextCharge ?? record.amount, record.currency)}</Copy>
      <Copy muted>Decision: {record.renewalDecisionPlan?.action.replace(/-/g, " ") ?? "Not recorded"}</Copy>
      <Button label="Keep for this renewal" secondary disabled={busy} onPress={() => {
        setBusy(true);
        void store.updateDecisionSupport(record.id, { renewalDecisionPlan: { action: "keep", decidedAt: new Date().toISOString() }, intentTags: record.intentTags, valueCheckIn: record.valueCheckIn })
          .catch(() => setMessage("Could not save the decision.")).finally(() => setBusy(false));
      }} />
      <Button label="Review value and renewal decision" secondary onPress={() => router.push({ pathname: "/decision-plan", params: { id: record.id } } as never)} />
      <Button label="Open official management page" secondary onPress={() => void WebBrowser.openBrowserAsync(resolveManagementUrl(record)).catch(() => setMessage("Could not open the provider page."))} />
      <Button label="Details and cancellation follow-up" secondary onPress={() => router.push(`/subscription/${record.id}` as never)} />
    </Card>) : <Card title="No active subscriptions"><Copy>Add your first subscription to see upcoming charges.</Copy></Card>}
    {message ? <Copy>{message}</Copy> : null}
  </Page>;
}
