import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { Platform } from "react-native";

import { getAuthCallbackMessage, getCloudAuthErrorMessage, getSessionTokensFromAuthUrl, normalizeCloudEmail } from "@/lib/cloud-sync-auth-utils";
import { createCloudRestorePreview, isCloudSnapshot, prepareCloudSnapshot, type CloudRestorePreview } from "@/lib/cloud-sync-utils";
import { useSubscriptions } from "@/lib/subscription-store";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const LAST_SYNC_KEY = "subtrack.cloud-sync.last-sync.v1";
const PENDING_VERIFICATION_EMAIL_KEY = "subtrack.cloud-sync.pending-verification-email.v1";
const WEB_AUTH_ORIGIN = "https://subtrackdash-k768wbpy.manus.space";

function authRedirectUrl(path: "cloud-sync" | "password-reset") {
  return Platform.OS === "web" ? `${WEB_AUTH_ORIGIN}/${path}` : Linking.createURL(path);
}

function authError(error: unknown) {
  return new Error(getCloudAuthErrorMessage(error));
}

export { getAuthCallbackMessage, getCloudAuthErrorMessage, getSessionTokensFromAuthUrl } from "@/lib/cloud-sync-auth-utils";

interface CloudSyncValue {
  isConfigured: boolean;
  isLoading: boolean;
  userEmail?: string;
  profileName?: string;
  needsProfileSetup: boolean;
  pendingEmailChange?: string;
  verificationPendingEmail?: string;
  authCallbackMessage?: string;
  lastSyncAt?: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<boolean>;
  resendVerification: () => Promise<void>;
  clearVerificationPending: () => Promise<void>;
  clearAuthCallbackMessage: () => void;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (fullName: string) => Promise<void>;
  updateEmail: (email: string) => Promise<void>;
  resendEmailChange: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteCloudAccount: () => Promise<void>;
  syncNow: () => Promise<void>;
  getRestorePreview: () => Promise<CloudRestorePreview | null>;
  restoreFromCloud: () => Promise<boolean>;
}

const CloudSyncContext = createContext<CloudSyncValue | undefined>(undefined);

function asError(error: unknown) {
  return error instanceof Error ? error : new Error("Cloud sync could not be completed. Please try again.");
}

function pendingEmailFromUser(user?: Session["user"] | null) {
  const candidate = user as (Session["user"] & { new_email?: unknown }) | null | undefined;
  return typeof candidate?.new_email === "string" && candidate.new_email.trim() ? candidate.new_email : undefined;
}

export function CloudSyncProvider({ children }: PropsWithChildren) {
  const { subscriptions, settings, householdMembers, replaceLocalSnapshot } = useSubscriptions();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [lastSyncAt, setLastSyncAt] = useState<string | undefined>();
  const [verificationPendingEmail, setVerificationPendingEmail] = useState<string | undefined>();
  const [authCallbackMessage, setAuthCallbackMessage] = useState<string | undefined>();
  const [pendingEmailChange, setPendingEmailChange] = useState<string | undefined>();

  const clearVerificationPending = useCallback(async () => {
    setVerificationPendingEmail(undefined);
    await AsyncStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);
  }, []);

  const clearAuthCallbackMessage = useCallback(() => setAuthCallbackMessage(undefined), []);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    const client = supabase;
    let mounted = true;

    void Promise.all([
      client.auth.getSession(),
      AsyncStorage.getItem(LAST_SYNC_KEY),
      AsyncStorage.getItem(PENDING_VERIFICATION_EMAIL_KEY),
    ]).then(([sessionResult, storedLastSync, storedPendingEmail]) => {
      if (!mounted) return;
      setSession(sessionResult.data.session);
      setLastSyncAt(storedLastSync ?? undefined);
      setVerificationPendingEmail(sessionResult.data.session ? undefined : storedPendingEmail ?? undefined);
      setPendingEmailChange(pendingEmailFromUser(sessionResult.data.session?.user));
      setIsLoading(false);
    });

    const applyAuthUrl = async (url: string | null) => {
      if (!url) return;
      const callbackMessage = getAuthCallbackMessage(url);
      if (callbackMessage) {
        if (mounted) setAuthCallbackMessage(callbackMessage);
        return;
      }
      const tokens = getSessionTokensFromAuthUrl(url);
      if (!tokens) return;
      const { data, error } = await client.auth.setSession({ access_token: tokens.accessToken, refresh_token: tokens.refreshToken });
      if (error) {
        if (mounted) setAuthCallbackMessage(getCloudAuthErrorMessage(error));
        return;
      }
      if (mounted) setSession(data.session);
      if (mounted) setPendingEmailChange(pendingEmailFromUser(data.session?.user));
      if (data.session) void clearVerificationPending();
    };

    void Linking.getInitialURL().then(applyAuthUrl);
    const linkingSubscription = Linking.addEventListener("url", ({ url }) => void applyAuthUrl(url));
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession);
      if (mounted) setPendingEmailChange(pendingEmailFromUser(nextSession?.user));
      if (nextSession) void clearVerificationPending();
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, [clearVerificationPending]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error("Cloud sync is not configured for this build.");
    const normalizedEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (error) {
      const message = getCloudAuthErrorMessage(error);
      if (message.includes("Confirm your email")) {
        setVerificationPendingEmail(normalizedEmail);
        await AsyncStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, normalizedEmail);
      }
      throw new Error(message);
    }
    await clearVerificationPending();
  }, [clearVerificationPending]);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error("Cloud sync is not configured for this build.");
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { emailRedirectTo: authRedirectUrl("cloud-sync") },
    });
    if (error) throw authError(error);
    if (!data.session) {
      setVerificationPendingEmail(normalizedEmail);
      await AsyncStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, normalizedEmail);
      return true;
    }
    await clearVerificationPending();
    return false;
  }, [clearVerificationPending]);

  const resendVerification = useCallback(async () => {
    if (!supabase) throw new Error("Cloud sync is not configured for this build.");
    if (!verificationPendingEmail) throw new Error("Start by creating an account with the email you want to verify.");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: verificationPendingEmail,
      options: { emailRedirectTo: authRedirectUrl("cloud-sync") },
    });
    if (error) throw authError(error);
  }, [verificationPendingEmail]);

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!supabase) throw new Error("Cloud sync is not configured for this build.");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: authRedirectUrl("password-reset") });
    if (error) throw authError(error);
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) throw new Error("Cloud sync is not configured for this build.");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw authError(error);
  }, []);

  const updateProfile = useCallback(async (fullName: string) => {
    if (!supabase) throw new Error("Cloud sync is not configured for this build.");
    const normalized = fullName.trim().replace(/\s+/g, " ");
    if (!normalized) throw new Error("Enter a name to finish setting up your profile.");
    const { error } = await supabase.auth.updateUser({ data: { full_name: normalized } });
    if (error) throw authError(error);
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
  }, []);

  const updateEmail = useCallback(async (email: string) => {
    if (!supabase || !session?.user.email) throw new Error("Sign in before changing your email address.");
    const normalizedEmail = normalizeCloudEmail(email);
    if (normalizedEmail === session.user.email.toLowerCase()) {
      throw new Error("Enter a different email address to make a change.");
    }
    const { data, error } = await supabase.auth.updateUser(
      { email: normalizedEmail },
      { emailRedirectTo: authRedirectUrl("cloud-sync") },
    );
    if (error) throw authError(error);
    const nextSession = await supabase.auth.getSession();
    setSession(nextSession.data.session);
    const changedImmediately = data.user?.email?.toLowerCase() === normalizedEmail && !pendingEmailFromUser(data.user as Session["user"]);
    setPendingEmailChange(changedImmediately ? undefined : normalizedEmail);
  }, [session?.user.email]);

  const resendEmailChange = useCallback(async () => {
    if (!supabase || !pendingEmailChange) throw new Error("Start an email change before requesting another confirmation link.");
    const { error } = await supabase.auth.resend({
      type: "email_change",
      email: pendingEmailChange,
      options: { emailRedirectTo: authRedirectUrl("cloud-sync") },
    });
    if (error) throw authError(error);
  }, [pendingEmailChange]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw authError(error);
    setLastSyncAt(undefined);
    await AsyncStorage.removeItem(LAST_SYNC_KEY);
  }, []);

  const deleteCloudAccount = useCallback(async () => {
    if (!supabase || !session?.user.id) throw new Error("Sign in before deleting your cloud account.");
    const { data, error } = await supabase.functions.invoke("delete-subtrack-account", { method: "POST" });
    if (error || !data?.deleted) throw new Error("We could not delete your cloud account. Your local records were not removed.");
    await supabase.auth.signOut().catch(() => undefined);
    setSession(null);
    setLastSyncAt(undefined);
    setPendingEmailChange(undefined);
    await AsyncStorage.removeItem(LAST_SYNC_KEY);
    await clearVerificationPending();
  }, [clearVerificationPending, session?.user.id]);

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

  const getRestorePreview = useCallback(async () => {
    if (!supabase || !session?.user.id) throw new Error("Sign in before reviewing a cloud backup.");
    const { data, error } = await supabase
      .from("subtrack_sync_state")
      .select("payload, updated_at")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (error) throw asError(error);
    if (!data || !isCloudSnapshot(data.payload)) return null;
    const snapshot = { ...data.payload, syncedAt: typeof data.updated_at === "string" ? data.updated_at : data.payload.syncedAt };
    return createCloudRestorePreview(snapshot, { subscriptions, settings, householdMembers });
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
    pendingEmailChange,
    verificationPendingEmail,
    authCallbackMessage,
    lastSyncAt,
    signIn,
    signUp,
    resendVerification,
    clearVerificationPending,
    clearAuthCallbackMessage,
    requestPasswordReset,
    updatePassword,
    updateProfile,
    updateEmail,
    resendEmailChange,
    signOut,
    deleteCloudAccount,
    syncNow,
    getRestorePreview,
    restoreFromCloud,
  }), [authCallbackMessage, clearAuthCallbackMessage, clearVerificationPending, deleteCloudAccount, getRestorePreview, isLoading, lastSyncAt, pendingEmailChange, requestPasswordReset, resendEmailChange, resendVerification, restoreFromCloud, session?.user.email, session?.user.user_metadata?.full_name, signIn, signOut, signUp, syncNow, updateEmail, updatePassword, updateProfile, verificationPendingEmail]);

  return <CloudSyncContext.Provider value={value}>{children}</CloudSyncContext.Provider>;
}

export function useCloudSync() {
  const value = useContext(CloudSyncContext);
  if (!value) throw new Error("useCloudSync must be used within CloudSyncProvider");
  return value;
}
