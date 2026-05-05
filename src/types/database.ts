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
