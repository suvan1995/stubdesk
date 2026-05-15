export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          plan: 'free' | 'starter' | 'pro'
          is_admin: boolean
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: 'active' | 'trialing' | 'past_due' | 'canceled' | null
          trial_ends_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      plan_limits: {
        Row: {
          plan: 'free' | 'starter' | 'pro'
          max_companies: number          // -1 = unlimited
          max_employees_per_co: number   // -1 = unlimited
          max_payslips_month: number     // -1 = unlimited
          can_generate_t4: boolean
          can_export_t4_xml: boolean
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['plan_limits']['Row'], 'updated_at'>
        Update: Partial<Database['public']['Tables']['plan_limits']['Insert']>
      }
      companies: {
        Row: {
          id: string
          user_id: string
          name: string
          cra_bn: string | null
          street: string
          city: string
          province: 'ON' | 'AB' | 'BC'
          postal: string
          logo_url: string | null
          first_period_start: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['companies']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['companies']['Insert']>
      }
      employees: {
        Row: {
          id: string
          user_id: string
          company_id: string
          name: string
          emp_id: string | null
          sin_last3: string | null
          address: string | null
          job_title: string | null
          department: string | null
          emp_type: 'salaried' | 'hourly'
          rate: number
          std_weekly_hours: number
          pay_frequency: 52 | 26 | 24 | 12
          start_date: string | null
          bank_account_last4: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['employees']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['employees']['Insert']>
      }
      payslips: {
        Row: {
          id: string
          user_id: string
          company_id: string
          employee_id: string
          period_start: string
          period_end: string
          pay_date: string
          pay_method: 'eft' | 'cheque'
          cheque_number: string | null
          gross_pay: number
          cpp1: number
          cpp2: number
          ei: number
          fed_tax: number
          prov_tax: number
          net_pay: number
          custom_deductions: Json
          extra_earnings: Json
          vac_pay: number
          template: number
          notes: string | null
          pdf_url: string | null
          archived: boolean
          archived_at: string | null
          status: 'draft' | 'approved' | 'finalized'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['payslips']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['payslips']['Insert']>
      }
      t4_slips: {
        Row: {
          id: string
          user_id: string
          company_id: string
          employee_id: string
          tax_year: number
          box_14_employment_income: number
          box_16_cpp_employee: number
          box_17_cpp2_employee: number
          box_18_ei_premiums: number
          box_22_income_tax: number
          box_24_ei_insurable: number
          box_26_cpp_pensionable: number
          box_27_cpp_employer: number
          box_19_ei_employer: number
          box_20_rpp_contributions: number | null
          box_40_other_taxable: number | null
          box_41_other_employment: number | null
          box_42_employment_commissions: number | null
          box_44_union_dues: number | null
          box_46_charitable_donations: number | null
          box_50_rpp_dpsp_number: string | null
          box_52_pension_adjustment: number | null
          box_53_dpsp_number: string | null
          box_54_sin: string | null
          box_55_ei_rate: number | null
          box_56_ei_insurable_manual: number | null
          box_57_employment_income_mar: number | null
          box_58_employment_income_apr: number | null
          box_59_employment_income_may: number | null
          box_60_employment_income_jun: number | null
          province_of_employment: string
          status: 'draft' | 'final' | 'filed'
          auto_generated: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['t4_slips']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['t4_slips']['Insert']>
      }
    }
  }
}

export type Profile   = Database['public']['Tables']['profiles']['Row']
export type PlanLimit = Database['public']['Tables']['plan_limits']['Row']
export type Company   = Database['public']['Tables']['companies']['Row']
export type Employee  = Database['public']['Tables']['employees']['Row']
export type Payslip   = Database['public']['Tables']['payslips']['Row']
export type T4Slip    = Database['public']['Tables']['t4_slips']['Row']

// ROE — not in Database interface (added via migration 004)
export interface ROE {
  id:                    string
  user_id:               string
  company_id:            string
  employee_id:           string
  serial_number:         string | null
  sin:                   string | null
  employment_type:       'E' | 'C'
  payroll_ref:           string | null
  pay_period_type:       'W' | 'B' | 'S' | 'M' | 'A' | 'O'
  first_day_worked:      string
  last_day_paid:         string
  final_pay_period_end:  string
  reason_code:           string
  reason_comments:       string | null
  total_insurable_hours: number
  total_insurable_earnings: number
  vacation_pay_amount:   number
  vacation_pay_type:     'I' | 'P'
  stat_holiday_pay:      number
  other_monies_amount:   number
  other_monies_type:     string | null
  insurable_earnings_by_period: number[]
  contact_name:          string | null
  contact_phone:         string | null
  contact_ext:           string | null
  comments:              string | null
  status:                'draft' | 'issued' | 'amended'
  issued_at:             string | null
  created_at:            string
  updated_at:            string
}

export const ROE_REASON_CODES: Record<string, string> = {
  A: 'A — Shortage of work / end of contract',
  B: 'B — Strike or lockout',
  C: 'C — Return to school',
  D: 'D — Illness or injury',
  E: 'E — Quit',
  F: 'F — Maternity leave',
  G: 'G — Retirement',
  H: 'H — Work-sharing',
  J: 'J — Apprentice training',
  K: 'K — Other',
  M: 'M — Dismissal',
  N: 'N — Leave of absence',
  P: 'P — Parental leave',
  Z: 'Z — Compassionate care / family caregiver',
}

export const PAY_PERIOD_TYPE_LABELS: Record<string, string> = {
  W: 'Weekly',
  B: 'Bi-weekly',
  S: 'Semi-monthly',
  M: 'Monthly',
  A: '13 periods/year',
  O: 'Other',
}

// ── T4A — Statement of Pension, Retirement, Annuity, and Other Income ────────
// Used for self-employed contractors, pension, RRSP, fees for services, etc.
export interface T4ASlip {
  id:                    string
  user_id:               string
  company_id:            string
  recipient_name:        string
  recipient_address:     string | null
  recipient_sin:         string | null
  tax_year:              number
  // Core boxes
  box_16_pension:        number   // Pension or superannuation
  box_18_lump_sum:       number   // Lump-sum payments
  box_20_self_employed:  number   // Self-employment commissions
  box_22_income_tax:     number   // Income tax deducted
  box_24_annuities:      number   // Annuities
  box_28_other_income:   number   // Other income
  box_48_fees_services:  number   // Fees for services (T4A box 048)
  // Manual boxes
  box_30_patronage:      number | null
  box_32_rpp:            number | null
  box_34_pension_adj:    number | null
  box_40_research:       number | null
  box_42_reimbursements: number | null
  box_46_charitable:     number | null
  notes:                 string | null
  status:                'draft' | 'final' | 'filed'
  created_at:            string
  updated_at:            string
}

// ── T5 — Statement of Investment Income ──────────────────────────────────────
export interface T5Slip {
  id:                    string
  user_id:               string
  company_id:            string
  recipient_name:        string
  recipient_address:     string | null
  recipient_sin:         string | null
  tax_year:              number
  box_10_eligible_dividends:     number
  box_11_taxable_eligible:       number   // box_10 × 1.38
  box_12_dividend_tax_credit:    number   // box_11 × 15.0198%
  box_13_interest:               number
  box_14_other_income:           number
  box_15_foreign_income:         number
  box_16_foreign_tax:            number
  box_17_royalties:              number
  box_18_capital_gains_dividends: number
  box_21_acb_adjustment:         number | null
  box_24_ineligible_dividends:   number
  box_25_taxable_ineligible:     number   // box_24 × 1.15
  box_26_ineligible_tax_credit:  number   // box_25 × 9.0301%
  notes:                 string | null
  status:                'draft' | 'final' | 'filed'
  created_at:            string
  updated_at:            string
}
