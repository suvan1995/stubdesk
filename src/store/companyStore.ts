import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Company, Employee } from '@/types/database'

interface CompanyState {
  companies:  Company[]
  employees:  Employee[]
  activeCompany:  Company | null
  activeEmployee: Employee | null
  loading: boolean
  error:   string | null
  fetchCompanies:  () => Promise<void>
  fetchEmployees:  (companyId?: string) => Promise<void>
  createCompany:   (data: Omit<Company, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Company | null>
  updateCompany:   (id: string, data: Partial<Company>) => Promise<{ error: string | null }>
  deleteCompany:   (id: string) => Promise<{ error: string | null }>
  createEmployee:  (data: Omit<Employee, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Employee | null>
  updateEmployee:  (id: string, data: Partial<Employee>) => Promise<{ error: string | null }>
  deleteEmployee:  (id: string) => Promise<{ error: string | null }>
  setActiveCompany:  (company: Company | null) => void
  setActiveEmployee: (employee: Employee | null) => void
}

export const useCompanyStore = create<CompanyState>((set, get) => ({
  companies:  [],
  employees:  [],
  activeCompany:  null,
  activeEmployee: null,
  loading: false,
  error:   null,

  fetchCompanies: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name')
    if (error) {
      console.error('fetchCompanies:', error)
      set({ loading: false, error: error.message })
      return
    }
    set({ companies: (data ?? []) as Company[], loading: false })
  },

  fetchEmployees: async (companyId) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('employees') as any).select('*').order('name')
    if (companyId) query = query.eq('company_id', companyId)
    const { data, error } = await query
    if (error) {
      console.error('fetchEmployees:', error)
      set({ error: error.message })
      return
    }
    // Supabase returns numeric columns as strings — parse them
    const parsed = ((data ?? []) as Employee[]).map(e => ({
      ...e,
      rate:             parseFloat(String(e.rate))             || 0,
      std_weekly_hours: parseFloat(String(e.std_weekly_hours)) || 40,
      pay_frequency:    (parseInt(String(e.pay_frequency))     || 26) as 52|26|24|12,
    }))
    set({ employees: parsed })
  },

  createCompany: async (data) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: created, error } = await (supabase.from('companies') as any)
      .insert({ ...data, user_id: user.id })
      .select()
      .single()
    if (error) {
      console.error('createCompany:', error)
      set({ error: error.message })
      return null
    }
    if (!created) return null
    const company = created as Company
    set(s => ({ companies: [...s.companies, company] }))
    return company
  },

  updateCompany: async (id, data) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error } = await (supabase.from('companies') as any)
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) {
      console.error('updateCompany:', error)
      return { error: error.message }
    }
    if (updated) {
      const company = updated as Company
      set(s => ({ companies: s.companies.map(c => c.id === id ? company : c) }))
      if (get().activeCompany?.id === id) set({ activeCompany: company })
    }
    return { error: null }
  },

  deleteCompany: async (id) => {
    const { error } = await supabase.from('companies').delete().eq('id', id)
    if (error) {
      console.error('deleteCompany:', error)
      return { error: error.message }
    }
    set(s => ({
      companies: s.companies.filter(c => c.id !== id),
      activeCompany: s.activeCompany?.id === id ? null : s.activeCompany,
    }))
    return { error: null }
  },

  createEmployee: async (data) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    
    // Ensure numeric fields are numbers, not strings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      company_id:       data.company_id,
      name:             data.name,
      emp_id:           data.emp_id || null,
      sin_last3:        data.sin_last3 || null,
      address:          data.address || null,
      job_title:        data.job_title || null,
      department:       data.department || null,
      emp_type:         data.emp_type,
      rate:             parseFloat(String(data.rate)) || 0,
      std_weekly_hours: parseFloat(String(data.std_weekly_hours)) || 40,
      pay_frequency:    parseInt(String(data.pay_frequency)) || 26,
      start_date:       data.start_date || null,
      user_id:          user.id,
    }
    
    // Only include bank_account_last4 if it exists (for backward compatibility)
    if ('bank_account_last4' in data && data.bank_account_last4) {
      payload.bank_account_last4 = data.bank_account_last4
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: created, error } = await (supabase.from('employees') as any)
      .insert(payload)
      .select()
      .single()
    if (error) {
      console.error('createEmployee:', error)
      set({ error: error.message })
      return null
    }
    if (!created) return null
    const employee = created as Employee
    set(s => ({ employees: [...s.employees, employee] }))
    return employee
  },

  updateEmployee: async (id, data) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error } = await (supabase.from('employees') as any)
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) {
      console.error('updateEmployee:', error)
      return { error: error.message }
    }
    if (updated) {
      const employee = updated as Employee
      set(s => ({ employees: s.employees.map(e => e.id === id ? employee : e) }))
      if (get().activeEmployee?.id === id) set({ activeEmployee: employee })
    }
    return { error: null }
  },

  deleteEmployee: async (id) => {
    const { error } = await supabase.from('employees').delete().eq('id', id)
    if (error) {
      console.error('deleteEmployee:', error)
      return { error: error.message }
    }
    set(s => ({
      employees: s.employees.filter(e => e.id !== id),
      activeEmployee: s.activeEmployee?.id === id ? null : s.activeEmployee,
    }))
    return { error: null }
  },

  setActiveCompany:  (company)  => set({ activeCompany: company }),
  setActiveEmployee: (employee) => set({ activeEmployee: employee }),
}))