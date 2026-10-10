import { router } from "expo-router";
import { Button, Card, Copy, Page } from "@/components/app-ui";

export default function SharedHouseholdScreen() {
  return <Page title="Household plans">
    <Card title="Local sharing only">
      <Copy muted>Cross-device household sharing is turned off. Plan details and cost splits stay on this device and are not sent to Supabase.</Copy>
      <Button label="Manage local shared plans" onPress={() => router.replace("/household")} />
    </Card>
  </Page>;
}
