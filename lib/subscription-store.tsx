import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { portableSnapshot, snapshotSchema, type ValidatedSnapshot } from "@/lib/data-safety";
import { LocalStateRepository, emptySnapshot, type LocalBackup } from "@/lib/local-state-repository";
import { cancelSubscriptionReminders, scheduleSubscriptionReminders } from "@/lib/reminders";
import type { AppSettings, CatalogCorrectionDraft, CatalogCorrectionRequest, ChargeRecognitionCase, ChargeRecognitionDraft, HouseholdMember, PlanChangeEvent, SavingsEntry, SubscriptionDraft, SubscriptionRecord } from "@/lib/subscription-types";
import { localDateKey } from "@/lib/subscription-utils";
import { BACKUP_KEY } from "@/lib/data-safety";

export interface LocalSubscriptionSnapshot {
  subscriptions: SubscriptionRecord[];
  settings: AppSettings;
  householdMembers: HouseholdMember[];
  chargeRecognitionCases?: ChargeRecognitionCase[];
  catalogCorrectionRequests?: CatalogCorrectionRequest[];
  savingsEntries?: SavingsEntry[];
}
interface SubscriptionStoreValue extends LocalSubscriptionSnapshot {
  isReady: boolean;
  storageError?: string;
  chargeRecognitionCases: ChargeRecognitionCase[];
  catalogCorrectionRequests: CatalogCorrectionRequest[];
  addSubscription(draft: SubscriptionDraft): Promise<SubscriptionRecord>;
  updateSubscription(id: string, draft: SubscriptionDraft): Promise<SubscriptionRecord | undefined>;
  updateDecisionSupport(id: string, patch: Pick<SubscriptionRecord, "intentTags" | "renewalDecisionPlan" | "valueCheckIn">): Promise<void>;
  updateStatus(id: string, status: SubscriptionRecord["status"]): Promise<void>;
  beginCancellationFollowUp(id: string): Promise<void>;
  confirmCancellation(id: string): Promise<void>;
  deleteSubscription(id: string): Promise<void>;
  restoreSubscription(record: SubscriptionRecord): Promise<void>;
  updateSettings(patch: Partial<AppSettings>): Promise<void>;
  addHouseholdMember(name: string): Promise<HouseholdMember | undefined>;
  removeHouseholdMember(id: string): Promise<void>;
  replaceLocalSnapshot(snapshot: LocalSubscriptionSnapshot): Promise<void>;
  getLocalBackups(): Promise<LocalBackup[]>;
  resetLocalData(): Promise<void>;
  saveChargeRecognitionCase(draft: ChargeRecognitionDraft): Promise<ChargeRecognitionCase>;
  deleteChargeRecognitionCase(id: string): Promise<void>;
  saveCatalogCorrectionRequest(draft: CatalogCorrectionDraft): Promise<CatalogCorrectionRequest>;
  deleteCatalogCorrectionRequest(id: string): Promise<void>;
  addSavingsEntry(draft: Omit<SavingsEntry, "id">): Promise<void>;
  deleteSavingsEntry(id: string): Promise<void>;
}
const Store = createContext<SubscriptionStoreValue | undefined>(undefined);
const newId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toISOString();

function normalizeRecord(record: SubscriptionRecord, members: HouseholdMember[]): SubscriptionRecord {
  return {
    ...record, currency: record.currency.trim().toUpperCase(),
    autoRenewStatus: record.autoRenewStatus ?? "unknown", cancellationState: record.cancellationState ?? "none",
    sharedMemberIds: [...new Set(["owner", ...(record.sharedMemberIds ?? [])])].filter((id) => members.some((member) => member.id === id)),
  };
}
async function withReminders(record: SubscriptionRecord, settings: AppSettings) {
  await cancelSubscriptionReminders(record);
  const identifiers = settings.notificationsEnabled ? await scheduleSubscriptionReminders(record, settings.reminderDays) : [];
  return { ...record, reminderIdentifier: identifiers[0], reminderIdentifiers: identifiers };
}
export function SubscriptionProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<ValidatedSnapshot>(emptySnapshot);
  const [isReady, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string>();
  const [repository] = useState(() => new LocalStateRepository(AsyncStorage, setState));
  useEffect(() => {
    let mounted = true;
    void repository.load().then(() => { if (mounted) { setStorageError(repository.recoveryError); setReady(true); } })
      .catch(() => { if (mounted) { setStorageError("Storage is unavailable. Retry opening the app before making changes."); } });
    return () => { mounted = false; };
  }, [repository]);

  const actions = useMemo(() => {
    const update = async (recipe: (current: ValidatedSnapshot) => ValidatedSnapshot | Promise<ValidatedSnapshot>, recovery = false) => {
      await repository.update(recipe, recovery);
      setStorageError(repository.recoveryError);
    };
    const modify = async (id: string, transform: (record: SubscriptionRecord, current: ValidatedSnapshot) => SubscriptionRecord) => {
      let result: SubscriptionRecord | undefined;
      await update(async (current) => {
        const record = current.subscriptions.find((item) => item.id === id);
        if (!record) return current;
        const candidate = normalizeRecord({ ...transform(record, current), updatedAt: now() }, current.householdMembers);
        snapshotSchema.parse({ ...current, subscriptions: current.subscriptions.map((item) => item.id === id ? candidate : item) });
        result = await withReminders(candidate, current.settings);
        return { ...current, subscriptions: current.subscriptions.map((item) => item.id === id ? result! : item) };
      });
      return result;
    };
    return {
      async addSubscription(draft: SubscriptionDraft) {
        let record!: SubscriptionRecord;
        await update(async (current) => {
          record = normalizeRecord({ ...draft, id: newId("sub"), createdAt: now(), updatedAt: now() }, current.householdMembers);
          // Validate before scheduling a notification or mutating storage.
          snapshotSchema.parse({ ...current, subscriptions: [record, ...current.subscriptions] });
          record = await withReminders(record, current.settings);
          return { ...current, subscriptions: [record, ...current.subscriptions] };
        });
        return record;
      },
      async updateSubscription(id: string, draft: SubscriptionDraft) {
        return modify(id, (record) => {
          const changed = record.planName !== draft.planName || record.amount !== draft.amount || record.currency !== draft.currency.toUpperCase() || record.cadence !== draft.cadence;
          const event: PlanChangeEvent = {
            id: newId("change"), changedAt: now(), previousPlanName: record.planName, nextPlanName: draft.planName,
            previousAmount: record.amount, nextAmount: draft.amount, previousCurrency: record.currency, nextCurrency: draft.currency.toUpperCase(),
            previousCadence: record.cadence, nextCadence: draft.cadence,
          };
          return { ...record, ...draft, planChangeHistory: changed ? [event, ...(record.planChangeHistory ?? [])].slice(0, 50) : record.planChangeHistory };
        });
      },
      async updateDecisionSupport(id: string, patch: Pick<SubscriptionRecord, "intentTags" | "renewalDecisionPlan" | "valueCheckIn">) { await modify(id, (record) => ({ ...record, ...patch })); },
      async updateStatus(id: string, status: SubscriptionRecord["status"]) {
        await modify(id, (record) => ({ ...record, status,
          ...(status !== "cancelled" && record.cancellationState === "confirmed" ? { cancellationState: "none", cancellationConfirmedAt: undefined, cancellationFollowUpCompletedAt: undefined } : {}),
        }));
      },
      async beginCancellationFollowUp(id: string) {
        const followUp = new Date(); followUp.setDate(followUp.getDate() + 7);
        await modify(id, (record) => ({
          ...record, status: "uncertain", cancellationState: "pending", cancellationRequestedAt: now(),
          cancellationConfirmedAt: undefined, cancellationFollowUpCompletedAt: undefined,
          cancellationFollowUpDate: localDateKey(followUp),
        }));
      },
      async confirmCancellation(id: string) {
        await modify(id, (record) => ({ ...record, status: "cancelled", cancellationState: "confirmed", cancellationConfirmedAt: now(), cancellationFollowUpCompletedAt: now() }));
      },
      async deleteSubscription(id: string) {
        await update(async (current) => {
          const record = current.subscriptions.find((item) => item.id === id);
          if (record) await cancelSubscriptionReminders(record);
          return { ...current, subscriptions: current.subscriptions.filter((item) => item.id !== id) };
        });
      },
      async restoreSubscription(record: SubscriptionRecord) {
        await update(async (current) => {
          if (current.subscriptions.some((item) => item.id === record.id)) return current;
          const restored = await withReminders(normalizeRecord({ ...record, reminderIdentifier: undefined, reminderIdentifiers: undefined, updatedAt: now() }, current.householdMembers), current.settings);
          return { ...current, subscriptions: [restored, ...current.subscriptions] };
        });
      },
      async updateSettings(patch: Partial<AppSettings>) {
        await update(async (current) => {
          const settings = { ...current.settings, ...patch };
          snapshotSchema.parse({ ...current, settings });
          const refresh = "reminderDays" in patch || "notificationsEnabled" in patch;
          const subscriptions = refresh ? await Promise.all(current.subscriptions.map((item) => withReminders(item, settings))) : current.subscriptions;
          return { ...current, settings, subscriptions };
        });
      },
      async addHouseholdMember(name: string) {
        let member: HouseholdMember | undefined;
        await update((current) => {
          const cleanName = name.trim().replace(/\s+/g, " ");
          if (!cleanName || current.householdMembers.some((item) => item.name.toLowerCase() === cleanName.toLowerCase())) return current;
          member = { id: newId("member"), name: cleanName, color: "#667D28", createdAt: now() };
          return { ...current, householdMembers: [...current.householdMembers, member] };
        });
        return member;
      },
      async removeHouseholdMember(id: string) {
        if (id === "owner") return;
        await update((current) => ({
          ...current, householdMembers: current.householdMembers.filter((item) => item.id !== id),
          subscriptions: current.subscriptions.map((item) => item.sharedMemberIds?.includes(id)
            ? { ...item, sharedMemberIds: item.sharedMemberIds.filter((memberId) => memberId !== id), sharedMemberShares: undefined }
            : item),
        }));
      },
      async replaceLocalSnapshot(snapshot: LocalSubscriptionSnapshot) {
        const safe = portableSnapshot(snapshot);
        const members = safe.householdMembers.some((member) => member.id === "owner") ? safe.householdMembers : [emptySnapshot().householdMembers[0], ...safe.householdMembers];
        await update(async (current) => {
          await Promise.all(current.subscriptions.map(cancelSubscriptionReminders));
          return { ...safe, householdMembers: members, subscriptions: await Promise.all(safe.subscriptions.map((item) => withReminders(normalizeRecord(item, members), safe.settings))) };
        }, true);
      },
      getLocalBackups: () => repository.backups(),
      async resetLocalData() {
        await update(async (current) => {
          await Promise.all(current.subscriptions.map(cancelSubscriptionReminders));
          return emptySnapshot();
        }, true);
        await AsyncStorage.multiRemove([BACKUP_KEY, "subtrack.unreadable-state.v1"]);
      },
      async saveChargeRecognitionCase(draft: ChargeRecognitionDraft) {
        const record = { ...draft, merchantLabel: draft.merchantLabel.trim(), currency: draft.currency?.toUpperCase(), id: newId("charge"), createdAt: now(), updatedAt: now() };
        await update((current) => ({ ...current, chargeRecognitionCases: [record, ...(current.chargeRecognitionCases ?? [])] }));
        return record;
      },
      async deleteChargeRecognitionCase(id: string) { await update((current) => ({ ...current, chargeRecognitionCases: current.chargeRecognitionCases?.filter((item) => item.id !== id) })); },
      async saveCatalogCorrectionRequest(draft: CatalogCorrectionDraft) {
        const record = { ...draft, serviceName: draft.serviceName.trim(), country: draft.country.trim().toUpperCase(), id: newId("correction"), createdAt: now() };
        await update((current) => ({ ...current, catalogCorrectionRequests: [record, ...(current.catalogCorrectionRequests ?? [])] }));
        return record;
      },
      async deleteCatalogCorrectionRequest(id: string) { await update((current) => ({ ...current, catalogCorrectionRequests: current.catalogCorrectionRequests?.filter((item) => item.id !== id) })); },
      async addSavingsEntry(draft: Omit<SavingsEntry, "id">) { await update((current) => ({ ...current, savingsEntries: [{ ...draft, id: newId("saving") }, ...(current.savingsEntries ?? [])] })); },
      async deleteSavingsEntry(id: string) { await update((current) => ({ ...current, savingsEntries: current.savingsEntries?.filter((item) => item.id !== id) })); },
    };
  }, [repository]);
  const value = useMemo(() => ({ ...state, chargeRecognitionCases: state.chargeRecognitionCases ?? [], catalogCorrectionRequests: state.catalogCorrectionRequests ?? [], isReady, storageError, ...actions }), [state, isReady, storageError, actions]);
  return <Store.Provider value={value}>{children}</Store.Provider>;
}
export function useSubscriptions() {
  const value = useContext(Store);
  if (!value) throw new Error("useSubscriptions must be used within SubscriptionProvider");
  return value;
}
