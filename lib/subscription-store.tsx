import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { cancelRenewalReminder, scheduleRenewalReminder } from "@/lib/reminders";
import type { AppSettings, SubscriptionDraft, SubscriptionRecord } from "@/lib/subscription-types";

const STORAGE_KEY = "subtrack.mvp.local-state.v1";

interface StoredState {
  subscriptions: SubscriptionRecord[];
  settings: AppSettings;
}

const defaultSettings: AppSettings = {
  reminderDays: 3,
  notificationsEnabled: true,
};

interface SubscriptionStoreValue {
  isReady: boolean;
  subscriptions: SubscriptionRecord[];
  settings: AppSettings;
  addSubscription: (draft: SubscriptionDraft) => Promise<SubscriptionRecord>;
  updateSubscription: (id: string, draft: SubscriptionDraft) => Promise<SubscriptionRecord | undefined>;
  updateStatus: (id: string, status: SubscriptionRecord["status"]) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  resetLocalData: () => Promise<void>;
}

const SubscriptionStore = createContext<SubscriptionStoreValue | undefined>(undefined);

export function SubscriptionProvider({ children }: PropsWithChildren) {
  const [isReady, setIsReady] = useState(false);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  useEffect(() => {
    let isMounted = true;
    const hydrationTimeout = setTimeout(() => {
      if (isMounted) setIsReady(true);
    }, 1200);

    AsyncStorage.getItem(STORAGE_KEY)
      .then((serialized) => {
        if (!isMounted) return;
        if (!serialized) return;
        const parsed = JSON.parse(serialized) as Partial<StoredState>;
        setSubscriptions(parsed.subscriptions ?? []);
        setSettings({ ...defaultSettings, ...(parsed.settings ?? {}) });
      })
      .catch(() => {
        // If local data is malformed, start from a safe empty state.
      })
      .finally(() => {
        clearTimeout(hydrationTimeout);
        if (isMounted) setIsReady(true);
      });

    return () => {
      isMounted = false;
      clearTimeout(hydrationTimeout);
    };
  }, []);

  const persist = useCallback(async (nextSubscriptions: SubscriptionRecord[], nextSettings: AppSettings) => {
    setSubscriptions(nextSubscriptions);
    setSettings(nextSettings);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ subscriptions: nextSubscriptions, settings: nextSettings } satisfies StoredState));
  }, []);

  const addSubscription = useCallback(
    async (draft: SubscriptionDraft) => {
      const now = new Date().toISOString();
      let record: SubscriptionRecord = {
        ...draft,
        id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now,
        updatedAt: now,
      };
      if (settings.notificationsEnabled) {
        record = { ...record, reminderIdentifier: await scheduleRenewalReminder(record, settings.reminderDays) };
      }
      const next = [record, ...subscriptions];
      await persist(next, settings);
      return record;
    },
    [persist, settings, subscriptions],
  );

  const updateSubscription = useCallback(
    async (id: string, draft: SubscriptionDraft) => {
      const current = subscriptions.find((item) => item.id === id);
      if (!current) return undefined;
      await cancelRenewalReminder(current.reminderIdentifier);
      let updated: SubscriptionRecord = { ...current, ...draft, updatedAt: new Date().toISOString(), reminderIdentifier: undefined };
      if (settings.notificationsEnabled) {
        updated = { ...updated, reminderIdentifier: await scheduleRenewalReminder(updated, settings.reminderDays) };
      }
      const next = subscriptions.map((item) => (item.id === id ? updated : item));
      await persist(next, settings);
      return updated;
    },
    [persist, settings, subscriptions],
  );

  const updateStatus = useCallback(
    async (id: string, status: SubscriptionRecord["status"]) => {
      const current = subscriptions.find((item) => item.id === id);
      if (!current) return;
      if (status === "cancelled") await cancelRenewalReminder(current.reminderIdentifier);
      let updated = { ...current, status, updatedAt: new Date().toISOString() };
      if (status !== "cancelled" && settings.notificationsEnabled && !updated.reminderIdentifier) {
        updated = { ...updated, reminderIdentifier: await scheduleRenewalReminder(updated, settings.reminderDays) };
      }
      await persist(subscriptions.map((item) => (item.id === id ? updated : item)), settings);
    },
    [persist, settings, subscriptions],
  );

  const deleteSubscription = useCallback(
    async (id: string) => {
      const current = subscriptions.find((item) => item.id === id);
      await cancelRenewalReminder(current?.reminderIdentifier);
      await persist(subscriptions.filter((item) => item.id !== id), settings);
    },
    [persist, settings, subscriptions],
  );

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      const nextSettings = { ...settings, ...patch };
      const refreshed = await Promise.all(
        subscriptions.map(async (item) => {
          await cancelRenewalReminder(item.reminderIdentifier);
          const cleared = { ...item, reminderIdentifier: undefined };
          if (nextSettings.notificationsEnabled && cleared.reminderEnabled && cleared.status !== "cancelled") {
            return { ...cleared, reminderIdentifier: await scheduleRenewalReminder(cleared, nextSettings.reminderDays) };
          }
          return cleared;
        }),
      );
      await persist(refreshed, nextSettings);
    },
    [persist, settings, subscriptions],
  );

  const resetLocalData = useCallback(async () => {
    await Promise.all(subscriptions.map((item) => cancelRenewalReminder(item.reminderIdentifier)));
    await AsyncStorage.removeItem(STORAGE_KEY);
    setSubscriptions([]);
    setSettings(defaultSettings);
  }, [subscriptions]);

  const value = useMemo(
    () => ({ isReady, subscriptions, settings, addSubscription, updateSubscription, updateStatus, deleteSubscription, updateSettings, resetLocalData }),
    [addSubscription, deleteSubscription, isReady, resetLocalData, settings, subscriptions, updateSettings, updateStatus, updateSubscription],
  );

  return <SubscriptionStore.Provider value={value}>{children}</SubscriptionStore.Provider>;
}

export function useSubscriptions() {
  const value = useContext(SubscriptionStore);
  if (!value) throw new Error("useSubscriptions must be used within SubscriptionProvider");
  return value;
}
