-- Deploy only after review. No service-role credential belongs in the app.
create table if not exists public.subtrack_sync_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);
-- Upgrade a previously provisioned table as well as supporting a fresh project.
alter table public.subtrack_sync_state add column if not exists revision bigint not null default 1;
alter table public.subtrack_sync_state add column if not exists updated_at timestamptz not null default now();
alter table public.subtrack_sync_state enable row level security;
-- Revoke everything first: default grants include TRUNCATE, which bypasses row-level security.
revoke all on public.subtrack_sync_state from anon, authenticated;
grant select, delete on public.subtrack_sync_state to authenticated;
-- Writes go only through subtrack_save_snapshot; remove direct-write and superseded policies from earlier setups.
drop policy if exists subtrack_insert_own on public.subtrack_sync_state;
drop policy if exists subtrack_update_own on public.subtrack_sync_state;
drop policy if exists subtrack_select_own on public.subtrack_sync_state;
drop policy if exists subtrack_read_own on public.subtrack_sync_state;
create policy subtrack_read_own on public.subtrack_sync_state for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists subtrack_delete_own on public.subtrack_sync_state;
create policy subtrack_delete_own on public.subtrack_sync_state for delete to authenticated using (user_id = (select auth.uid()));

-- Atomic compare-and-swap. A first upload must expect revision zero.
create or replace function public.subtrack_save_snapshot(p_payload jsonb, p_expected_revision bigint)
returns table(revision bigint, updated_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := auth.uid(); v_row public.subtrack_sync_state;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_expected_revision is null or p_expected_revision < 0 then raise exception 'Invalid revision'; end if;
  if p_payload is null or pg_column_size(p_payload) > 10000000
     or p_payload->>'schemaVersion' is distinct from '1'
     or jsonb_typeof(p_payload->'subscriptions') is distinct from 'array'
     or jsonb_typeof(p_payload->'settings') is distinct from 'object'
     or jsonb_typeof(p_payload->'householdMembers') is distinct from 'array'
  then raise exception 'Invalid snapshot'; end if;
  -- Also serialize creation when the row does not exist yet.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  select * into v_row from public.subtrack_sync_state where user_id = v_user for update;
  if not found then
    if p_expected_revision <> 0 then raise exception 'SUBTRACK_SYNC_CONFLICT'; end if;
    insert into public.subtrack_sync_state(user_id, payload, revision, updated_at)
    values(v_user, p_payload, 1, clock_timestamp()) returning * into v_row;
  else
    if v_row.revision <> p_expected_revision then raise exception 'SUBTRACK_SYNC_CONFLICT'; end if;
    update public.subtrack_sync_state
      set payload = p_payload, revision = v_row.revision + 1, updated_at = clock_timestamp()
      where user_id = v_user returning * into v_row;
  end if;
  return query select v_row.revision, v_row.updated_at;
end;
$$;
revoke all on function public.subtrack_save_snapshot(jsonb, bigint) from public, anon;
grant execute on function public.subtrack_save_snapshot(jsonb, bigint) to authenticated;
