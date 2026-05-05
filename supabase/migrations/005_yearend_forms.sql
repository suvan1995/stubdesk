-- ============================================================
-- Migration 005 — T4A and T5 year-end slips
-- ============================================================

-- ── T4A ──────────────────────────────────────────────────────
create table if not exists public.t4a_slips (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  company_id            uuid not null references public.companies(id) on delete cascade,
  recipient_name        text not null,
  recipient_address     text,
  recipient_sin         text,
  tax_year              integer not null,
  box_16_pension        numeric(12,2) not null default 0,
  box_18_lump_sum       numeric(12,2) not null default 0,
  box_20_self_employed  numeric(12,2) not null default 0,
  box_22_income_tax     numeric(12,2) not null default 0,
  box_24_annuities      numeric(12,2) not null default 0,
  box_28_other_income   numeric(12,2) not null default 0,
  box_48_fees_services  numeric(12,2) not null default 0,
  box_30_patronage      numeric(12,2),
  box_32_rpp            numeric(12,2),
  box_34_pension_adj    numeric(12,2),
  box_40_research       numeric(12,2),
  box_42_reimbursements numeric(12,2),
  box_46_charitable     numeric(12,2),
  notes                 text,
  status                text not null default 'draft' check (status in ('draft','final','filed')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.t4a_slips enable row level security;
create policy "t4a_slips: own rows" on public.t4a_slips
  for all using (auth.uid() = user_id);
create index on public.t4a_slips (user_id);
create index on public.t4a_slips (company_id);
create trigger set_updated_at before update on public.t4a_slips
  for each row execute procedure public.set_updated_at();

-- ── T5 ───────────────────────────────────────────────────────
create table if not exists public.t5_slips (
  id                              uuid primary key default uuid_generate_v4(),
  user_id                         uuid not null references public.profiles(id) on delete cascade,
  company_id                      uuid not null references public.companies(id) on delete cascade,
  recipient_name                  text not null,
  recipient_address               text,
  recipient_sin                   text,
  tax_year                        integer not null,
  box_10_eligible_dividends       numeric(12,2) not null default 0,
  box_11_taxable_eligible         numeric(12,2) not null default 0,
  box_12_dividend_tax_credit      numeric(12,2) not null default 0,
  box_13_interest                 numeric(12,2) not null default 0,
  box_14_other_income             numeric(12,2) not null default 0,
  box_15_foreign_income           numeric(12,2) not null default 0,
  box_16_foreign_tax              numeric(12,2) not null default 0,
  box_17_royalties                numeric(12,2) not null default 0,
  box_18_capital_gains_dividends  numeric(12,2) not null default 0,
  box_21_acb_adjustment           numeric(12,2),
  box_24_ineligible_dividends     numeric(12,2) not null default 0,
  box_25_taxable_ineligible       numeric(12,2) not null default 0,
  box_26_ineligible_tax_credit    numeric(12,2) not null default 0,
  notes                           text,
  status                          text not null default 'draft' check (status in ('draft','final','filed')),
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

alter table public.t5_slips enable row level security;
create policy "t5_slips: own rows" on public.t5_slips
  for all using (auth.uid() = user_id);
create index on public.t5_slips (user_id);
create index on public.t5_slips (company_id);
create trigger set_updated_at before update on public.t5_slips
  for each row execute procedure public.set_updated_at();
