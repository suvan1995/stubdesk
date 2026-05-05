import { useEffect, useState } from 'react'
import { useLimitsStore } from '@/store/limitsStore'
import { PLAN_PRICES } from '@/lib/planLimits'
import { Card, CardTitle } from '@/components/ui/Card'
import type { PlanLimit } from '@/types/database'

const PLAN_ORDER = ['free', 'starter', 'pro'] as const

export default function AdminPlansPage() {
  const { allLimits, fetchAllLimits, updatePlanLimits } = useLimitsStore()
  const [saving, setSaving] = useState<string | null>(null)
  const [local,  setLocal]  = useState<PlanLimit[]>([])
  const [saved,  setSaved]  = useState<string | null>(null)

  useEffect(() => { fetchAllLimits() }, [fetchAllLimits])
  useEffect(() => { setLocal(allLimits) }, [allLimits])

  function setField(plan: string, key: keyof PlanLimit, val: string | boolean | number) {
    setLocal(prev => prev.map(l => l.plan === plan ? { ...l, [key]: val } : l))
  }

  async function savePlan(plan: string) {
    const limits = local.find(l => l.plan === plan)
    if (!limits) return
    setSaving(plan)
    await updatePlanLimits(plan, {
      max_companies:        limits.max_companies,
      max_employees_per_co: limits.max_employees_per_co,
      max_payslips_month:   limits.max_payslips_month,
      can_generate_t4:      limits.can_generate_t4,
      can_export_t4_xml:    limits.can_export_t4_xml,
    })
    setSaving(null)
    setSaved(plan)
    setTimeout(() => setSaved(null), 2000)
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Plan Limits</h1>
        <p className="text-sm text-gray-500 mt-1">
          Changes take effect immediately for all users on that plan. Use <code className="bg-gray-100 px-1 rounded">-1</code> for unlimited.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {PLAN_ORDER.map(planKey => {
          const limits = local.find(l => l.plan === planKey)
          if (!limits) return null
          const price = PLAN_PRICES[planKey]

          return (
            <Card key={planKey}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-bold text-lg capitalize text-gray-800">{planKey}</div>
                  <div className="text-sm text-gray-400">
                    {price.monthly === 0 ? 'Free' : `$${price.monthly}/mo`}
                  </div>
                </div>
                {saved === planKey && (
                  <span className="badge badge-green text-xs">Saved ✓</span>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="label text-xs">Max Companies (-1 = unlimited)</label>
                  <input type="number" className="input text-sm" min={-1}
                    value={limits.max_companies}
                    onChange={e => setField(planKey, 'max_companies', parseInt(e.target.value) || -1)} />
                </div>
                <div>
                  <label className="label text-xs">Max Employees per Company</label>
                  <input type="number" className="input text-sm" min={-1}
                    value={limits.max_employees_per_co}
                    onChange={e => setField(planKey, 'max_employees_per_co', parseInt(e.target.value) || -1)} />
                </div>
                <div>
                  <label className="label text-xs">Max Payslips / Month</label>
                  <input type="number" className="input text-sm" min={-1}
                    value={limits.max_payslips_month}
                    onChange={e => setField(planKey, 'max_payslips_month', parseInt(e.target.value) || -1)} />
                </div>

                <div className="pt-2 space-y-2 border-t border-gray-100">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-brand-600"
                      checked={limits.can_generate_t4}
                      onChange={e => setField(planKey, 'can_generate_t4', e.target.checked)} />
                    <span className="text-sm text-gray-700">T4 Generation</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-brand-600"
                      checked={limits.can_export_t4_xml}
                      onChange={e => setField(planKey, 'can_export_t4_xml', e.target.checked)} />
                    <span className="text-sm text-gray-700">CRA XML Export</span>
                  </label>
                </div>
              </div>

              <button
                className="btn-primary w-full mt-4 text-sm"
                disabled={saving === planKey}
                onClick={() => savePlan(planKey)}
              >
                {saving === planKey ? 'Saving…' : 'Save Changes'}
              </button>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardTitle>Current Plan Pricing</CardTitle>
        <p className="text-xs text-gray-400 mb-3">
          Prices are set in Stripe. Update them in your Stripe dashboard and update the price IDs in your <code className="bg-gray-100 px-1 rounded">.env</code> file.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 font-semibold text-gray-600">Plan</th>
              <th className="text-right py-2 font-semibold text-gray-600">Monthly Price (CAD)</th>
            </tr>
          </thead>
          <tbody>
            {PLAN_ORDER.map(p => (
              <tr key={p} className="border-b border-gray-100">
                <td className="py-2 capitalize font-medium">{p}</td>
                <td className="py-2 text-right">
                  {PLAN_PRICES[p].monthly === 0 ? 'Free' : `$${PLAN_PRICES[p].monthly}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
