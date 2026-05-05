-- ============================================================
-- Migration 004 — Record of Employment (ROE)
-- ============================================================

create table if not exists public.roes (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  company_id            uuid not null references public.companies(id) on delete cascade,
  employee_id           uuid not null references public.employees(id) on delete cascade,

  -- Block 1 — Serial number (assigned by employer)
  serial_number         text,

  -- Block 2 — SIN
  sin                   text,

  -- Block 3 — Employment type
  employment_type       text not null default 'E' check (employment_type in ('E','C')),

  -- Block 4 — Employer payroll reference
  payroll_ref           text,

  -- Block 5 — Pay period type
  pay_period_type       text not null default 'B'
    check (pay_period_type in ('W','B','S','M','A','O')),
  -- W=Weekly, B=Bi-weekly, S=Semi-monthly, M=Monthly, A=13 periods, O=Other

  -- Block 6 — First day worked
  first_day_worked      date not null,

  -- Block 7 — Last day for which paid
  last_day_paid         date not null,

  -- Block 8 — Final pay period ending date
  final_pay_period_end  date not null,

  -- Block 9 — Reason for issuing ROE
  reason_code           text not null check (reason_code in (
    'A','B','C','D','E','F','G','H','J','K','M','N','P','Z'
  )),
  -- A=Shortage of work, B=Strike/lockout, C=Return to school,
  -- D=Illness/injury, E=Quit, F=Maternity, G=Retirement,
  -- H=Work-sharing, J=Apprentice training, K=Other,
  -- M=Dismissal, N=Leave of absence, P=Parental, Z=Compassionate care

  reason_comments       text,

  -- Block 10 — Total insurable hours
  total_insurable_hours numeric(8,2) not null default 0,

  -- Block 11 — Total insurable earnings (last 27 pay periods or since hire)
  total_insurable_earnings numeric(12,2) not null default 0,

  -- Block 12 — Vacation pay
  vacation_pay_amount   numeric(10,2) not null default 0,
  vacation_pay_type     text not null default 'I' check (vacation_pay_type in ('I','P')),
  -- I=Included in each pay, P=Paid because no longer employed

  -- Block 13 — Statutory holiday pay
  stat_holiday_pay      numeric(10,2) not null default 0,

  -- Block 14 — Other monies
  other_monies_amount   numeric(10,2) not null default 0,
  other_monies_type     text,

  -- Block 15 — Insurable earnings by period (JSON array of up to 27 amounts)
  insurable_earnings_by_period jsonb not null default '[]',

  -- Block 16 — Contact info
  contact_name          text,
  contact_phone         text,
  contact_ext           text,

  -- Block 17 — Comments
  comments              text,

  -- Status
  status                text not null default 'draft' check (status in ('draft','issued','amended')),
  issued_at             timestamptz,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.roes enable row level security;
create policy "roes: own rows" on public.roes
  for all using (auth.uid() = user_id);

create index on public.roes (user_id);
create index on public.roes (company_id);
create index on public.roes (employee_id);

create trigger set_updated_at before update on public.roes
  for each row execute procedure public.set_updated_at();
