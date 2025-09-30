-- Supabase SQL schema for EarningWe
-- Run these migrations in Supabase (SQL Editor or via CLI)

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- Enums
do $$ begin
  create type public.user_role as enum ('user','admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tx_type as enum ('deposit','earning','withdrawal');
exception when duplicate_object then null; end $$;

-- Helper function (optional)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- Profiles
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- Only the owner can view/update their profile
drop policy if exists "Profiles: select own" on public.profiles;
create policy "Profiles: select own"
  on public.profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Profiles: update own" on public.profiles;
create policy "Profiles: update own"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Profiles: insert own" on public.profiles;
create policy "Profiles: insert own"
  on public.profiles for insert
  with check (auth.uid() = user_id);

-- Plans
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_usdt numeric(12,2) not null check (price_usdt > 0),
  roi_daily_percent numeric(5,2) not null check (roi_daily_percent > 0),
  duration_days int not null check (duration_days > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger plans_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

alter table public.plans enable row level security;

-- Everyone can read active plans
drop policy if exists "Plans: select active" on public.plans;
create policy "Plans: select active"
  on public.plans for select
  using (is_active = true);

-- Subscriptions
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  principal_usdt numeric(12,2) not null check (principal_usdt > 0),
  roi_daily_percent numeric(5,2) not null check (roi_daily_percent > 0),
  start_date date not null default now(),
  end_date date,
  active boolean not null default true,
  next_earning_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;
drop policy if exists "Subscriptions: owner read" on public.subscriptions;
create policy "Subscriptions: owner read"
  on public.subscriptions for select
  using (auth.uid() = user_id);
drop policy if exists "Subscriptions: owner insert" on public.subscriptions;
create policy "Subscriptions: owner insert"
  on public.subscriptions for insert
  with check (auth.uid() = user_id);
drop policy if exists "Subscriptions: owner update" on public.subscriptions;
create policy "Subscriptions: owner update"
  on public.subscriptions for update
  using (auth.uid() = user_id);

-- Deposits
create table if not exists public.deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  order_id text unique,
  amount_usdt numeric(12,2) not null check (amount_usdt > 0),
  pay_currency text not null default 'USDTTRC20',
  status text not null default 'pending',
  tx_hash text,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger deposits_updated_at
  before update on public.deposits
  for each row execute function public.set_updated_at();

alter table public.deposits enable row level security;
drop policy if exists "Deposits: owner read" on public.deposits;
create policy "Deposits: owner read"
  on public.deposits for select
  using (auth.uid() = user_id);
drop policy if exists "Deposits: owner insert" on public.deposits;
create policy "Deposits: owner insert"
  on public.deposits for insert
  with check (auth.uid() = user_id);

-- Withdrawals
create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  amount_usdt numeric(12,2) not null check (amount_usdt > 0),
  address text not null,
  status text not null default 'pending',
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger withdrawals_updated_at
  before update on public.withdrawals
  for each row execute function public.set_updated_at();

alter table public.withdrawals enable row level security;
drop policy if exists "Withdrawals: owner read" on public.withdrawals;
create policy "Withdrawals: owner read"
  on public.withdrawals for select
  using (auth.uid() = user_id);
drop policy if exists "Withdrawals: owner insert" on public.withdrawals;
create policy "Withdrawals: owner insert"
  on public.withdrawals for insert
  with check (auth.uid() = user_id);

-- Transactions
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  type tx_type not null,
  amount_usdt numeric(12,2) not null,
  reference_id uuid,
  meta jsonb,
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;
drop policy if exists "Transactions: owner read" on public.transactions;
create policy "Transactions: owner read"
  on public.transactions for select
  using (auth.uid() = user_id);

-- Balances (materialized by transactions) - optional cache table
create table if not exists public.balances (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  available_usdt numeric(14,2) not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.balances enable row level security;
drop policy if exists "Balances: owner read" on public.balances;
create policy "Balances: owner read"
  on public.balances for select
  using (auth.uid() = user_id);

-- Admin helper view (for service role)
create or replace view public.admin_overview as
select
  (select count(*) from public.profiles) as total_users,
  (select coalesce(sum(amount_usdt),0) from public.deposits where status in ('finished','confirmed','completed','succeeded')) as total_deposits,
  (select coalesce(sum(amount_usdt),0) from public.withdrawals where status in ('approved','paid')) as total_withdrawals,
  (select coalesce(sum(amount_usdt),0) from public.transactions where type = 'earning') as total_earnings;

-- Note: Admin actions should use the service role key from secure server-side code to bypass RLS when necessary.
