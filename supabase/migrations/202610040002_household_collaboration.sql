create schema if not exists subtrack_private;
revoke all on schema subtrack_private from public;
grant usage on schema subtrack_private to authenticated;

create table public.subtrack_households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.subtrack_household_members (
  household_id uuid not null references public.subtrack_households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  primary key (household_id, user_id)
);
create table public.subtrack_household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.subtrack_households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  target_email text not null check (char_length(target_email) between 3 and 320),
  role text not null check (role in ('editor', 'viewer')),
  token_hash text unique not null,
  expires_at timestamptz not null default now() + interval '7 days',
  consumed_at timestamptz
);
create table public.subtrack_shared_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.subtrack_households(id) on delete cascade,
  payload jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.subtrack_households enable row level security;
alter table public.subtrack_household_members enable row level security;
alter table public.subtrack_household_invites enable row level security;
alter table public.subtrack_shared_plans enable row level security;
revoke all on public.subtrack_households, public.subtrack_household_members, public.subtrack_household_invites, public.subtrack_shared_plans from anon, authenticated;
grant select on public.subtrack_households, public.subtrack_household_members, public.subtrack_shared_plans to authenticated;

-- Security-definer membership check avoids recursive RLS queries.
create function subtrack_private.member_role(p_household uuid)
returns text language sql stable security definer set search_path = ''
as $$ select role from public.subtrack_household_members where household_id = p_household and user_id = auth.uid() $$;
revoke all on function subtrack_private.member_role(uuid) from public, anon;
grant execute on function subtrack_private.member_role(uuid) to authenticated;
create policy household_member_read on public.subtrack_households for select to authenticated
  using (subtrack_private.member_role(id) is not null);
create policy household_roster_read on public.subtrack_household_members for select to authenticated
  using (subtrack_private.member_role(household_id) is not null);
create policy household_plans_read on public.subtrack_shared_plans for select to authenticated
  using (subtrack_private.member_role(household_id) is not null);

create function public.subtrack_create_household(p_name text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := auth.uid(); v_id uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_name is null or char_length(trim(p_name)) not between 1 and 120 then raise exception 'Invalid name'; end if;
  insert into public.subtrack_households(name, owner_id) values(trim(p_name), v_user) returning id into v_id;
  insert into public.subtrack_household_members(household_id, user_id, role) values(v_id, v_user, 'owner');
  return v_id;
end;
$$;

create function public.subtrack_invite_member(p_household uuid, p_email text, p_role text)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_token text;
begin
  if subtrack_private.member_role(p_household) is distinct from 'owner' then raise exception 'Owner access required'; end if;
  if p_role is null or p_role not in ('editor', 'viewer') then raise exception 'Invalid role'; end if;
  if p_email is null or char_length(p_email) > 320 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid email'; end if;
  -- Two independent random UUIDs (244 random bits). Only their hash is stored.
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into public.subtrack_household_invites(household_id, created_by, target_email, role, token_hash)
    values(p_household, auth.uid(), lower(trim(p_email)), p_role, encode(sha256(convert_to(v_token, 'UTF8')), 'hex'));
  return v_token;
end;
$$;

create function public.subtrack_accept_invite(p_token text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := auth.uid(); v_email text; v_invite public.subtrack_household_invites;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'Invalid invitation'; end if;
  select lower(email) into v_email from auth.users where id = v_user and email_confirmed_at is not null;
  if v_email is null then raise exception 'Verify your email before joining'; end if;
  select * into v_invite from public.subtrack_household_invites
    where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex') for update;
  if not found or v_invite.consumed_at is not null or v_invite.expires_at <= now()
    or v_invite.target_email is distinct from v_email then raise exception 'Invalid or expired invitation for this account'; end if;
  if exists(select 1 from public.subtrack_household_members where household_id = v_invite.household_id and user_id = v_user)
    then raise exception 'Already a household member'; end if;
  insert into public.subtrack_household_members(household_id, user_id, role) values(v_invite.household_id, v_user, v_invite.role);
  update public.subtrack_household_invites set consumed_at = now() where id = v_invite.id;
  return v_invite.household_id;
end;
$$;

create function public.subtrack_save_shared_plan(p_household uuid, p_plan_id uuid, p_payload jsonb, p_expected_revision bigint)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_role text := subtrack_private.member_role(p_household); v_id uuid; v_revision bigint;
begin
  if v_role is null or v_role not in ('owner', 'editor') then raise exception 'Editor access required'; end if;
  if p_payload is null or pg_column_size(p_payload) > 100000
    or jsonb_typeof(p_payload) is distinct from 'object'
    or jsonb_typeof(p_payload->'amount') is distinct from 'number'
    or jsonb_typeof(p_payload->'planName') is distinct from 'string'
    then raise exception 'Invalid plan'; end if;
  -- Enforce the published-field whitelist server-side; the client whitelist is not a security boundary.
  p_payload := (select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) from jsonb_each(p_payload)
    where key = any(array['id', 'serviceId', 'planId', 'planName', 'amount', 'currency', 'cadence', 'renewalDate',
      'expectedNextCharge', 'status', 'billingSource', 'reminderEnabled', 'createdAt', 'updatedAt']));
  if p_plan_id is null then
    if p_expected_revision is distinct from 0 then raise exception 'SUBTRACK_SYNC_CONFLICT'; end if;
    insert into public.subtrack_shared_plans(household_id, payload) values(p_household, p_payload) returning id into v_id;
  else
    select revision into v_revision from public.subtrack_shared_plans where id = p_plan_id and household_id = p_household for update;
    if not found or v_revision is distinct from p_expected_revision then raise exception 'SUBTRACK_SYNC_CONFLICT'; end if;
    update public.subtrack_shared_plans set payload = p_payload, revision = v_revision + 1, updated_at = clock_timestamp()
      where id = p_plan_id and household_id = p_household returning id into v_id;
  end if;
  return v_id;
end;
$$;

create function public.subtrack_remove_shared_plan(p_household uuid, p_plan_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if subtrack_private.member_role(p_household) is distinct from 'owner' then raise exception 'Owner access required'; end if;
  delete from public.subtrack_shared_plans where id = p_plan_id and household_id = p_household;
end;
$$;

create function public.subtrack_remove_member(p_household uuid, p_user uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if auth.uid() <> p_user and subtrack_private.member_role(p_household) is distinct from 'owner' then raise exception 'Owner access required'; end if;
  delete from public.subtrack_household_members where household_id = p_household and user_id = p_user and role <> 'owner';
end;
$$;
create function public.subtrack_delete_household(p_household uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if subtrack_private.member_role(p_household) is distinct from 'owner' then raise exception 'Owner access required'; end if;
  delete from public.subtrack_households where id = p_household and owner_id = auth.uid();
end;
$$;
-- Deny execution by default; expose only the specific authenticated entry points.
revoke all on function public.subtrack_create_household(text), public.subtrack_invite_member(uuid, text, text),
  public.subtrack_accept_invite(text), public.subtrack_save_shared_plan(uuid, uuid, jsonb, bigint),
  public.subtrack_remove_shared_plan(uuid, uuid), public.subtrack_remove_member(uuid, uuid),
  public.subtrack_delete_household(uuid) from public, anon;
grant execute on function public.subtrack_create_household(text), public.subtrack_invite_member(uuid, text, text),
  public.subtrack_accept_invite(text), public.subtrack_save_shared_plan(uuid, uuid, jsonb, bigint),
  public.subtrack_remove_shared_plan(uuid, uuid), public.subtrack_remove_member(uuid, uuid),
  public.subtrack_delete_household(uuid) to authenticated;

do $$
begin
  if exists(select 1 from pg_publication where pubname = 'supabase_realtime') and not exists(
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'subtrack_shared_plans'
  ) then
    alter publication supabase_realtime add table public.subtrack_shared_plans;
  end if;
end;
$$;
