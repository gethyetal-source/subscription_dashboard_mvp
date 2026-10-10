import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, processLock } from "@supabase/supabase-js";
import { Platform } from "react-native";
import { isPublicSupabaseKey } from "./account-utils";

const projectUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const isServerRender = Platform.OS === "web" && typeof window === "undefined";
const serverStorage = {
  getItem: async (_key: string) => null,
  setItem: async (_key: string, _value: string) => undefined,
  removeItem: async (_key: string) => undefined,
};

function hasSafePublicConfig() {
  if (!projectUrl || !publishableKey || !isPublicSupabaseKey(publishableKey)) return false;
  try {
    const url = new URL(projectUrl);
    return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash;
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = hasSafePublicConfig();
export const supabaseSessionStorageKey = isSupabaseConfigured && projectUrl
  ? `sb-${new URL(projectUrl).hostname.split(".")[0]}-auth-token`
  : "subtrack.unconfigured-auth";

export const supabase = isSupabaseConfigured
  ? createClient(projectUrl!, publishableKey!, {
      auth: {
        storage: isServerRender ? serverStorage : AsyncStorage,
        storageKey: supabaseSessionStorageKey,
        autoRefreshToken: !isServerRender,
        persistSession: !isServerRender,
        flowType: "pkce",
        experimental: { appendPkceFlowIdToRedirects: true },
        // One trusted callback handler owns code exchanges on both platforms.
        detectSessionInUrl: false,
        ...(Platform.OS !== "web" ? { lock: processLock } : {}),
      },
    })
  : null;
