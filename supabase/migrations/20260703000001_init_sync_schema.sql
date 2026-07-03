-- BikeFit sync schema (v1.1, PRD §7). Mirrors the local IndexedDB entities.
-- Every table has RLS keyed on user_id = auth.uid(); policies are scoped to the
-- authenticated role so anon has no access to data. Deletions propagate via a
-- deleted_at tombstone. No service-role usage from the client.

-- Fits: one row per saved fit, an input + result snapshot in `data` jsonb.
create table if not exists public.fits (
  id uuid primary key,
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  name text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists fits_user_id_idx on public.fits (user_id);
create index if not exists fits_user_updated_idx
  on public.fits (user_id, updated_at);

-- Profile: a single row per user (body measurements + flexibility).
create table if not exists public.profiles (
  user_id uuid primary key default auth.uid()
    references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Row level security: on, and default-deny until a policy allows.
alter table public.fits enable row level security;
alter table public.profiles enable row level security;

-- A user may only read and write their own rows. Scoped to authenticated so
-- the anon role is fully blocked from the data tables.
create policy fits_select_own on public.fits
  for select to authenticated using (auth.uid() = user_id);
create policy fits_insert_own on public.fits
  for insert to authenticated with check (auth.uid() = user_id);
create policy fits_update_own on public.fits
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy fits_delete_own on public.fits
  for delete to authenticated using (auth.uid() = user_id);

create policy profiles_select_own on public.profiles
  for select to authenticated using (auth.uid() = user_id);
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (auth.uid() = user_id);
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy profiles_delete_own on public.profiles
  for delete to authenticated using (auth.uid() = user_id);
