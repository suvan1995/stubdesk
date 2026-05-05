import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Card } from '@/components/ui/Card'
import clsx from 'clsx'
import type { Profile } from '@/types/database'

const PLANS   = ['free', 'starter', 'pro'] as const
const STATUSES = ['active', 'trialing', 'past_due', 'canceled'] as const

export default function AdminUsersPage() {
  const [users,   setUsers]   = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [saving,  setSaving]  = useState<string | null>(null)
  const { profile: currentProfile, fetchProfile } = useAuthStore()

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setUsers((data ?? []) as Profile[])
    setLoading(false)
  }

  async function updateUser(id: string, changes: Partial<Profile>) {
    setSaving(id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('profiles') as any).update(changes).eq('id', id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...changes } : u))
    // If admin just changed their own profile (or the currently logged-in user's),
    // re-fetch so the sidebar/dashboard reflects the new plan immediately
    if (id === currentProfile?.id) {
      await fetchProfile()
    }
    setSaving(null)
  }

  const filtered = users.filter(u =>
    !search ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Users ({users.length})</h1>
        <input
          className="input w-64 text-sm"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">User</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Plan</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Trial Ends</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Admin</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{user.full_name ?? '—'}</div>
                      <div className="text-xs text-gray-400">{user.email}</div>
                    </td>

                    {/* Plan override */}
                    <td className="px-4 py-3">
                      <select
                        className="input text-xs py-1 w-28"
                        value={user.plan}
                        disabled={saving === user.id}
                        onChange={e => updateUser(user.id, { plan: e.target.value as Profile['plan'] })}
                      >
                        {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </td>

                    {/* Status override */}
                    <td className="px-4 py-3">
                      <select
                        className="input text-xs py-1 w-32"
                        value={user.subscription_status ?? ''}
                        disabled={saving === user.id}
                        onChange={e => updateUser(user.id, {
                          subscription_status: (e.target.value || null) as Profile['subscription_status']
                        })}
                      >
                        <option value="">— none —</option>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>

                    <td className="px-4 py-3 text-xs text-gray-500">
                      {user.trial_ends_at
                        ? new Date(user.trial_ends_at).toLocaleDateString('en-CA')
                        : '—'}
                    </td>

                    {/* Admin toggle */}
                    <td className="px-4 py-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={user.is_admin}
                          disabled={saving === user.id}
                          onChange={e => updateUser(user.id, { is_admin: e.target.checked })}
                          className="w-4 h-4 accent-brand-600"
                        />
                        <span className={clsx('text-xs font-medium', user.is_admin ? 'text-brand-700' : 'text-gray-400')}>
                          {user.is_admin ? 'Admin' : 'User'}
                        </span>
                      </label>
                    </td>

                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(user.created_at).toLocaleDateString('en-CA')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
