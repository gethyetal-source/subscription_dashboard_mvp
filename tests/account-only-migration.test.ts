import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..", "supabase", "migrations");
const read = (file: string) => readFileSync(resolve(root, file), "utf8");
const id = "11111111-1111-4111-8111-111111111111";
let db: PGlite;
let household: string;

describe("account-only database policy", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create schema auth; create role anon; create role authenticated;
      create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to anon, authenticated;
      insert into auth.users values ('${id}', 'test@example.test', now());
    `);
    await db.exec(read("202610040001_subtrack_sync.sql"));
    await db.exec(read("202610040002_household_collaboration.sql"));
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
    await db.exec("set role authenticated");
    await db.query("select * from public.subtrack_save_snapshot($1::jsonb, 0)", [JSON.stringify({ schemaVersion: 1, subscriptions: [], householdMembers: [], settings: {} })]);
    const result = await db.query<{ id: string }>("select public.subtrack_create_household('Legacy') as id");
    household = result.rows[0].id;
    await db.query("select public.subtrack_save_shared_plan($1,null,$2::jsonb,0)", [household, JSON.stringify({ planName: "Legacy", amount: 1 })]);
    await db.exec("reset role");
    await db.exec(read("202610070001_account_only_privacy.sql"));
    await db.exec(read("202610070001_account_only_privacy.sql"));
  }, 30_000);
  afterAll(async () => { await db?.close(); });

  it("blocks authenticated financial reads, writes, and all old RPCs", async () => {
    await db.exec("set role authenticated");
    for (const table of ["subtrack_sync_state", "subtrack_households", "subtrack_shared_plans", "subtrack_household_members", "subtrack_household_invites"]) {
      await expect(db.query(`select * from public.${table}`)).rejects.toThrow("permission denied");
      await expect(db.query(`truncate public.${table}`)).rejects.toThrow("permission denied");
    }
    const calls = [
      ["select public.subtrack_save_snapshot('{}'::jsonb, 0)", []],
      ["select public.subtrack_create_household('New')", []],
      ["select public.subtrack_invite_member($1,'other@example.test','viewer')", [household]],
      ["select public.subtrack_accept_invite('test')", []],
      ["select public.subtrack_save_shared_plan($1,null,'{}'::jsonb,0)", [household]],
      ["select public.subtrack_remove_shared_plan($1,$2)", [household, id]],
      ["select public.subtrack_remove_member($1,$2)", [household, id]],
      ["select public.subtrack_delete_household($1)", [household]],
      ["select subtrack_private.member_role($1)", [household]],
    ] as const;
    for (const [sql, params] of calls) await expect(db.query(sql, [...params])).rejects.toThrow("permission denied");
  });
  it("does not erase existing account details or legacy records without permission", async () => {
    await db.exec("reset role");
    expect((await db.query("select * from auth.users")).rows).toHaveLength(1);
    expect((await db.query("select * from public.subtrack_sync_state")).rows).toHaveLength(1);
    expect((await db.query("select * from public.subtrack_shared_plans")).rows).toHaveLength(1);
  });
  it("is also safe to apply to an auth-only project with no legacy financial tables", async () => {
    const fresh = new PGlite();
    try {
      await fresh.exec("create role anon; create role authenticated");
      await expect(fresh.exec(read("202610070001_account_only_privacy.sql"))).resolves.toBeDefined();
    } finally { await fresh.close(); }
  }, 30_000);
});
