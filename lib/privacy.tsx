import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { AppState, Platform, View } from "react-native";
import { Button, Card, Copy } from "@/components/app-ui";
import { formatCurrency } from "./subscription-utils";
import { usePalette } from "./ui-theme";

const PRIVACY_KEY = "subtrack.device-privacy.v1";
interface PrivacyValue {
  hideAmounts: boolean; appLockEnabled: boolean;
  setHideAmounts(value: boolean): Promise<void>;
  setAppLockEnabled(value: boolean): Promise<void>;
}
const PrivacyContext = createContext<PrivacyValue | undefined>(undefined);
export function PrivacyProvider({ children }: PropsWithChildren) {
  const [preferences, setPreferences] = useState({ hideAmounts: false, appLockEnabled: false });
  const [loaded, setLoaded] = useState(false);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState("");
  const authenticating = useRef(false);
  const colors = usePalette();
  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(PRIVACY_KEY).then((raw) => {
      if (!mounted) return;
      let saved = { hideAmounts: false, appLockEnabled: false };
      try {
        const parsed = raw ? JSON.parse(raw) : {};
        saved = { hideAmounts: parsed.hideAmounts === true, appLockEnabled: Platform.OS === "android" && parsed.appLockEnabled === true };
      } catch { /* A malformed preference must not manufacture a lock. */ }
      setPreferences(saved); setLocked(saved.appLockEnabled); setLoaded(true);
    }).catch(() => { if (mounted) { setError("Privacy preferences could not be loaded. Reopen the app to retry."); } });
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      // The system authentication prompt can report "inactive"; leaving for the background must always re-lock.
      if (!preferences.appLockEnabled) return;
      if (state === "background" || (state === "inactive" && !authenticating.current)) setLocked(true);
    });
    return () => subscription.remove();
  }, [preferences.appLockEnabled]);
  const authenticate = useCallback(async () => {
    if (Platform.OS !== "android") throw new Error("App lock is available in the Android build, not the website.");
    authenticating.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: "Unlock SubTrack", cancelLabel: "Cancel", disableDeviceFallback: false });
      if (!result.success) throw new Error("Authentication was not completed. Your records remain locked.");
    } finally { authenticating.current = false; }
  }, []);
  const save = async (next: typeof preferences) => {
    await AsyncStorage.setItem(PRIVACY_KEY, JSON.stringify(next));
    setPreferences(next);
  };
  const value: PrivacyValue = {
    ...preferences,
    setHideAmounts: async (value) => save({ ...preferences, hideAmounts: value }),
    setAppLockEnabled: async (value) => {
      if (value && !(await LocalAuthentication.isEnrolledAsync())) throw new Error("Set up fingerprint or face authentication in Android settings first.");
      await authenticate();
      await save({ ...preferences, appLockEnabled: value }); setLocked(false);
    },
  };
  return <PrivacyContext.Provider value={value}>
    {!loaded || locked ? <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: colors.background }}>
      <Card title={loaded ? "SubTrack is locked" : "Loading privacy preferences"}>
        <Copy>{error || "Your subscriptions are private. Authenticate to continue."}</Copy>
        {loaded ? <Button label="Unlock with device authentication" onPress={() => {
          if (authenticating.current) return;
          void authenticate().then(() => { setLocked(false); setError(""); }).catch((reason) => setError(reason.message));
        }} /> : null}
      </Card>
    </View> : children}
  </PrivacyContext.Provider>;
}
export function usePrivacy() {
  const value = useContext(PrivacyContext);
  if (!value) throw new Error("usePrivacy must be used inside PrivacyProvider");
  return value;
}
export function useMoneyFormatter() {
  const { hideAmounts } = usePrivacy();
  return useCallback((amount: number, currency = "USD") => hideAmounts ? `${currency} ••••` : formatCurrency(amount, currency), [hideAmounts]);
}
