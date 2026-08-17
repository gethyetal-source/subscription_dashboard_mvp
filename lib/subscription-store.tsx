import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { cancelRenewalReminder, scheduleRenewalReminder } from "@/lib/reminders";
import type { AppSettings, HouseholdMember, SubscriptionDraft, SubscriptionRecord } from "@/lib/subscription-types";

const STORAGE_KEY = "subtrack.mvp.local-state.v1";

interface StoredState {
  subscriptions: SubscriptionRecord[];
  settings: AppSettings;
  householdMembers?: HouseholdMember[];
}

const defaultSettings: AppSettings = {
  reminderDays: 3,
  notificationsEnabled: true,
  dashboardSort: "upcoming",
  monthlyBudget: 0,
};

const ownerMember: HouseholdMember = {
  id: "owner",
  name: "You",
  color: "#1A73E8",
  isOwner: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const memberColors = ["#1A73E8", "#188038", "#A142F4", "#F29900", "#C5221F", "#00838F"];

function normalizeHouseholdMembers(members?: HouseholdMember[]) {
  return [ownerMember, ...(members ?? []).filter((member) => member.id !== ownerMember.id && member.name.trim())];
}

function normalizeSharedMemberIds(memberIds: string[] | undefined, members: HouseholdMember[]) {
  const available = new Set(members.map((member) => member.id));
  const normalized = Array.from(new Set([ownerMember.id, ...(memberIds ?? [])])).filter((id) => available.has(id));
  return normalized.length ? normalized : [ownerMember.id];
}

interface SubscriptionStoreValue {
  isReady: boolean;
  subscriptions: SubscriptionRecord[];
  settings: AppSettings;
  householdMembers: HouseholdMember[];
  addSubscription: (draft: SubscriptionDraft) => Promise<SubscriptionRecord>;
  updateSubscription: (id: string, draft: SubscriptionDraft) => Promise<SubscriptionRecord | undefined>;
  updateStatus: (id: string, status: SubscriptionRecord["status"]) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  restoreSubscription: (record: SubscriptionRecord) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  addHouseholdMember: (name: string) => Promise<HouseholdMember | undefined>;
  removeHouseholdMember: (id: string) => Promise<void>;
  resetLocalData: () => Promise<void>;
}

const SubscriptionStore = createContext<SubscriptionStoreValue | undefined>(undefined);

export function SubscriptionProvider({ children }: PropsWithChildren) {
  const [isReady, setIsReady] = useState(false);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([ownerMember]);

  useEffect(() => {
    let isMounted = true;
    const hydrationTimeout = setTimeout(() => {
      if (isMounted) setIsReady(true);
    }, 1200);

    AsyncStorage.getItem(STORAGE_KEY)
      .then((serialized) => {
        if (!isMounted || !serialized) return;
        const parsed = JSON.parse(serialized) as Partial<StoredState>;
        const nextMembers = normalizeHouseholdMembers(parsed.householdMembers);
        setHouseholdMembers(nextMembers);
        setSubscriptions((parsed.subscriptions ?? []).map((item) => ({
          ...item,
          sharedMemberIds: normalizeSharedMemberIds(item.sharedMemberIds, nextMembers),
        })));
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

  const persist = useCallback(async (nextSubscriptions: SubscriptionRecord[], nextSettings: AppSettings, nextMembers = householdMembers) => {
    setSubscriptions(nextSubscriptions);
    setSettings(nextSettings);
    setHouseholdMembers(nextMembers);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ subscriptions: nextSubscriptions, settings: nextSettings, householdMembers: nextMembers } satisfies StoredState));
  }, [householdMembers]);

  const addSubscription = useCallback(
    async (draft: SubscriptionDraft) => {
      const now = new Date().toISOString();
      let record: SubscriptionRecord = {
        ...draft,
        sharedMemberIds: normalizeSharedMemberIds(draft.sharedMemberIds, householdMembers),
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
    [householdMembers, persist, settings, subscriptions],
  );

  const updateSubscription = useCallback(
    async (id: string, draft: SubscriptionDraft) => {
      const current = subscriptions.find((item) => item.id === id);
      if (!current) return undefined;
      await cancelRenewalReminder(current.reminderIdentifier);
      let updated: SubscriptionRecord = {
        ...current,
        ...draft,
        sharedMemberIds: normalizeSharedMemberIds(draft.sharedMemberIds ?? current.sharedMemberIds, householdMembers),
        updatedAt: new Date().toISOString(),
        reminderIdentifier: undefined,
      };
      if (settings.notificationsEnabled) {
        updated = { ...updated, reminderIdentifier: await scheduleRenewalReminder(updated, settings.reminderDays) };
      }
      const next = subscriptions.map((item) => (item.id === id ? updated : item));
      await persist(next, settings);
      return updated;
    },
    [householdMembers, persist, settings, subscriptions],
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

  const restoreSubscription = useCallback(
    async (record: SubscriptionRecord) => {
      if (subscriptions.some((item) => item.id === record.id)) return;
      let restored: SubscriptionRecord = {
        ...record,
        sharedMemberIds: normalizeSharedMemberIds(record.sharedMemberIds, householdMembers),
        reminderIdentifier: undefined,
        updatedAt: new Date().toISOString(),
      };
      if (settings.notificationsEnabled && restored.reminderEnabled && restored.status !== "cancelled") {
        restored = { ...restored, reminderIdentifier: await scheduleRenewalReminder(restored, settings.reminderDays) };
      }
      await persist([restored, ...subscriptions], settings);
    },
    [householdMembers, persist, settings, subscriptions],
  );

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      const nextSettings = { ...settings, ...patch };
      const shouldRefreshReminders = Object.prototype.hasOwnProperty.call(patch, "reminderDays") || Object.prototype.hasOwnProperty.call(patch, "notificationsEnabled");
      if (!shouldRefreshReminders) {
        await persist(subscriptions, nextSettings);
        return;
      }
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

  const addHouseholdMember = useCallback(async (name: string) => {
    const normalizedName = name.trim().replace(/\s+/g, " ");
    if (!normalizedName || householdMembers.some((member) => member.name.toLowerCase() === normalizedName.toLowerCase())) return undefined;
    const member: HouseholdMember = {
      id: `member_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: normalizedName,
      color: memberColors[householdMembers.length % memberColors.length],
      createdAt: new Date().toISOString(),
    };
    await persist(subscriptions, settings, [...householdMembers, member]);
    return member;
  }, [householdMembers, persist, settings, subscriptions]);

  const removeHouseholdMember = useCallback(async (id: string) => {
    if (id === ownerMember.id) return;
    const nextMembers = householdMembers.filter((member) => member.id !== id);
    const nextSubscriptions = subscriptions.map((item) => ({
      ...item,
      sharedMemberIds: normalizeSharedMemberIds(item.sharedMemberIds?.filter((memberId) => memberId !== id), nextMembers),
    }));
    await persist(nextSubscriptions, settings, nextMembers);
  }, [householdMembers, persist, settings, subscriptions]);

  const resetLocalData = useCallback(async () => {
    await Promise.all(subscriptions.map((item) => cancelRenewalReminder(item.reminderIdentifier)));
    await AsyncStorage.removeItem(STORAGE_KEY);
    setSubscriptions([]);
    setSettings(defaultSettings);
    setHouseholdMembers([ownerMember]);
  }, [subscriptions]);

  const value = useMemo(
    () => ({ isReady, subscriptions, settings, householdMembers, addSubscription, updateSubscription, updateStatus, deleteSubscription, restoreSubscription, updateSettings, addHouseholdMember, removeHouseholdMember, resetLocalData }),
    [addHouseholdMember, addSubscription, deleteSubscription, householdMembers, isReady, removeHouseholdMember, resetLocalData, restoreSubscription, settings, subscriptions, updateSettings, updateStatus, updateSubscription],
  );

  return <SubscriptionStore.Provider value={value}>{children}</SubscriptionStore.Provider>;
}

export function useSubscriptions() {
  const value = useContext(SubscriptionStore);
  if (!value) throw new Error("useSubscriptions must be used within SubscriptionProvider");
  return value;
}
