import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { TAX_CONSTANTS_2026 } from '@/lib/taxConstants'
import { CURRENT_TAX_YEAR } from '@/lib/taxYear'
import type { TaxConstants, TaxBracket } from '@/types/payroll'

interface TaxStore {
  constants:   TaxConstants
  taxYear:     number
  loading:     boolean
  lastUpdated: string | null
  fetchConstants: (year?: number) => Promise<void>
  updateConstants: (year: number, data: Partial<DBTaxRow>) => Promise<{ error: string | null }>
}

// Shape of the database row
export interface DBTaxRow {
  tax_year:             number
  cpp1_rate:            number
  cpp1_basic_exemption: number
  cpp1_max_pensionable: number
  cpp1_max_employee:    number
  cpp2_rate:            number
  cpp2_ceiling:         number
  cpp2_max_employee:    number
  ei_employee_rate:     number
  ei_employer_mult:     number
  ei_max_insurable:     number
  ei_max_employee:      number
  fed_basic_personal:   number
  fed_credit_rate:      number
  fed_brackets:         { min: number; max: number | null; rate: number }[]
  on_basic_personal:    number
  on_credit_rate:       number
  on_surtax1_threshold: number
  on_surtax1_rate:      number
  on_surtax2_threshold: number
  on_surtax2_rate:      number
  on_brackets:          { min: number; max: number | null; rate: number }[]
  ab_basic_personal:    number
  ab_credit_rate:       number
  ab_brackets:          { min: number; max: number | null; rate: number }[]
  bc_basic_personal:    number
  bc_credit_rate:       number
  bc_brackets:          { min: number; max: number | null; rate: number }[]
  updated_at:           string
}

// Convert null max → Infinity for bracket calculations
function normBrackets(brackets: { min: number; max: number | null; rate: number }[]): TaxBracket[] {
  return brackets.map(b => ({ min: b.min, max: b.max ?? Infinity, rate: b.rate }))
}

// Convert DB row → TaxConstants
function rowToConstants(row: DBTaxRow): TaxConstants {
  return {
    CPP1_RATE:            row.cpp1_rate,
    CPP1_BASIC_EXEMPTION: row.cpp1_basic_exemption,
    CPP1_MAX_PENSIONABLE: row.cpp1_max_pensionable,
    CPP1_MAX_EMPLOYEE:    row.cpp1_max_employee,
    CPP2_RATE:            row.cpp2_rate,
    CPP2_CEILING:         row.cpp2_ceiling,
    CPP2_MAX_EMPLOYEE:    row.cpp2_max_employee,
    EI_EMPLOYEE_RATE:     row.ei_employee_rate,
    EI_EMPLOYER_MULT:     row.ei_employer_mult,
    EI_MAX_INSURABLE:     row.ei_max_insurable,
    EI_MAX_EMPLOYEE:      row.ei_max_employee,
    FED_BASIC_PERSONAL:   row.fed_basic_personal,
    FED_CREDIT_RATE:      row.fed_credit_rate,
    FED_BRACKETS:         normBrackets(row.fed_brackets),
    ON_BASIC_PERSONAL:    row.on_basic_personal,
    ON_CREDIT_RATE:       row.on_credit_rate,
    ON_SURTAX1_THRESHOLD: row.on_surtax1_threshold,
    ON_SURTAX1_RATE:      row.on_surtax1_rate,
    ON_SURTAX2_THRESHOLD: row.on_surtax2_threshold,
    ON_SURTAX2_RATE:      row.on_surtax2_rate,
    ON_BRACKETS:          normBrackets(row.on_brackets),
    AB_BASIC_PERSONAL:    row.ab_basic_personal,
    AB_CREDIT_RATE:       row.ab_credit_rate,
    AB_BRACKETS:          normBrackets(row.ab_brackets),
    BC_BASIC_PERSONAL:    row.bc_basic_personal,
    BC_CREDIT_RATE:       row.bc_credit_rate,
    BC_BRACKETS:          normBrackets(row.bc_brackets),
  }
}

export const useTaxStore = create<TaxStore>((set) => ({
  constants:   TAX_CONSTANTS_2026,   // hardcoded fallback
  taxYear:     CURRENT_TAX_YEAR,
  loading:     false,
  lastUpdated: null,

  fetchConstants: async (year = CURRENT_TAX_YEAR) => {
    set({ loading: true })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('tax_constants') as any)
      .select('*')
      .eq('tax_year', year)
      .single()

    if (error || !data) {
      // DB not set up yet — use hardcoded fallback silently
      set({ constants: TAX_CONSTANTS_2026, loading: false, taxYear: year, lastUpdated: null })
      return
    }

    set({
      constants:   rowToConstants(data as DBTaxRow),
      taxYear:     year,
      loading:     false,
      lastUpdated: (data as DBTaxRow).updated_at,
    })
  },

  updateConstants: async (year, updates) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('tax_constants') as any)
      .upsert({ tax_year: year, ...updates, updated_at: new Date().toISOString() })
    if (error) return { error: error.message }

    // Re-fetch to update in-memory constants
    const { data } = await (supabase.from('tax_constants') as any)
      .select('*').eq('tax_year', year).single()
    if (data) {
      set({
        constants:   rowToConstants(data as DBTaxRow),
        taxYear:     year,
        lastUpdated: (data as DBTaxRow).updated_at,
      })
    }
    return { error: null }
  },
}))
