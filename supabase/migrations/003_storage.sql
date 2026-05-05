-- ============================================================
-- Migration 003 — Supabase Storage bucket for payslip PDFs
-- Run in Supabase SQL Editor
-- ============================================================

-- Create the storage bucket (private — access via signed URLs)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payslips',
  'payslips',
  false,                          -- private bucket
  5242880,                        -- 5 MB per file
  array['application/pdf']
)
on conflict (id) do nothing;

-- RLS: users can only read/write their own folder (user_id is the first path segment)
create policy "payslips: owner upload"
  on storage.objects for insert
  with check (
    bucket_id = 'payslips'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );

create policy "payslips: owner read"
  on storage.objects for select
  using (
    bucket_id = 'payslips'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );

create policy "payslips: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'payslips'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );
