import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardTitle } from '@/components/ui/Card'
import type { Profile } from '@/types/database'

interface Stats {
  totalUsers: number
  activeSubscriptions: number
  trialUsers: number
  freeUsers: number
  starterUsers: number
  proUsers: number
  totalPayslips: number
  totalT4s: number
}

export default function AdminOverviewPage() {
  const [stats,   setStats]   = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    setLoading(true)
    const [profilesRes, payslipsRes, t4Res] = await Promise.all([
      supabase.from('profiles').select('plan, subscription_status'),
      supabase.from('payslips').select('id', { count: 'exact', head: true }),
      supabase.from('t4_slips').select('id', { count: 'exact', head: true }),
    ])

    const profiles = (profilesRes.data ?? []) as Pick<Profile, 'plan' | 'subscription_status'>[]
    setStats({
      totalUsers:          profiles.length,
      activeSubscriptions: profiles.filter(p => p.subscription_status === 'active').length,
      trialUsers:          profiles.filter(p => p.subscription_status === 'trialing').length,
      freeUsers:           profiles.filter(p => p.plan === 'free').length,
      starterUsers:        profiles.filter(p => p.plan === 'starter').length,
      proUsers:            profiles.filter(p => p.plan === 'pro').length,
      totalPayslips:       payslipsRes.count ?? 0,
      totalT4s:            t4Res.count ?? 0,
    })
    setLoading(false)
  }

  const statCards = stats ? [
    { label: 'Total Users',          value: stats.totalUsers,          color: 'text-brand-700' },
    { label: 'Active Subscriptions', value: stats.activeSubscriptions, color: 'text-green-600' },
    { label: 'Trial Users',          value: stats.trialUsers,          color: 'text-yellow-600' },
    { label: 'Free Plan',            value: stats.freeUsers,           color: 'text-gray-600'  },
    { label: 'Starter Plan',         value: stats.starterUsers,        color: 'text-blue-600'  },
    { label: 'Pro Plan',             value: stats.proUsers,            color: 'text-purple-600'},
    { label: 'Total Payslips',       value: stats.totalPayslips,       color: 'text-brand-700' },
    { label: 'Total T4 Slips',       value: stats.totalT4s,            color: 'text-brand-700' },
  ] : []

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Admin Overview</h1>

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statCards.map(s => (
            <Card key={s.label}>
              <CardTitle>{s.label}</CardTitle>
              <div className={`text-3xl font-extrabold ${s.color}`}>{s.value}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
