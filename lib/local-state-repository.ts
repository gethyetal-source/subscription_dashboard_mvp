import { BACKUP_KEY, STORAGE_KEY, createBackup, defaultAppSettings, defaultOwner, migrateLocalState, snapshotSchema, type ValidatedSnapshot } from "./data-safety";

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
export type LocalBackup = ReturnType<typeof createBackup>;
export const emptySnapshot = (): ValidatedSnapshot => ({
  subscriptions: [], settings: { ...defaultAppSettings }, householdMembers: [{ ...defaultOwner }],
  chargeRecognitionCases: [], catalogCorrectionRequests: [],
});

/** Serialize mutations against the latest committed state, not a stale React render. */
export class LocalStateRepository {
  current = emptySnapshot();
  recoveryError?: string;
  private tail: Promise<unknown> = Promise.resolve();
  private loaded?: Promise<void>;
  constructor(private storage: StorageAdapter, private onChange: (state: ValidatedSnapshot) => void) {}

  load() {
    if (!this.loaded) this.loaded = (async () => {
      const raw = await this.storage.getItem(STORAGE_KEY);
      if (raw) {
        try { this.current = migrateLocalState(JSON.parse(raw)); }
        catch { this.recoveryError = "Saved data could not be read. It has not been erased. Restore a backup or explicitly reset local data to continue."; }
      }
      this.onChange(this.current);
    })();
    return this.loaded;
  }

  async backups(): Promise<LocalBackup[]> {
    const raw = await this.storage.getItem(BACKUP_KEY);
    if (!raw) return [];
    try {
      const values: unknown = JSON.parse(raw);
      if (!Array.isArray(values)) return [];
      return values.flatMap((value) => {
        if (!value || typeof value !== "object" || !("data" in value) || !("exportedAt" in value) || typeof value.exportedAt !== "string") return [];
        const parsed = snapshotSchema.safeParse(value.data);
        return parsed.success ? [createBackup(parsed.data, new Date(value.exportedAt))] : [];
      }).slice(0, 5);
    } catch { return []; }
  }

  update(recipe: (state: ValidatedSnapshot) => ValidatedSnapshot | Promise<ValidatedSnapshot>, allowRecovery = false) {
    const operation = this.tail.catch(() => undefined).then(async () => {
      await this.load();
      if (this.recoveryError && !allowRecovery) throw new Error(this.recoveryError);
      const next = snapshotSchema.parse(await recipe(this.current));
      if (this.recoveryError) {
        const raw = await this.storage.getItem(STORAGE_KEY);
        if (raw) await this.storage.setItem("subtrack.unreadable-state.v1", raw);
      } else {
        const backups = await this.backups();
        await this.storage.setItem(BACKUP_KEY, JSON.stringify([createBackup(this.current), ...backups].slice(0, 5)));
      }
      await this.storage.setItem(STORAGE_KEY, JSON.stringify({ ...next, schemaVersion: 2 }));
      this.current = next;
      this.recoveryError = undefined;
      this.onChange(next);
      return next;
    });
    this.tail = operation;
    return operation;
  }
}
