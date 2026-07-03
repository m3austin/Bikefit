-- Reproducible RLS verification for the BikeFit sync schema (PRD §7, Flow 7).
-- Run against a project with the init_sync_schema migration applied. Seeds two
-- users and one fit each (as a superuser, which bypasses RLS), then checks that
-- each user sees only their own row, anon sees none, and cross-user writes fail.
-- This exact sequence was run live on the BikeFit project during Phase 7.

-- Seed (superuser / service role bypasses RLS).
insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
 ('00000000-0000-0000-0000-000000000000','11111111-1111-4111-8111-111111111111',
   'authenticated','authenticated','usera@bikefit.test','', now(), now(), now(),
   '{"provider":"email","providers":["email"]}','{}'),
 ('00000000-0000-0000-0000-000000000000','22222222-2222-4222-8222-222222222222',
   'authenticated','authenticated','userb@bikefit.test','', now(), now(), now(),
   '{"provider":"email","providers":["email"]}','{}')
on conflict (id) do nothing;

insert into public.fits (id, user_id, name, data) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','User A road fit','{}'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','User B gravel fit','{}')
on conflict (id) do nothing;

-- As user A: expect 1 row, only A's. (live result: visible_to_user_a = 1)
begin;
  select set_config('request.jwt.claims',
    '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
  set local role authenticated;
  select count(*)::int as visible_to_user_a,
    bool_and(user_id = '11111111-1111-4111-8111-111111111111') as all_belong_to_a
  from public.fits;
rollback;

-- As user B: expect 1 row, only B's. (live result: visible_to_user_b = 1)
begin;
  select set_config('request.jwt.claims',
    '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
  set local role authenticated;
  select count(*)::int as visible_to_user_b from public.fits;
rollback;

-- As anon: expect 0 rows. (live result: rows_visible_to_anon = 0)
begin;
  set local role anon;
  select count(*)::int as rows_visible_to_anon from public.fits;
rollback;

-- User A attempting to modify user B's row: expect 0 rows affected.
-- (live result: user_b_rows_modified_by_a = 0)
begin;
  select set_config('request.jwt.claims',
    '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
  set local role authenticated;
  with updated as (
    update public.fits set name = 'should not happen'
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' returning id
  )
  select count(*)::int as user_b_rows_modified_by_a from updated;
rollback;
