import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { Platform } from "react-native";

import { useSubscriptions, type LocalSubscriptionSnapshot } from "@/lib/subscription-store";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { isCloudSnapshot, prepareCloudSnapshot } from "@/lib/cloud-sync-utils";

const LAST_SYNC_KEY = "subtrack.cloud-sync.last-sync.v1";
const WEB_AUTH_ORIGIN = "https://subtrackdash-k768wbpy.manus.space";

function authRedirectUrl(path: "cloud-sync" | "password-reset") {
  return Platform.OS === "web" ? `${WEB_AUTH_ORIGIN}/${path}` : Linking.createURL(path);
}

function authError(error: unknown) {
  const code = typeof error === "object" && error ? (error as { code?: string }).code : undefined;
  if (code === "over_email_send_rate_limit") return new Error("Supabase’s temporary email service has reached its sending limit. Wait for the limit to reset, then try again, or configure custom SMTP before inviting users.");
  return error;
}

interface CloudSyncValue {
  isConfigured: boolean;
  isLoading: boolean;
  userEmail?: string;
  profileName?: string;
  needsProfileSetup: boolean;
  lastSyncAt?: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
  restoreFromCloud: () => Promise<boolean>;
}

const CloudSyncContext = createContext<CloudSyncValue | undefined>(undefined);

function asError(error: unknown) {
  return error instanceof Error ? error : new Error("Cloud sync could not be completed. Please try again.");
}

export function getSessionTokensFromAuthUrl(url: string) {
  const fragment = url.split("#")[1] ?? "";
  const params = new URLSearchParams(fragment);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}

export function CloudSyncProvider({ children }: PropsWithChildren) {
  const { subscriptions, settings, householdMembers, replaceLocalSnapshot } = useSubscriptions();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [lastSyncAt, setLastSyncAt] = useState<string | undefined>();

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    const client = supabase;

    let mounted = true;
    void Promise.all([client.auth.getSession(), AsyncStorage.getItem(LAST_SYNC_KEY)]).then(([sessionResult, storedLastSync]) => {
      if (!mounted) return;
      setSession(sessionResult.data.session);
      setLastSyncAt(storedLastSync ?? undefined);
      setIsLoading(false);
    });

    const applyAuthUrl = async (url: string | null) => {
      if (!url) return;
      const tokens = getSessionTokensFromAuthUrl(url);
      if (!tokens) return;
      const { data } = await client.auth.setSession({ access_token: tokens.accessToken, refresh_token: tokens.refreshToken });
      if (mounted) setSession(data.session);
    };
    void Linking.getInitialURL().then(applyAuthUrl);
    const linkingSubscription = Linking.addEventListener("url", ({ url }) => void applyAuthUrl(url));

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error("Cloud sync is not configured for this build.");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error("Cloud sync is not configured for this build.");
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: authRedirectUrl("cloud-sync") },
    });
    if (error) throw authError(error);
    return !data.session;
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!supabase) throw new Error("Cloud sync is not configured for this build.");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: authRedirectUrl("password-reset") });
    if (error) throw authError(error);
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) throw new Error("Cloud sync is not configured for this build.");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }, []);

  const updateProfile = useCallback(async (fullName: string) => {
    if (!supabase) throw new Error("Cloud sync is not configured for this build.");
    const normalized = fullName.trim().replace(/\s+/g, " ");
    if (!normalized) throw new Error("Enter a name to finish setting up your profile.");
    const { error } = await supabase.auth.updateUser({ data: { full_name: normalized } });
    if (error) throw error;
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setLastSyncAt(undefined);
    await AsyncStorage.removeItem(LAST_SYNC_KEY);
  }, []);

  const syncNow = useCallback(async () => {
    if (!supabase || !session?.user.id) throw new Error("Sign in before syncing your data.");
    const snapshot = prepareCloudSnapshot({ subscriptions, settings, householdMembers });
    const { error } = await supabase.from("subtrack_sync_state").upsert(
      { user_id: session.user.id, payload: snapshot },
      { onConflict: "user_id" },
    );
    if (error) throw asError(error);
    setLastSyncAt(snapshot.syncedAt);
    await AsyncStorage.setItem(LAST_SYNC_KEY, snapshot.syncedAt);
  }, [householdMembers, session?.user.id, settings, subscriptions]);

  const restoreFromCloud = useCallback(async () => {
    if (!supabase || !session?.user.id) throw new Error("Sign in before restoring your data.");
    const { data, error } = await supabase
      .from("subtrack_sync_state")
      .select("payload, updated_at")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (error) throw asError(error);
    if (!data || !isCloudSnapshot(data.payload)) return false;
    await replaceLocalSnapshot({
      subscriptions: data.payload.subscriptions,
      settings: data.payload.settings,
      householdMembers: data.payload.householdMembers,
    });
    const restoredAt = typeof data.updated_at === "string" ? data.updated_at : data.payload.syncedAt;
    setLastSyncAt(restoredAt);
    await AsyncStorage.setItem(LAST_SYNC_KEY, restoredAt);
    return true;
  }, [replaceLocalSnapshot, session?.user.id]);

  const value = useMemo<CloudSyncValue>(() => ({
    isConfigured: isSupabaseConfigured,
    isLoading,
    userEmail: session?.user.email,
    profileName: typeof session?.user.user_metadata?.full_name === "string" ? session.user.user_metadata.full_name : undefined,
    needsProfileSetup: Boolean(session && !session.user.user_metadata?.full_name),
    lastSyncAt,
    signIn,
    signUp,
    requestPasswordReset,
    updatePassword,
    updateProfile,
    signOut,
    syncNow,
    restoreFromCloud,
  }), [isLoading, lastSyncAt, requestPasswordReset, restoreFromCloud, session?.user.email, session?.user.user_metadata?.full_name, signIn, signOut, signUp, syncNow, updatePassword, updateProfile]);

  return <CloudSyncContext.Provider value={value}>{children}</CloudSyncContext.Provider>;
}

export function useCloudSync() {
  const value = useContext(CloudSyncContext);
  if (!value) throw new Error("useCloudSync must be used within CloudSyncProvider");
  return value;
}
