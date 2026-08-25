import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { cancelRenewalReminder, scheduleRenewalReminder } from "@/lib/reminders";
import type { AppSettings, ChargeRecognitionCase, ChargeRecognitionDraft, HouseholdMember, SubscriptionDraft, SubscriptionRecord } from "@/lib/subscription-types";
import { nextLocalDateKey } from "@/lib/subscription-utils";

const STORAGE_KEY = "subtrack.mvp.local-state.v1";

interface StoredState {
  subscriptions: SubscriptionRecord[];
  settings: AppSettings;
  householdMembers?: HouseholdMember[];
  chargeRecognitionCases?: ChargeRecognitionCase[];
}

export interface LocalSubscriptionSnapshot {
  subscriptions: SubscriptionRecord[];
  settings: AppSettings;
  householdMembers: HouseholdMember[];
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
  chargeRecognitionCases: ChargeRecognitionCase[];
  addSubscription: (draft: SubscriptionDraft) => Promise<SubscriptionRecord>;
  updateSubscription: (id: string, draft: SubscriptionDraft) => Promise<SubscriptionRecord | undefined>;
  updateDecisionSupport: (id: string, patch: Pick<SubscriptionRecord, "intentTags" | "renewalDecisionPlan" | "valueCheckIn">) => Promise<void>;
  updateStatus: (id: string, status: SubscriptionRecord["status"]) => Promise<void>;
  beginCancellationFollowUp: (id: string) => Promise<void>;
  confirmCancellation: (id: string) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  restoreSubscription: (record: SubscriptionRecord) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  addHouseholdMember: (name: string) => Promise<HouseholdMember | undefined>;
  removeHouseholdMember: (id: string) => Promise<void>;
  replaceLocalSnapshot: (snapshot: LocalSubscriptionSnapshot) => Promise<void>;
  resetLocalData: () => Promise<void>;
  saveChargeRecognitionCase: (draft: ChargeRecognitionDraft) => Promise<ChargeRecognitionCase>;
  deleteChargeRecognitionCase: (id: string) => Promise<void>;
}

const SubscriptionStore = createContext<SubscriptionStoreValue | undefined>(undefined);

export function SubscriptionProvider({ children }: PropsWithChildren) {
  const [isReady, setIsReady] = useState(false);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([ownerMember]);
  const [chargeRecognitionCases, setChargeRecognitionCases] = useState<ChargeRecognitionCase[]>([]);

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
        setChargeRecognitionCases((parsed.chargeRecognitionCases ?? []).filter((item) => item.merchantLabel?.trim()));
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

  const persist = useCallback(async (nextSubscriptions: SubscriptionRecord[], nextSettings: AppSettings, nextMembers = householdMembers, nextChargeRecognitionCases = chargeRecognitionCases) => {
    setSubscriptions(nextSubscriptions);
    setSettings(nextSettings);
    setHouseholdMembers(nextMembers);
    setChargeRecognitionCases(nextChargeRecognitionCases);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ subscriptions: nextSubscriptions, settings: nextSettings, householdMembers: nextMembers, chargeRecognitionCases: nextChargeRecognitionCases } satisfies StoredState));
  }, [chargeRecognitionCases, householdMembers]);

  const addSubscription = useCallback(
    async (draft: SubscriptionDraft) => {
      const now = new Date().toISOString();
      let record: SubscriptionRecord = {
        ...draft,
        autoRenewStatus: draft.autoRenewStatus ?? "unknown",
        cancellationState: draft.cancellationState ?? "none",
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
        autoRenewStatus: draft.autoRenewStatus ?? current.autoRenewStatus ?? "unknown",
        cancellationState: draft.cancellationState ?? current.cancellationState ?? "none",
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
      const shouldClearFollowUp = status !== "cancelled" && current.cancellationState === "pending";
      let updated = {
        ...current,
        status,
        ...(shouldClearFollowUp ? { cancellationState: "none" as const, cancellationRequestedAt: undefined, cancellationConfirmedAt: undefined, cancellationConfirmationReference: undefined, cancellationExpectedEndDate: undefined, cancellationFollowUpDate: undefined, cancellationFollowUpCompletedAt: undefined } : {}),
        updatedAt: new Date().toISOString(),
      };
      if (status !== "cancelled" && settings.notificationsEnabled && !updated.reminderIdentifier) {
        updated = { ...updated, reminderIdentifier: await scheduleRenewalReminder(updated, settings.reminderDays) };
      }
      await persist(subscriptions.map((item) => (item.id === id ? updated : item)), settings);
    },
    [persist, settings, subscriptions],
  );

  const updateDecisionSupport = useCallback(async (id: string, patch: Pick<SubscriptionRecord, "intentTags" | "renewalDecisionPlan" | "valueCheckIn">) => {
    const current = subscriptions.find((item) => item.id === id);
    if (!current) return;
    const updated: SubscriptionRecord = { ...current, ...patch, updatedAt: new Date().toISOString() };
    await persist(subscriptions.map((item) => (item.id === id ? updated : item)), settings);
  }, [persist, settings, subscriptions]);

  const beginCancellationFollowUp = useCallback(async (id: string) => {
    const current = subscriptions.find((item) => item.id === id);
    if (!current) return;
    const updated: SubscriptionRecord = {
      ...current,
      status: "uncertain",
      cancellationState: "pending",
      cancellationRequestedAt: new Date().toISOString(),
      cancellationConfirmedAt: undefined,
      cancellationFollowUpDate: nextLocalDateKey(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      cancellationFollowUpCompletedAt: undefined,
      updatedAt: new Date().toISOString(),
    };
    await persist(subscriptions.map((item) => (item.id === id ? updated : item)), settings);
  }, [persist, settings, subscriptions]);

  const confirmCancellation = useCallback(async (id: string) => {
    const current = subscriptions.find((item) => item.id === id);
    if (!current) return;
    await cancelRenewalReminder(current.reminderIdentifier);
    const updated: SubscriptionRecord = {
      ...current,
      status: "cancelled",
      cancellationState: "confirmed",
      cancellationConfirmedAt: new Date().toISOString(),
      cancellationFollowUpCompletedAt: new Date().toISOString(),
      reminderIdentifier: undefined,
      updatedAt: new Date().toISOString(),
    };
    await persist(subscriptions.map((item) => (item.id === id ? updated : item)), settings);
  }, [persist, settings, subscriptions]);

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

  const replaceLocalSnapshot = useCallback(async (snapshot: LocalSubscriptionSnapshot) => {
    const nextMembers = normalizeHouseholdMembers(snapshot.householdMembers);
    const nextSettings = { ...defaultSettings, ...snapshot.settings };
    await Promise.all(subscriptions.map((item) => cancelRenewalReminder(item.reminderIdentifier)));
    const nextSubscriptions = await Promise.all(
      snapshot.subscriptions.map(async (item) => {
        const restored: SubscriptionRecord = {
          ...item,
          reminderIdentifier: undefined,
          sharedMemberIds: normalizeSharedMemberIds(item.sharedMemberIds, nextMembers),
        };
        if (nextSettings.notificationsEnabled && restored.reminderEnabled && restored.status !== "cancelled") {
          return { ...restored, reminderIdentifier: await scheduleRenewalReminder(restored, nextSettings.reminderDays) };
        }
        return restored;
      }),
    );
    await persist(nextSubscriptions, nextSettings, nextMembers);
  }, [persist, subscriptions]);

  const resetLocalData = useCallback(async () => {
    await Promise.all(subscriptions.map((item) => cancelRenewalReminder(item.reminderIdentifier)));
    await AsyncStorage.removeItem(STORAGE_KEY);
    setSubscriptions([]);
    setSettings(defaultSettings);
    setHouseholdMembers([ownerMember]);
    setChargeRecognitionCases([]);
  }, [subscriptions]);

  const saveChargeRecognitionCase = useCallback(async (draft: ChargeRecognitionDraft) => {
    const now = new Date().toISOString();
    const record: ChargeRecognitionCase = {
      ...draft,
      merchantLabel: draft.merchantLabel.trim(),
      currency: draft.currency?.trim().toUpperCase() || undefined,
      accountAlias: draft.accountAlias?.trim() || undefined,
      notes: draft.notes?.trim() || undefined,
      id: `charge_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    await persist(subscriptions, settings, householdMembers, [record, ...chargeRecognitionCases]);
    return record;
  }, [chargeRecognitionCases, householdMembers, persist, settings, subscriptions]);

  const deleteChargeRecognitionCase = useCallback(async (id: string) => {
    await persist(subscriptions, settings, householdMembers, chargeRecognitionCases.filter((item) => item.id !== id));
  }, [chargeRecognitionCases, householdMembers, persist, settings, subscriptions]);

  const value = useMemo(
    () => ({ isReady, subscriptions, settings, householdMembers, chargeRecognitionCases, addSubscription, updateSubscription, updateDecisionSupport, updateStatus, beginCancellationFollowUp, confirmCancellation, deleteSubscription, restoreSubscription, updateSettings, addHouseholdMember, removeHouseholdMember, replaceLocalSnapshot, resetLocalData, saveChargeRecognitionCase, deleteChargeRecognitionCase }),
    [addHouseholdMember, addSubscription, beginCancellationFollowUp, chargeRecognitionCases, confirmCancellation, deleteChargeRecognitionCase, deleteSubscription, householdMembers, isReady, removeHouseholdMember, replaceLocalSnapshot, resetLocalData, restoreSubscription, saveChargeRecognitionCase, settings, subscriptions, updateDecisionSupport, updateStatus, updateSubscription],
  );

  return <SubscriptionStore.Provider value={value}>{children}</SubscriptionStore.Provider>;
}

export function useSubscriptions() {
  const value = useContext(SubscriptionStore);
  if (!value) throw new Error("useSubscriptions must be used within SubscriptionProvider");
  return value;
}
