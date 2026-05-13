# Database Migration Notes

## Important: Run Migration 007

If you're experiencing issues with employee creation, you need to run migration 007 which adds the `bank_account_last4` field to the employees table.

### How to Apply Migration

#### Option 1: Using Supabase CLI
```bash
cd paycub-saas
supabase db push
```

#### Option 2: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open and run the file: `supabase/migrations/007_add_bank_account.sql`

### Migration Content
```sql
-- Add bank account last 4 digits field to employees table
alter table public.employees
  add column bank_account_last4 text;

comment on column public.employees.bank_account_last4 is 'Last 4 digits of bank account for direct deposit';
```

### What This Migration Does
- Adds `bank_account_last4` field to the `employees` table
- Field is optional (nullable)
- Used to display bank account info on payslips for EFT payments

### Backward Compatibility
The code has been updated to handle cases where this migration hasn't been run yet:
- Employee creation will work even without the field
- The field is only included in inserts if a value is provided
- Existing employees without this field will continue to work

### After Migration
Once the migration is applied:
1. Employees can be created with bank account information
2. Payslips will show "EFT - Account ****1234" for direct deposit
3. The field can be edited in the employee form

## All Migrations

1. `001_initial_schema.sql` - Base tables (profiles, companies, employees, payslips)
2. `002_admin_limits_t4.sql` - Admin features, plan limits, T4 slips
3. `003_storage.sql` - Storage buckets for PDFs and logos
4. `004_roe.sql` - Record of Employment (ROE) tables
5. `005_yearend_forms.sql` - T4A and T5 year-end forms
6. `006_tax_constants.sql` - Tax constants table for admin management
7. `007_add_bank_account.sql` - **NEW** Bank account field for employees

## Verifying Migrations

To check which migrations have been applied:

```sql
-- In Supabase SQL Editor
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;
```

Or check if the field exists:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'employees' 
AND column_name = 'bank_account_last4';
```
