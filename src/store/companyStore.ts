import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Company, Employee } from '@/types/database'

interface CompanyState {
  companies:  Company[]
  employees:  Employee[]
  activeCompany:  Company | null
  activeEmployee: Employee | null
  loading: boolean
  fetchCompanies:  () => Promise<void>
  fetchEmployees:  (companyId?: string) => Promise<void>
  createCompany:   (data: Omit<Company, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Company | null>
  updateCompany:   (id: string, data: Partial<Company>) => Promise<void>
  deleteCompany:   (id: string) => Promise<void>
  createEmployee:  (data: Omit<Employee, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Employee | null>
  updateEmployee:  (id: string, data: Partial<Employee>) => Promise<void>
  deleteEmployee:  (id: string) => Promise<void>
  setActiveCompany:  (company: Company | null) => void
  setActiveEmployee: (employee: Employee | null) => void
}

export const useCompanyStore = create<CompanyState>((set, get) => ({
  companies:  [],
  employees:  [],
  activeCompany:  null,
  activeEmployee: null,
  loading: false,

  fetchCompanies: async () => {
    set({ loading: true })
    const { data } = await supabase
      .from('companies')
      .select('*')
      .order('name')
    set({ companies: (data ?? []) as Company[], loading: false })
  },

  fetchEmployees: async (companyId) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('employees') as any).select('*').order('name')
    if (companyId) query = query.eq('company_id', companyId)
    const { data } = await query
    set({ employees: (data ?? []) as Employee[] })
  },

  createCompany: async (data) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: created, error } = await (supabase.from('companies') as any)
      .insert({ ...data, user_id: user.id })
      .select()
      .single()
    if (error || !created) return null
    const company = created as Company
    set(s => ({ companies: [...s.companies, company] }))
    return company
  },

  updateCompany: async (id, data) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated } = await (supabase.from('companies') as any)
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (updated) {
      const company = updated as Company
      set(s => ({ companies: s.companies.map(c => c.id === id ? company : c) }))
      if (get().activeCompany?.id === id) set({ activeCompany: company })
    }
  },

  deleteCompany: async (id) => {
    await supabase.from('companies').delete().eq('id', id)
    set(s => ({
      companies: s.companies.filter(c => c.id !== id),
      activeCompany: s.activeCompany?.id === id ? null : s.activeCompany,
    }))
  },

  createEmployee: async (data) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: created, error } = await (supabase.from('employees') as any)
      .insert({ ...data, user_id: user.id })
      .select()
      .single()
    if (error || !created) return null
    const employee = created as Employee
    set(s => ({ employees: [...s.employees, employee] }))
    return employee
  },

  updateEmployee: async (id, data) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated } = await (supabase.from('employees') as any)
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (updated) {
      const employee = updated as Employee
      set(s => ({ employees: s.employees.map(e => e.id === id ? employee : e) }))
      if (get().activeEmployee?.id === id) set({ activeEmployee: employee })
    }
  },

  deleteEmployee: async (id) => {
    await supabase.from('employees').delete().eq('id', id)
    set(s => ({
      employees: s.employees.filter(e => e.id !== id),
      activeEmployee: s.activeEmployee?.id === id ? null : s.activeEmployee,
    }))
  },

  setActiveCompany:  (company)  => set({ activeCompany: company }),
  setActiveEmployee: (employee) => set({ activeEmployee: employee }),
}))
