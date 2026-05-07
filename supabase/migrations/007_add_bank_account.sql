-- Add bank account last 4 digits field to employees table
alter table public.employees
  add column bank_account_last4 text;

comment on column public.employees.bank_account_last4 is 'Last 4 digits of bank account for direct deposit';
