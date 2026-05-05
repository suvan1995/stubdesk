-- ============================================================
-- PayCub SaaS — Initial Schema
-- Run this in your Supabase SQL editor or via supabase db push
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── profiles ────────────────────────────────────────────────
create table public.profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  email                  text not null,
  full_name              text,
  plan                   text not null default 'free' check (plan in ('free','starter','pro')),
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  subscription_status    text check (subscription_status in ('active','trialing','past_due','canceled')),
  trial_ends_at          timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, plan, subscription_status, trial_ends_at)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    'free',
    'trialing',
    now() + interval '14 days'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── companies ───────────────────────────────────────────────
create table public.companies (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  cra_bn     text,
  street     text not null,
  city       text not null,
  province   text not null check (province in ('ON','AB','BC')),
  postal     text not null,
  logo_url   text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── employees ───────────────────────────────────────────────
create table public.employees (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  company_id       uuid not null references public.companies(id) on delete cascade,
  name             text not null,
  emp_id           text,
  sin_last3        text,
  address          text,
  job_title        text,
  department       text,
  emp_type         text not null check (emp_type in ('salaried','hourly')),
  rate             numeric(12,2) not null default 0,
  std_weekly_hours numeric(5,2)  not null default 40,
  pay_frequency    integer not null check (pay_frequency in (52,26,24,12)),
  start_date       date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── payslips ────────────────────────────────────────────────
create table public.payslips (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  company_id        uuid not null references public.companies(id) on delete cascade,
  employee_id       uuid not null references public.employees(id) on delete cascade,
  period_start      date not null,
  period_end        date not null,
  pay_date          date not null,
  pay_method        text not null check (pay_method in ('eft','cheque')),
  cheque_number     text,
  gross_pay         numeric(12,2) not null,
  cpp1              numeric(10,2) not null,
  cpp2              numeric(10,2) not null default 0,
  ei                numeric(10,2) not null,
  fed_tax           numeric(10,2) not null,
  prov_tax          numeric(10,2) not null,
  net_pay           numeric(12,2) not null,
  custom_deductions jsonb not null default '[]',
  extra_earnings    jsonb not null default '[]',
  vac_pay           numeric(10,2) not null default 0,
  template          integer not null default 1,
  notes             text,
  pdf_url           text,
  created_at        timestamptz not null default now()
);

-- ── Row Level Security ───────────────────────────────────────
alter table public.profiles  enable row level security;
alter table public.companies enable row level security;
alter table public.employees enable row level security;
alter table public.payslips  enable row level security;

-- profiles: users can only see/edit their own
create policy "profiles: own row" on public.profiles
  for all using (auth.uid() = id);

-- companies: users can only see/edit their own
create policy "companies: own rows" on public.companies
  for all using (auth.uid() = user_id);

-- employees: users can only see/edit their own
create policy "employees: own rows" on public.employees
  for all using (auth.uid() = user_id);

-- payslips: users can only see/edit their own
create policy "payslips: own rows" on public.payslips
  for all using (auth.uid() = user_id);

-- ── updated_at triggers ──────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.companies
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.employees
  for each row execute procedure public.set_updated_at();

-- ── Indexes ──────────────────────────────────────────────────
create index on public.companies (user_id);
create index on public.employees (user_id);
create index on public.employees (company_id);
create index on public.payslips  (user_id);
create index on public.payslips  (company_id);
create index on public.payslips  (employee_id);
create index on public.payslips  (pay_date desc);
