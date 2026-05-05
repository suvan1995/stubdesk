import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { DEFAULT_LIMITS } from '@/lib/planLimits'
import type { PlanLimit } from '@/types/database'

interface LimitsState {
  limits: PlanLimit | null          // limits for the current user's plan
  allLimits: PlanLimit[]            // all plans (for admin editor)
  payslipsThisMonth: number
  loading: boolean
  fetchLimits: (plan: string) => Promise<void>
  fetchAllLimits: () => Promise<void>
  fetchUsage: (userId: string) => Promise<void>
  updatePlanLimits: (plan: string, data: Partial<PlanLimit>) => Promise<void>
}

export const useLimitsStore = create<LimitsState>((set) => ({
  limits: null,
  allLimits: [],
  payslipsThisMonth: 0,
  loading: false,

  fetchLimits: async (plan) => {
    const { data } = await supabase
      .from('plan_limits')
      .select('*')
      .eq('plan', plan)
      .single()
    set({ limits: (data as PlanLimit | null) ?? DEFAULT_LIMITS[plan] ?? DEFAULT_LIMITS.free })
  },

  fetchAllLimits: async () => {
    const { data } = await supabase.from('plan_limits').select('*').order('plan')
    set({ allLimits: (data as PlanLimit[]) ?? Object.values(DEFAULT_LIMITS) })
  },

  fetchUsage: async (userId) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.rpc as any)('payslips_this_month', { p_user_id: userId })
    set({ payslipsThisMonth: (data as number | null) ?? 0 })
  },

  updatePlanLimits: async (plan, data) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('plan_limits') as any).update(data).eq('plan', plan)
    set(s => ({
      allLimits: s.allLimits.map(l => l.plan === plan ? { ...l, ...data } : l),
      limits: s.limits?.plan === plan ? { ...s.limits, ...data } : s.limits,
    }))
  },
}))
