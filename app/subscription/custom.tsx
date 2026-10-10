import { SubscriptionForm } from "@/components/subscription-form";

export default function CustomSubscriptionScreen() {
  return <SubscriptionForm prefill={{ serviceId: "custom" }} />;
}
