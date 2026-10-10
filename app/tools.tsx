import { router } from "expo-router";
import { ActionLink, Card, Page } from "@/components/app-ui";

export default function ToolsScreen() {
  return <Page title="More tools">
    <Card title="Add & compare">
      <ActionLink title="Import receipts or CSV" description="Review suggestions before saving" onPress={() => router.push("/import")} />
      <ActionLink title="Regional plan prices" onPress={() => router.push("/regional-plans")} />
      <ActionLink title="Catalog price updates" onPress={() => router.push("/catalog-updates")} />
      <ActionLink title="Report a catalog correction" onPress={() => router.push("/catalog-correction")} />
    </Card>
    <Card title="Review & history">
      <ActionLink title="Subscription checkup" onPress={() => router.push("/control-center")} />
      <ActionLink title="Recognize a charge" onPress={() => router.push("/charge-recognition")} />
      <ActionLink title="Saved billing references" onPress={() => router.push("/evidence-index")} />
      <ActionLink title="Cancelled subscriptions" onPress={() => router.push("/archive-insights")} />
      <ActionLink title="Spending insights" onPress={() => router.push("/insights")} />
      <ActionLink title="Renewals & follow-ups" onPress={() => router.push("/renewals")} />
    </Card>
  </Page>;
}
