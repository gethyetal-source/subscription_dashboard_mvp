import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { useSubscriptions, type LocalSubscriptionSnapshot } from "@/lib/subscription-store";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { isCloudSnapshot, prepareCloudSnapshot } from "@/lib/cloud-sync-utils";

const LAST_SYNC_KEY = "subtrack.cloud-sync.last-sync.v1";

interface CloudSyncValue {
  isConfigured: boolean;
  isLoading: boolean;
  userEmail?: string;
  lastSyncAt?: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
  restoreFromCloud: () => Promise<boolean>;
}

const CloudSyncContext = createContext<CloudSyncValue | undefined>(undefined);

function asError(error: unknown) {
  return error instanceof Error ? error : new Error("Cloud sync could not be completed. Please try again.");
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

    let mounted = true;
    void Promise.all([supabase.auth.getSession(), AsyncStorage.getItem(LAST_SYNC_KEY)]).then(([sessionResult, storedLastSync]) => {
      if (!mounted) return;
      setSession(sessionResult.data.session);
      setLastSyncAt(storedLastSync ?? undefined);
      setIsLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error("Cloud sync is not configured for this build.");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error("Cloud sync is not configured for this build.");
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) throw error;
    return !data.session;
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
    lastSyncAt,
    signIn,
    signUp,
    signOut,
    syncNow,
    restoreFromCloud,
  }), [isLoading, lastSyncAt, restoreFromCloud, session?.user.email, signIn, signOut, signUp, syncNow]);

  return <CloudSyncContext.Provider value={value}>{children}</CloudSyncContext.Provider>;
}

export function useCloudSync() {
  const value = useContext(CloudSyncContext);
  if (!value) throw new Error("useCloudSync must be used within CloudSyncProvider");
  return value;
}
