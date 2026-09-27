-- REVO Lead CRM — Supabase sxemasi
-- Supabase Dashboard → SQL Editor → New query → shu faylni to'liq joylang → Run.
-- Qayta ishga tushirish xavfsiz (mavjud ma'lumot o'chmaydi).

-- 1) Jamoa a'zolari (kimlar CRM'ga kira oladi)
create table if not exists public.crm_members (
  email      text primary key,
  created_at timestamptz not null default now()
);
alter table public.crm_members enable row level security;
-- Brauzerdan bu jadvalga hech kim yoza olmaydi; a'zolar faqat SQL Editor orqali qo'shiladi.

create or replace function public.is_crm_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.crm_members
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_crm_member() from public, anon;
grant execute on function public.is_crm_member() to authenticated;

-- Foydalanuvchi o'zi a'zo ekanini tekshira olishi uchun
drop policy if exists "members read self" on public.crm_members;
create policy "members read self" on public.crm_members
  for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- 2) Leadlar
create table if not exists public.leads (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 120),
  phone        text not null default '' check (char_length(phone) <= 30),
  instagram    text not null default '' check (char_length(instagram) <= 60),
  service      text not null default '' check (char_length(service) <= 120),
  source       text not null default 'other'
               check (source in ('instagram','telegram','phone','referral','other')),
  status       text not null default 'new'
               check (status in ('new','contacted','meeting','proposal','won','lost')),
  amount       bigint not null default 0 check (amount >= 0),
  next_contact date,
  note         text not null default '' check (char_length(note) <= 2000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid default auth.uid() references auth.users (id) on delete set null,
  updated_by   uuid default auth.uid() references auth.users (id) on delete set null
);
create index if not exists leads_created_at_idx on public.leads (created_at desc);

create or replace function public.leads_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
drop trigger if exists leads_touch on public.leads;
create trigger leads_touch before update on public.leads
  for each row execute function public.leads_touch();

alter table public.leads enable row level security;

drop policy if exists "members select leads" on public.leads;
drop policy if exists "members insert leads" on public.leads;
drop policy if exists "members update leads" on public.leads;
drop policy if exists "members delete leads" on public.leads;
create policy "members select leads" on public.leads
  for select to authenticated using (public.is_crm_member());
create policy "members insert leads" on public.leads
  for insert to authenticated with check (public.is_crm_member());
create policy "members update leads" on public.leads
  for update to authenticated using (public.is_crm_member()) with check (public.is_crm_member());
create policy "members delete leads" on public.leads
  for delete to authenticated using (public.is_crm_member());

-- 3) Realtime: o'zgarishlar barcha qurilmalarda darhol ko'rinsin
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leads'
  ) then
    alter publication supabase_realtime add table public.leads;
  end if;
end $$;

-- 4) Jamoa a'zosini qo'shish (email'ni o'zingiznikiga almashtiring va alohida ishga tushiring):
-- insert into public.crm_members (email) values ('siz@example.com') on conflict do nothing;
