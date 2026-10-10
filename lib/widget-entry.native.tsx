import AsyncStorage from "@react-native-async-storage/async-storage";
import { FlexWidget, TextWidget, registerWidgetTaskHandler, requestPinWidget, requestWidgetUpdate } from "react-native-android-widget";
import { Platform } from "react-native";
import { migrateLocalState } from "./data-safety";
import { addBillingPeriod, billingOccurrences } from "./renewal-engine";
import { localDateKey, formatCurrency } from "./subscription-utils";
import { ACTIVE_LOCAL_ACCOUNT_KEY, localStateKeyForAccount } from "./local-account-storage";
import { LOGOUT_PENDING_KEY, RECOVERY_PENDING_KEY } from "./account-utils";

async function widgetView() {
  let heading = "Open SubTrack"; let detail = "Review your subscriptions";
  try {
    const [accountId, loggedOut, recovery, preferenceRaw] = await Promise.all([
      AsyncStorage.getItem(ACTIVE_LOCAL_ACCOUNT_KEY), AsyncStorage.getItem(LOGOUT_PENDING_KEY),
      AsyncStorage.getItem(RECOVERY_PENDING_KEY), AsyncStorage.getItem("subtrack.device-privacy.v1"),
    ]);
    const preferences = preferenceRaw ? JSON.parse(preferenceRaw) : {};
    if (!accountId || loggedOut === "true" || recovery === "true") {
      detail = "Sign in to review your subscriptions.";
    } else if (preferences.appLockEnabled === true) {
      detail = "App lock is enabled. Unlock SubTrack to review.";
    } else {
      const raw = await AsyncStorage.getItem(await localStateKeyForAccount(AsyncStorage, accountId));
      if (!raw) detail = "No upcoming renewals. Add a subscription.";
      else {
      const state = migrateLocalState(JSON.parse(raw)); const today = localDateKey();
      const next = state.subscriptions.map((record) => ({ record, due: billingOccurrences(record, today, addBillingPeriod(today, "yearly"), 1)[0] }))
        .filter((item) => item.due).sort((a, b) => a.due!.localeCompare(b.due!))[0];
      if (next) {
        heading = next.record.planName;
        detail = `${next.due} · ${preferences.hideAmounts ? "Amount hidden" : formatCurrency(next.record.expectedNextCharge ?? next.record.amount, next.record.currency)}`;
      } else detail = "No upcoming renewals. Add a subscription.";
      }
    }
  } catch { detail = "Open the app to review or recover your records."; }
  return <FlexWidget clickAction="OPEN_APP" accessibilityLabel="Open SubTrack renewal dashboard"
    style={{ backgroundColor: "#191E0F", borderRadius: 18, padding: 16, width: "match_parent", height: "match_parent", flexDirection: "column", justifyContent: "center", flexGap: 8 }}>
    <TextWidget text="SUBTRACK · NEXT RENEWAL" style={{ color: "#C9F72D", fontSize: 12, fontWeight: "bold" }} />
    <TextWidget text={heading} maxLines={1} truncate="END" style={{ color: "#F4F2E8", fontSize: 18, fontWeight: "bold" }} />
    <TextWidget text={detail} maxLines={2} truncate="END" style={{ color: "#B2BAA3", fontSize: 13 }} />
  </FlexWidget>;
}
if (Platform.OS === "android") registerWidgetTaskHandler(async (props) => {
  if (props.widgetAction !== "WIDGET_DELETED") props.renderWidget(await widgetView());
});
export async function refreshWidget() {
  if (Platform.OS === "android") await requestWidgetUpdate({ widgetName: "SubTrackRenewals", renderWidget: widgetView });
}
export async function pinRenewalWidget() {
  if (Platform.OS !== "android") return false;
  return requestPinWidget({ widgetName: "SubTrackRenewals" });
}
