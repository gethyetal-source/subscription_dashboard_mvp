import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const migrationsDirectory = join(dirname(fileURLToPath(import.meta.url)), "..", "supabase", "migrations");

const owner = "11111111-1111-4111-8111-111111111111";
const viewer = "22222222-2222-4222-8222-222222222222";
const outsider = "33333333-3333-4333-8333-333333333333";
let database: PGlite;
let householdId: string;
const payload = { schemaVersion: 1, subscriptions: [], householdMembers: [], settings: {} };

async function asUser(user: string | null, role = "authenticated") {
  await database.exec(`reset role; set role ${role};`);
  await database.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? ""]);
}
async function scalar<T>(sql: string, parameters: unknown[] = []) {
  return Object.values((await database.query<Record<string, T>>(sql, parameters)).rows[0])[0];
}
describe("cloud migration security (isolated PostgreSQL)", () => {
  beforeAll(async () => {
    database = new PGlite();
    await database.exec(`
      create schema auth;
      create role anon;
      create role authenticated;
      create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to anon, authenticated;
      insert into auth.users values
        ('${owner}', 'owner@example.test', now()),
        ('${viewer}', 'viewer@example.test', now()),
        ('${outsider}', 'outsider@example.test', now());
    `);
    await database.exec(readFileSync(join(migrationsDirectory, "202610040001_subtrack_sync.sql"), "utf8"));
    await database.exec(readFileSync(join(migrationsDirectory, "202610040002_household_collaboration.sql"), "utf8"));
  }, 30_000);
  afterAll(async () => { await database?.close(); });

  it("creates an own backup and rejects stale writes without losing its contents", async () => {
    await asUser(owner);
    const first = await database.query<{ revision: number }>("select * from public.subtrack_save_snapshot($1::jsonb, 0)", [JSON.stringify(payload)]);
    expect(Number(first.rows[0].revision)).toBe(1);
    await expect(database.query("select * from public.subtrack_save_snapshot($1::jsonb, 0)", [JSON.stringify({ ...payload, subscriptions: ["stale"] })])).rejects.toThrow("SUBTRACK_SYNC_CONFLICT");
    const saved = await database.query<{ payload: typeof payload }>("select payload from public.subtrack_sync_state");
    expect(saved.rows[0].payload.subscriptions).toEqual([]);
  });
  it("prevents another user from reading or directly changing the backup", async () => {
    await asUser(outsider);
    expect((await database.query("select * from public.subtrack_sync_state")).rows).toEqual([]);
    await expect(database.query("update public.subtrack_sync_state set revision=99")).rejects.toThrow("permission denied");
    await asUser(null, "anon");
    await expect(database.query("select * from public.subtrack_sync_state")).rejects.toThrow("permission denied");
    await expect(database.query("select * from public.subtrack_save_snapshot($1::jsonb, 0)", [JSON.stringify(payload)])).rejects.toThrow("permission denied");
  });
  it("creates a household, guards ownership, and denies membership tampering", async () => {
    await asUser(owner);
    householdId = await scalar<string>("select public.subtrack_create_household('Family')");
    await asUser(outsider);
    expect((await database.query("select * from public.subtrack_households")).rows).toEqual([]);
    await expect(database.query("insert into public.subtrack_household_members values($1,$2,'owner')", [householdId, outsider])).rejects.toThrow("permission denied");
    await expect(database.query("select public.subtrack_invite_member($1,'outsider@example.test','owner')", [householdId])).rejects.toThrow("Owner access required");
  });
  it("addresses invitations to a verified email and prevents reuse", async () => {
    await asUser(owner);
    const invite = await scalar<string>("select public.subtrack_invite_member($1,'viewer@example.test','viewer')", [householdId]);
    await asUser(outsider);
    await expect(database.query("select public.subtrack_accept_invite($1)", [invite])).rejects.toThrow("Invalid or expired invitation");
    await asUser(viewer);
    expect(await scalar<string>("select public.subtrack_accept_invite($1)", [invite])).toBe(householdId);
    await expect(database.query("select public.subtrack_accept_invite($1)", [invite])).rejects.toThrow("Invalid or expired invitation");
    expect((await database.query("select * from public.subtrack_households")).rows).toHaveLength(1);
  });
  it("allows viewers to read shared plans, but not edit or delete them", async () => {
    await asUser(owner);
    const plan = { planName: "Family plan", amount: 20 };
    const id = await scalar<string>("select public.subtrack_save_shared_plan($1,null,$2::jsonb,0)", [householdId, JSON.stringify(plan)]);
    await asUser(viewer);
    expect((await database.query("select * from public.subtrack_shared_plans")).rows).toHaveLength(1);
    await expect(database.query("select public.subtrack_save_shared_plan($1,$2,$3::jsonb,1)", [householdId, id, JSON.stringify(plan)])).rejects.toThrow("Editor access required");
    await expect(database.query("select public.subtrack_remove_shared_plan($1,$2)", [householdId, id])).rejects.toThrow("Owner access required");
    await asUser(owner);
    await database.query("select public.subtrack_save_shared_plan($1,$2,$3::jsonb,1)", [householdId, id, JSON.stringify({ ...plan, amount: 21 })]);
    await expect(database.query("select public.subtrack_save_shared_plan($1,$2,$3::jsonb,1)", [householdId, id, JSON.stringify(plan)])).rejects.toThrow("SUBTRACK_SYNC_CONFLICT");
  });
  it("strips fields outside the published whitelist from shared plans", async () => {
    await asUser(owner);
    const id = await scalar<string>("select public.subtrack_save_shared_plan($1,null,$2::jsonb,0)", [householdId, JSON.stringify({ planName: "Leaky", amount: 5, notes: "private", billingIdentity: "card 1234" })]);
    const saved = await database.query<{ payload: Record<string, unknown> }>("select payload from public.subtrack_shared_plans where id=$1", [id]);
    expect(saved.rows[0].payload).toEqual({ planName: "Leaky", amount: 5 });
    await database.query("select public.subtrack_remove_shared_plan($1,$2)", [householdId, id]);
  });
  it("removes access immediately when the owner removes a member", async () => {
    await asUser(owner);
    await database.query("select public.subtrack_remove_member($1,$2)", [householdId, viewer]);
    await asUser(viewer);
    expect((await database.query("select * from public.subtrack_shared_plans")).rows).toEqual([]);
    expect((await database.query("select * from public.subtrack_household_members")).rows).toEqual([]);
  });
  it("cascades owned households and snapshots when an account is deleted", async () => {
    await database.exec("reset role");
    await database.query("delete from auth.users where id=$1", [owner]);
    expect((await database.query("select * from public.subtrack_households")).rows).toEqual([]);
    expect((await database.query("select * from public.subtrack_shared_plans")).rows).toEqual([]);
    expect((await database.query("select * from public.subtrack_sync_state")).rows).toEqual([]);
  });
});
