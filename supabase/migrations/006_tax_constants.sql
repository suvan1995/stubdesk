-- ============================================================
-- Migration 006 — Tax Constants (editable by admin)
-- ============================================================

create table if not exists public.tax_constants (
  tax_year              integer primary key,

  -- CPP
  cpp1_rate             numeric(8,6) not null default 0.0595,
  cpp1_basic_exemption  numeric(10,2) not null default 3500,
  cpp1_max_pensionable  numeric(10,2) not null default 74600,
  cpp1_max_employee     numeric(10,2) not null default 4230.45,
  cpp2_rate             numeric(8,6) not null default 0.0400,
  cpp2_ceiling          numeric(10,2) not null default 85000,
  cpp2_max_employee     numeric(10,2) not null default 416.00,

  -- EI
  ei_employee_rate      numeric(8,6) not null default 0.0163,
  ei_employer_mult      numeric(6,4) not null default 1.4,
  ei_max_insurable      numeric(10,2) not null default 68900,
  ei_max_employee       numeric(10,2) not null default 1123.07,

  -- Federal income tax
  fed_basic_personal    numeric(10,2) not null default 16452,
  fed_credit_rate       numeric(8,6) not null default 0.14,
  fed_brackets          jsonb not null default '[
    {"min":0,"max":58523,"rate":0.14},
    {"min":58523,"max":117045,"rate":0.205},
    {"min":117045,"max":181440,"rate":0.26},
    {"min":181440,"max":258482,"rate":0.29},
    {"min":258482,"max":null,"rate":0.33}
  ]',

  -- Ontario
  on_basic_personal     numeric(10,2) not null default 12989,
  on_credit_rate        numeric(8,6) not null default 0.0505,
  on_surtax1_threshold  numeric(10,2) not null default 5554,
  on_surtax1_rate       numeric(8,6) not null default 0.20,
  on_surtax2_threshold  numeric(10,2) not null default 7108,
  on_surtax2_rate       numeric(8,6) not null default 0.36,
  on_brackets           jsonb not null default '[
    {"min":0,"max":53891,"rate":0.0505},
    {"min":53891,"max":107785,"rate":0.0915},
    {"min":107785,"max":150000,"rate":0.1116},
    {"min":150000,"max":220000,"rate":0.1216},
    {"min":220000,"max":null,"rate":0.1316}
  ]',

  -- Alberta
  ab_basic_personal     numeric(10,2) not null default 22769,
  ab_credit_rate        numeric(8,6) not null default 0.08,
  ab_brackets           jsonb not null default '[
    {"min":0,"max":151234,"rate":0.10},
    {"min":151234,"max":181475,"rate":0.12},
    {"min":181475,"max":241975,"rate":0.13},
    {"min":241975,"max":362962,"rate":0.14},
    {"min":362962,"max":null,"rate":0.15}
  ]',

  -- British Columbia
  bc_basic_personal     numeric(10,2) not null default 13217,
  bc_credit_rate        numeric(8,6) not null default 0.0560,
  bc_brackets           jsonb not null default '[
    {"min":0,"max":50363,"rate":0.0560},
    {"min":50363,"max":100728,"rate":0.0770},
    {"min":100728,"max":115648,"rate":0.1050},
    {"min":115648,"max":140180,"rate":0.1229},
    {"min":140180,"max":190252,"rate":0.1470},
    {"min":190252,"max":265354,"rate":0.1680},
    {"min":265354,"max":null,"rate":0.2050}
  ]',

  updated_at            timestamptz not null default now(),
  updated_by            uuid references public.profiles(id)
);

-- Seed 2026 defaults
insert into public.tax_constants (tax_year) values (2026)
on conflict (tax_year) do nothing;

-- RLS: anyone can read (needed for calculations), only admins can write
alter table public.tax_constants enable row level security;

create policy "tax_constants: public read"
  on public.tax_constants for select using (true);

create policy "tax_constants: admin write"
  on public.tax_constants for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
