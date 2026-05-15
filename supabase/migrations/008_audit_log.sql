-- ============================================================
-- Migration 008 — Audit Log
-- Tracks all mutations to payslips, employees, and companies
-- for CRA compliance and change history.
-- ============================================================

create table if not exists public.audit_log (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  action       text not null check (action in ('create','update','delete')),
  table_name   text not null,
  record_id    uuid not null,
  old_data     jsonb,
  new_data     jsonb,
  ip_address   text,
  created_at   timestamptz not null default now()
);

-- Index for fast lookups by user, table, and record
create index if not exists audit_log_user_id_idx    on public.audit_log (user_id);
create index if not exists audit_log_table_idx      on public.audit_log (table_name, record_id);
create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);

-- RLS: users can only read their own audit entries; only the system can write
alter table public.audit_log enable row level security;

create policy "audit_log: users read own"
  on public.audit_log for select
  using (auth.uid() = user_id);

-- Admins can read all audit entries
create policy "audit_log: admin read all"
  on public.audit_log for select
  using (public.is_admin(auth.uid()));

-- Only service role (backend) can insert — no direct client writes
-- (inserts happen via the log_audit() helper function below)

-- ── Helper function called from application code ──────────────
create or replace function public.log_audit(
  p_user_id    uuid,
  p_action     text,
  p_table_name text,
  p_record_id  uuid,
  p_old_data   jsonb default null,
  p_new_data   jsonb default null
) returns void
language plpgsql security definer as $$
begin
  insert into public.audit_log (user_id, action, table_name, record_id, old_data, new_data)
  values (p_user_id, p_action, p_table_name, p_record_id, p_old_data, p_new_data);
end;
$$;

-- ── Automatic triggers for payslips table ─────────────────────
create or replace function public.audit_payslips()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    perform public.log_audit(NEW.user_id, 'create', 'payslips', NEW.id, null, to_jsonb(NEW));
  elsif TG_OP = 'UPDATE' then
    perform public.log_audit(NEW.user_id, 'update', 'payslips', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  elsif TG_OP = 'DELETE' then
    perform public.log_audit(OLD.user_id, 'delete', 'payslips', OLD.id, to_jsonb(OLD), null);
  end if;
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists payslips_audit on public.payslips;
create trigger payslips_audit
  after insert or update or delete on public.payslips
  for each row execute procedure public.audit_payslips();

-- ── Automatic triggers for employees table ────────────────────
create or replace function public.audit_employees()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    perform public.log_audit(NEW.user_id, 'create', 'employees', NEW.id, null, to_jsonb(NEW));
  elsif TG_OP = 'UPDATE' then
    perform public.log_audit(NEW.user_id, 'update', 'employees', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  elsif TG_OP = 'DELETE' then
    perform public.log_audit(OLD.user_id, 'delete', 'employees', OLD.id, to_jsonb(OLD), null);
  end if;
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists employees_audit on public.employees;
create trigger employees_audit
  after insert or update or delete on public.employees
  for each row execute procedure public.audit_employees();

-- ── Automatic triggers for companies table ────────────────────
create or replace function public.audit_companies()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    perform public.log_audit(NEW.user_id, 'create', 'companies', NEW.id, null, to_jsonb(NEW));
  elsif TG_OP = 'UPDATE' then
    perform public.log_audit(NEW.user_id, 'update', 'companies', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  elsif TG_OP = 'DELETE' then
    perform public.log_audit(OLD.user_id, 'delete', 'companies', OLD.id, to_jsonb(OLD), null);
  end if;
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists companies_audit on public.companies;
create trigger companies_audit
  after insert or update or delete on public.companies
  for each row execute procedure public.audit_companies();
