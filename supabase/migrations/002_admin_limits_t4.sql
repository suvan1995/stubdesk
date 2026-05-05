-- ============================================================
-- Migration 002 — Admin, Plan Limits, T4 Slips
-- ============================================================

-- ── Add is_admin to profiles ─────────────────────────────────
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- ── plan_limits — one row per plan, editable by admin ────────
create table if not exists public.plan_limits (
  plan                  text primary key check (plan in ('free','starter','pro')),
  max_companies         integer not null default 1,   -- -1 = unlimited
  max_employees_per_co  integer not null default 2,   -- -1 = unlimited
  max_payslips_month    integer not null default 10,  -- -1 = unlimited
  can_generate_t4       boolean not null default false,
  can_export_t4_xml     boolean not null default false,
  updated_at            timestamptz not null default now()
);

-- Seed default limits
insert into public.plan_limits
  (plan, max_companies, max_employees_per_co, max_payslips_month, can_generate_t4, can_export_t4_xml)
values
  ('free',    1,  2,  10,   false, false),
  ('starter', 2,  5,  -1,   true,  false),
  ('pro',     -1, -1, -1,   true,  true)
on conflict (plan) do update set
  max_companies        = excluded.max_companies,
  max_employees_per_co = excluded.max_employees_per_co,
  max_payslips_month   = excluded.max_payslips_month,
  can_generate_t4      = excluded.can_generate_t4,
  can_export_t4_xml    = excluded.can_export_t4_xml,
  updated_at           = now();

-- RLS: anyone can read plan_limits (needed client-side for UI hints)
alter table public.plan_limits enable row level security;
create policy "plan_limits: public read"
  on public.plan_limits for select using (true);
create policy "plan_limits: admin write"
  on public.plan_limits for all
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- ── t4_slips ─────────────────────────────────────────────────
-- One row per employee per tax year. Boxes match CRA T4 slip.
create table if not exists public.t4_slips (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  company_id            uuid not null references public.companies(id) on delete cascade,
  employee_id           uuid not null references public.employees(id) on delete cascade,
  tax_year              integer not null,

  -- Core boxes (auto-populated from payslip history)
  box_14_employment_income    numeric(12,2) not null default 0,  -- Employment income
  box_16_cpp_employee         numeric(10,2) not null default 0,  -- Employee CPP contributions
  box_17_cpp2_employee        numeric(10,2) not null default 0,  -- Employee CPP2 contributions
  box_18_ei_premiums          numeric(10,2) not null default 0,  -- Employee EI premiums
  box_22_income_tax           numeric(10,2) not null default 0,  -- Income tax deducted
  box_24_ei_insurable         numeric(12,2) not null default 0,  -- EI insurable earnings
  box_26_cpp_pensionable      numeric(12,2) not null default 0,  -- CPP pensionable earnings

  -- Employer matching (auto-calculated)
  box_27_cpp_employer         numeric(10,2) not null default 0,
  box_19_ei_employer          numeric(10,2) not null default 0,

  -- Manual boxes (user-entered)
  box_20_rpp_contributions    numeric(10,2),  -- RPP contributions
  box_40_other_taxable        numeric(10,2),  -- Other taxable allowances
  box_41_other_employment     numeric(10,2),  -- Other employment income
  box_42_employment_commissions numeric(10,2),
  box_44_union_dues           numeric(10,2),
  box_46_charitable_donations numeric(10,2),
  box_50_rpp_dpsp_number      text,
  box_52_pension_adjustment   numeric(10,2),
  box_53_dpsp_number          text,
  box_54_sin                  text,           -- Full SIN (admin only, encrypted at rest)
  box_55_ei_rate              numeric(6,4),
  box_56_ei_insurable_manual  numeric(12,2),
  box_57_employment_income_mar numeric(12,2), -- COVID boxes (legacy, keep for completeness)
  box_58_employment_income_apr numeric(12,2),
  box_59_employment_income_may numeric(12,2),
  box_60_employment_income_jun numeric(12,2),

  -- Province of employment (from company)
  province_of_employment      text not null default 'ON',

  -- Status
  status                text not null default 'draft' check (status in ('draft','final','filed')),
  auto_generated        boolean not null default false,
  notes                 text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  unique (employee_id, tax_year)
);

alter table public.t4_slips enable row level security;
create policy "t4_slips: own rows"
  on public.t4_slips for all using (auth.uid() = user_id);

create index on public.t4_slips (user_id);
create index on public.t4_slips (company_id);
create index on public.t4_slips (employee_id);
create index on public.t4_slips (tax_year);

create trigger set_updated_at before update on public.t4_slips
  for each row execute procedure public.set_updated_at();

-- ── Admin: view all profiles ──────────────────────────────────
-- Helper function checks is_admin without triggering RLS (security definer bypasses it)
create or replace function public.is_admin(user_id uuid)
returns boolean language sql security definer stable as $$
  select coalesce((select is_admin from public.profiles where id = user_id), false);
$$;

-- Admins need to read all profiles (not just their own)
drop policy if exists "profiles: own row" on public.profiles;
create policy "profiles: own row or admin"
  on public.profiles for all
  using (
    auth.uid() = id
    or public.is_admin(auth.uid())
  );

-- ── Payslip count helper (for monthly limit enforcement) ──────
create or replace function public.payslips_this_month(p_user_id uuid)
returns integer language sql security definer as $$
  select count(*)::integer
  from public.payslips
  where user_id = p_user_id
    and date_trunc('month', created_at) = date_trunc('month', now());
$$;

-- ── Company count helper ──────────────────────────────────────
create or replace function public.company_count(p_user_id uuid)
returns integer language sql security definer as $$
  select count(*)::integer from public.companies where user_id = p_user_id;
$$;

-- ── Employee count per company helper ────────────────────────
create or replace function public.employee_count(p_company_id uuid)
returns integer language sql security definer as $$
  select count(*)::integer from public.employees where company_id = p_company_id;
$$;
