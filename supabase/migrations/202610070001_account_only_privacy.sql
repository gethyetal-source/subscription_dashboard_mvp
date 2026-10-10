-- Account-only product policy. Supabase Auth stores sign-in/profile details.
-- Keep legacy rows for a separate, explicitly approved retention/deletion review.
-- Deny all public-client access, including RPCs that bypass table RLS.
do $$
declare object_name text;
begin
  foreach object_name in array array[
    'public.subtrack_sync_state', 'public.subtrack_households',
    'public.subtrack_household_members', 'public.subtrack_household_invites',
    'public.subtrack_shared_plans'
  ] loop
    if to_regclass(object_name) is not null then
      execute format('revoke all on table %s from public, anon, authenticated', object_name);
    end if;
  end loop;
  foreach object_name in array array[
    'public.subtrack_save_snapshot(jsonb,bigint)',
    'public.subtrack_create_household(text)',
    'public.subtrack_invite_member(uuid,text,text)',
    'public.subtrack_accept_invite(text)',
    'public.subtrack_save_shared_plan(uuid,uuid,jsonb,bigint)',
    'public.subtrack_remove_shared_plan(uuid,uuid)',
    'public.subtrack_remove_member(uuid,uuid)',
    'public.subtrack_delete_household(uuid)',
    'subtrack_private.member_role(uuid)'
  ] loop
    if to_regprocedure(object_name) is not null then
      execute format('revoke all on function %s from public, anon, authenticated', object_name);
    end if;
  end loop;
end;
$$;
