import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { AppState, Platform } from "react-native";

import { authRedirectUrl, getAuthCode, getAuthFlowId, isRecoveryAuthUrl, isTrustedAuthUrl, LOGOUT_PENDING_KEY, normalizedProfileName, offlineSession, PENDING_VERIFICATION_EMAIL_KEY, RECOVERY_PENDING_KEY, validateAccountPassword } from "./account-utils";
import { getAuthCallbackMessage, getCloudAuthErrorMessage, normalizeCloudEmail } from "./cloud-sync-auth-utils";
import { ACTIVE_LOCAL_ACCOUNT_KEY } from "./local-account-storage";
import { isSupabaseConfigured, supabase, supabaseSessionStorageKey } from "./supabase";

if (Platform.OS === "web" && typeof window !== "undefined") WebBrowser.maybeCompleteAuthSession();

function publicWebOrigin() {
  return process.env.EXPO_PUBLIC_AUTH_REDIRECT_ORIGIN || (typeof window !== "undefined" ? window.location.origin : undefined);
}

function redirectUrl(path: "oauth/callback" | "password-reset") {
  const origin = Platform.OS === "web" ? publicWebOrigin() : undefined;
  if (Platform.OS === "web" && !origin) throw new Error("Sign-in is unavailable in this environment.");
  return authRedirectUrl(path, origin);
}

function client() {
  if (!supabase) throw new Error("Sign-in is unavailable in this build. Your local records have not been changed.");
  return supabase;
}

function accountError(error: unknown) {
  return new Error(getCloudAuthErrorMessage(error));
}

function pendingEmail(user: Session["user"] | undefined) {
  const value = (user as (Session["user"] & { new_email?: unknown }) | undefined)?.new_email;
  return typeof value === "string" && value.trim() ? value : undefined;
}

function cleanWebCallback() {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  const current = new URL(window.location.href);
  if (isTrustedAuthUrl(current.href, publicWebOrigin())) window.history.replaceState(null, "", current.pathname);
}

export interface AccountValue {
  isConfigured: boolean;
  isLoading: boolean;
  isSignedIn: boolean;
  accountId?: string;
  userEmail?: string;
  profileName?: string;
  providers: string[];
  needsProfileSetup: boolean;
  pendingEmailChange?: string;
  verificationPendingEmail?: string;
  authCallbackMessage?: string;
  initializationError?: string;
  isCompletingCallback: boolean;
  recoveryRequired: boolean;
  canAccessApp: boolean;
  retrySession: () => Promise<void>;
  completeAuthUrl: (url: string | null) => Promise<boolean>;
  clearAuthCallbackMessage: () => void;
  signInWithGoogle: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<boolean>;
  resendVerification: () => Promise<void>;
  clearVerificationPending: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (name: string) => Promise<void>;
  updateEmail: (email: string) => Promise<void>;
  resendEmailChange: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AccountContext = createContext<AccountValue | undefined>(undefined);

/** Auth knows only account details. It never reads the subscription store. */
export function AccountProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setLoading] = useState(isSupabaseConfigured);
  const [initializationError, setInitializationError] = useState<string>();
  const [verificationPendingEmail, setVerificationPendingEmail] = useState<string>();
  const [authCallbackMessage, setAuthCallbackMessage] = useState<string>();
  const [recoveryRequired, setRecoveryRequired] = useState(false);
  const [isCompletingCallback, setCompletingCallback] = useState(false);
  const sessionRef = useRef(session);
  const signedOut = useRef(false);
  const mounted = useRef(true);
  const authVersion = useRef(0);
  const googleBusy = useRef(false);
  const callbackJobs = useRef(new Map<string, Promise<boolean>>());
  const transitionTail = useRef<Promise<unknown>>(Promise.resolve());

  const transition = useCallback(<T,>(operation: () => Promise<T>) => {
    const result = transitionTail.current.catch(() => undefined).then(operation);
    transitionTail.current = result;
    return result;
  }, []);

  const publishSession = useCallback((next: Session | null) => {
    sessionRef.current = next;
    if (mounted.current) setSession(next);
  }, []);

  const clearVerificationPending = useCallback(async () => {
    await AsyncStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);
    if (mounted.current) setVerificationPendingEmail(undefined);
  }, []);

  const activateSession = useCallback(async (next: Session | null, recovery = false, version = authVersion.current) => transition(async () => {
    if (authVersion.current !== version) throw new Error("This sign-in was interrupted. Please try again.");
    if (!next?.user.id) throw new Error("Sign-in did not return an account. Please try again.");
    // A failed local write must not silently restore a deliberately logged-out account.
    await AsyncStorage.setItem(RECOVERY_PENDING_KEY, recovery ? "true" : "false");
    await AsyncStorage.removeItem(LOGOUT_PENDING_KEY);
    signedOut.current = false;
    authVersion.current++;
    publishSession(next);
    if (mounted.current) {
      setRecoveryRequired(recovery);
      setInitializationError(undefined);
      setAuthCallbackMessage(undefined);
    }
    await clearVerificationPending();
    if (Platform.OS !== "web") await client().auth.startAutoRefresh();
  }), [clearVerificationPending, publishSession, transition]);

  const completeAuthUrl = useCallback((url: string | null): Promise<boolean> => {
    if (!url || !supabase || !isTrustedAuthUrl(url, Platform.OS === "web" ? publicWebOrigin() : undefined)) return Promise.resolve(false);
    const previous = callbackJobs.current.get(url);
    if (previous) return previous;
    const operation = (async () => {
      const callbackMessage = getAuthCallbackMessage(url);
      if (callbackMessage) {
        if (mounted.current) setAuthCallbackMessage(callbackMessage);
        cleanWebCallback();
        return false;
      }
      const code = getAuthCode(url);
      // Do not accept unsolicited implicit tokens. PKCE ties the code to this device.
      if (!code) return false;
      const version = authVersion.current;
      if (mounted.current) { setCompletingCallback(true); setAuthCallbackMessage(undefined); }
      try {
        const recovery = isRecoveryAuthUrl(url);
        if (recovery) {
          await AsyncStorage.setItem(RECOVERY_PENDING_KEY, "true");
          if (mounted.current) setRecoveryRequired(true);
        }
        const flowId = getAuthFlowId(url);
        const result = await client().auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
        if (result.error) throw accountError(result.error);
        if (authVersion.current !== version) return false;
        const recovered = recovery || ("redirectType" in result.data && result.data.redirectType === "recovery");
        await activateSession(result.data.session, recovered, version);
        return true;
      } catch (error) {
        if (mounted.current && authVersion.current === version) setAuthCallbackMessage(getCloudAuthErrorMessage(error));
        return false;
      } finally {
        cleanWebCallback();
        if (mounted.current) setCompletingCallback(false);
      }
    })();
    callbackJobs.current.set(url, operation);
    return operation;
  }, [activateSession]);

  const retrySession = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    const version = authVersion.current;
    setLoading(true);
    setInitializationError(undefined);
    try {
      const [logoutMarker, recoveryMarker, pending] = await Promise.all([
        AsyncStorage.getItem(LOGOUT_PENDING_KEY),
        AsyncStorage.getItem(RECOVERY_PENDING_KEY),
        AsyncStorage.getItem(PENDING_VERIFICATION_EMAIL_KEY),
      ]);
      if (!mounted.current || authVersion.current !== version) return;
      signedOut.current = logoutMarker === "true";
      setRecoveryRequired(recoveryMarker === "true");
      setVerificationPendingEmail(pending ?? undefined);
      const initialUrl = Platform.OS === "web" && typeof window !== "undefined"
        ? window.location.href
        : await Linking.getInitialURL();
      const pendingCallback = !!initialUrl
        && isTrustedAuthUrl(initialUrl, Platform.OS === "web" ? publicWebOrigin() : undefined)
        && !!getAuthCode(initialUrl);
      if (signedOut.current) {
        publishSession(null);
        // Clearing an old session also clears PKCE verifiers. Preserve a newly
        // started login's verifier until its trusted callback has been exchanged.
        if (!pendingCallback) await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      } else {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted.current || authVersion.current !== version) return;
        let next = data.session;
        if (error) {
          const retryable = error.name === "AuthRetryableFetchError" || error.name === "TypeError";
          next = retryable ? offlineSession(await AsyncStorage.getItem(supabaseSessionStorageKey)) : null;
          if (!next) throw accountError(error);
        }
        if (!mounted.current || authVersion.current !== version) return;
        publishSession(next);
        if (next) {
          await clearVerificationPending();
          if (Platform.OS !== "web") await supabase.auth.startAutoRefresh();
        }
      }
      await completeAuthUrl(initialUrl);
    } catch {
      if (mounted.current && authVersion.current === version) {
        setInitializationError("We could not reopen your saved session. Your records are safe. Check your connection and retry.");
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [clearVerificationPending, completeAuthUrl, publishSession]);

  useEffect(() => {
    mounted.current = true;
    if (!supabase) { setLoading(false); return; }
    const auth = supabase.auth;
    const { data } = auth.onAuthStateChange((event, next) => {
      if (!mounted.current || signedOut.current) return;
      // Never await another Auth method from inside this callback.
      publishSession(next);
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryRequired(true);
        void AsyncStorage.setItem(RECOVERY_PENDING_KEY, "true").catch(() => {
          if (mounted.current) setInitializationError("Password recovery could not be saved on this device. Please retry.");
        });
      }
    });
    const links = Linking.addEventListener("url", ({ url }) => { void completeAuthUrl(url); });
    void retrySession();
    const refresh = Platform.OS !== "web" ? AppState.addEventListener("change", (state) => {
      if (state === "active" && !signedOut.current) void auth.startAutoRefresh();
      else void auth.stopAutoRefresh();
    }) : undefined;
    return () => {
      mounted.current = false;
      data.subscription.unsubscribe();
      links.remove();
      refresh?.remove();
      if (Platform.OS !== "web") void auth.stopAutoRefresh();
    };
  }, [completeAuthUrl, publishSession, retrySession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const version = authVersion.current;
    const normalized = normalizeCloudEmail(email);
    if (!password) throw new Error("Enter your password.");
    const { data, error } = await client().auth.signInWithPassword({ email: normalized, password });
    if (error) {
      if (error.code === "email_not_confirmed") {
        await AsyncStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, normalized);
        setVerificationPendingEmail(normalized);
      }
      throw accountError(error);
    }
    await activateSession(data.session, false, version);
  }, [activateSession]);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    const version = authVersion.current;
    const normalized = normalizeCloudEmail(email);
    validateAccountPassword(password);
    const fullName = name?.trim() ? normalizedProfileName(name) : undefined;
    const { data, error } = await client().auth.signUp({
      email: normalized, password,
      options: { emailRedirectTo: redirectUrl("oauth/callback"), ...(fullName ? { data: { full_name: fullName } } : {}) },
    });
    if (error) throw accountError(error);
    if (data.session) { await activateSession(data.session, false, version); return false; }
    await AsyncStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, normalized);
    setVerificationPendingEmail(normalized);
    return true;
  }, [activateSession]);

  const signInWithGoogle = useCallback(async () => {
    if (googleBusy.current) throw new Error("Google sign-in is already open.");
    googleBusy.current = true;
    try {
      setAuthCallbackMessage(undefined);
      const redirectTo = redirectUrl("oauth/callback");
      const { data, error } = await client().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: "select_account" } },
      });
      if (error) throw accountError(error);
      if (!data.url) throw new Error("Google sign-in is unavailable. Use email and password or try again.");
      if (Platform.OS === "web") {
        window.location.assign(data.url);
        return;
      }
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== "success") throw new Error("Google sign-in was cancelled. Your local records have not been changed.");
      if (!(await completeAuthUrl(result.url))) throw new Error("Google sign-in could not be completed. Try again from this device.");
    } finally {
      googleBusy.current = false;
    }
  }, [completeAuthUrl]);

  const resendVerification = useCallback(async () => {
    if (!verificationPendingEmail) throw new Error("Create an account before requesting verification.");
    const { error } = await client().auth.resend({ type: "signup", email: verificationPendingEmail, options: { emailRedirectTo: redirectUrl("oauth/callback") } });
    if (error) throw accountError(error);
  }, [verificationPendingEmail]);

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await client().auth.resetPasswordForEmail(normalizeCloudEmail(email), { redirectTo: redirectUrl("password-reset") });
    if (error) throw accountError(error);
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (!sessionRef.current) throw new Error("Open the newest recovery link on this device, or sign in before changing your password.");
    validateAccountPassword(password);
    const { error } = await client().auth.updateUser({ password });
    if (error) throw accountError(error);
    await AsyncStorage.setItem(RECOVERY_PENDING_KEY, "false");
    setRecoveryRequired(false);
  }, []);

  const updateProfile = useCallback(async (name: string) => {
    if (!sessionRef.current) throw new Error("Sign in before changing your profile.");
    const { data, error } = await client().auth.updateUser({ data: { full_name: normalizedProfileName(name) } });
    if (error) throw accountError(error);
    if (data.user && sessionRef.current) publishSession({ ...sessionRef.current, user: data.user });
  }, [publishSession]);

  const updateEmail = useCallback(async (email: string) => {
    const current = sessionRef.current;
    if (!current) throw new Error("Sign in before changing your email.");
    const normalized = normalizeCloudEmail(email);
    if (normalized === current.user.email?.toLowerCase()) throw new Error("Enter a different email address.");
    const { data, error } = await client().auth.updateUser({ email: normalized }, { emailRedirectTo: redirectUrl("oauth/callback") });
    if (error) throw accountError(error);
    if (data.user && sessionRef.current) publishSession({ ...sessionRef.current, user: data.user });
  }, [publishSession]);

  const pendingEmailChange = pendingEmail(session?.user);
  const resendEmailChange = useCallback(async () => {
    if (!pendingEmailChange) throw new Error("Start an email change before requesting another confirmation.");
    const { error } = await client().auth.resend({ type: "email_change", email: pendingEmailChange, options: { emailRedirectTo: redirectUrl("oauth/callback") } });
    if (error) throw accountError(error);
  }, [pendingEmailChange]);

  const signOut = useCallback(async () => {
    await transition(async () => {
      // Persist the lock first so a failed network logout cannot reopen local records.
      await AsyncStorage.setItem(LOGOUT_PENDING_KEY, "true");
      signedOut.current = true;
      authVersion.current++;
      publishSession(null);
      setRecoveryRequired(false);
      setAuthCallbackMessage(undefined);
      setInitializationError(undefined);
      callbackJobs.current.clear();
      await AsyncStorage.removeItem(ACTIVE_LOCAL_ACCOUNT_KEY);
    });
    await client().auth.stopAutoRefresh();
    const { error } = await client().auth.signOut({ scope: "local" });
    await clearVerificationPending();
    await AsyncStorage.setItem(RECOVERY_PENDING_KEY, "false");
    if (error) throw new Error("You are signed out on this device. The server could not be reached to revoke the session; reconnect before signing in again.");
  }, [clearVerificationPending, publishSession, transition]);

  const deleteAccount = useCallback(async () => {
    if (!sessionRef.current) throw new Error("Sign in before deleting your account.");
    const { data, error } = await client().functions.invoke("delete-subtrack-account", { method: "POST" });
    if (error || !data?.deleted) throw new Error("We could not delete your account. Your local records were not removed.");
    await signOut();
  }, [signOut]);

  const profileName = typeof session?.user.user_metadata?.full_name === "string" ? session.user.user_metadata.full_name : undefined;
  const providers = session?.user.identities?.map((identity) => identity.provider) ?? [];
  const isSignedIn = !!session?.user.id && !signedOut.current;
  const value = useMemo<AccountValue>(() => ({
    isConfigured: isSupabaseConfigured, isLoading, isSignedIn,
    accountId: isSignedIn ? session?.user.id : undefined,
    userEmail: session?.user.email, profileName, providers,
    needsProfileSetup: isSignedIn && !profileName, pendingEmailChange, verificationPendingEmail,
    authCallbackMessage, initializationError, isCompletingCallback, recoveryRequired,
    canAccessApp: isSignedIn && !isLoading && !initializationError && !recoveryRequired && !isCompletingCallback,
    retrySession, completeAuthUrl, clearAuthCallbackMessage: () => setAuthCallbackMessage(undefined),
    signInWithGoogle, signIn, signUp, resendVerification, clearVerificationPending,
    requestPasswordReset, updatePassword, updateProfile, updateEmail, resendEmailChange, signOut, deleteAccount,
  }), [authCallbackMessage, clearVerificationPending, completeAuthUrl, deleteAccount, initializationError, isCompletingCallback, isLoading, isSignedIn, pendingEmailChange, profileName, providers, recoveryRequired, requestPasswordReset, resendEmailChange, resendVerification, retrySession, session, signIn, signInWithGoogle, signOut, signUp, updateEmail, updatePassword, updateProfile, verificationPendingEmail]);

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const value = useContext(AccountContext);
  if (!value) throw new Error("useAccount must be used within AccountProvider");
  return value;
}
