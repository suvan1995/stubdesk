import type { PlanLimit, Profile } from '@/types/database'

// ── Hardcoded defaults (used if DB fetch fails) ───────────────
export const DEFAULT_LIMITS: Record<string, PlanLimit> = {
  free: {
    plan: 'free',
    max_companies: 1,
    max_employees_per_co: 2,
    max_payslips_month: 10,
    can_generate_t4: false,
    can_export_t4_xml: false,
    updated_at: '',
  },
  starter: {
    plan: 'starter',
    max_companies: 2,
    max_employees_per_co: 5,
    max_payslips_month: -1,
    can_generate_t4: true,
    can_export_t4_xml: false,
    updated_at: '',
  },
  pro: {
    plan: 'pro',
    max_companies: -1,
    max_employees_per_co: -1,
    max_payslips_month: -1,
    can_generate_t4: true,
    can_export_t4_xml: true,
    updated_at: '',
  },
}

export const PLAN_PRICES: Record<string, { monthly: number; label: string }> = {
  free:    { monthly: 0,     label: 'Free' },
  starter: { monthly: 7.49,  label: 'Starter' },
  pro:     { monthly: 12.99, label: 'Pro' },
}

// ── Helper: is the user's subscription currently active? ──────
export function isSubscriptionActive(profile: Profile | null): boolean {
  if (!profile) return false
  return (
    profile.subscription_status === 'active' ||
    profile.subscription_status === 'trialing'
  )
}

// ── Helper: can the user add another company? ─────────────────
export function canAddCompany(limits: PlanLimit, currentCount: number): boolean {
  if (limits.max_companies === -1) return true
  return currentCount < limits.max_companies
}

// ── Helper: can the user add another employee to a company? ───
export function canAddEmployee(limits: PlanLimit, currentCount: number): boolean {
  if (limits.max_employees_per_co === -1) return true
  return currentCount < limits.max_employees_per_co
}

// ── Helper: can the user generate another payslip this month? ─
export function canAddPayslip(limits: PlanLimit, monthCount: number): boolean {
  if (limits.max_payslips_month === -1) return true
  return monthCount < limits.max_payslips_month
}

// ── Human-readable limit string ───────────────────────────────
export function limitLabel(n: number, unit: string): string {
  return n === -1 ? `Unlimited ${unit}` : `${n} ${unit}`
}
