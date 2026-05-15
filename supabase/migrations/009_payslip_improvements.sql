-- ============================================================
-- Migration 009 — Payslip improvements
-- 1. Soft delete: archived flag instead of hard delete
-- 2. Payslip status: draft / approved / finalized
-- ============================================================

-- Add archived flag (soft delete)
alter table public.payslips
  add column if not exists archived    boolean not null default false,
  add column if not exists archived_at timestamptz,
  add column if not exists status      text not null default 'finalized'
    check (status in ('draft','approved','finalized'));

-- Index for filtering out archived payslips efficiently
create index if not exists payslips_archived_idx on public.payslips (archived) where archived = false;
create index if not exists payslips_status_idx   on public.payslips (status);

-- Update RLS: existing policies already filter by user_id, no changes needed

-- Helper: soft-delete a payslip (sets archived=true, archived_at=now())
create or replace function public.archive_payslip(p_id uuid, p_user_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.payslips
  set archived = true, archived_at = now()
  where id = p_id and user_id = p_user_id;
end;
$$;

comment on column public.payslips.archived    is 'Soft delete flag — archived payslips are hidden from UI but retained for audit';
comment on column public.payslips.archived_at is 'Timestamp when the payslip was archived';
comment on column public.payslips.status      is 'Workflow status: draft | approved | finalized';
