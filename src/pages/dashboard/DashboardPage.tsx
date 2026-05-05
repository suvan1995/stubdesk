import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useCompanyStore } from '@/store/companyStore'
import { Card, CardTitle } from '@/components/ui/Card'

export default function DashboardPage() {
  const { profile } = useAuthStore()
  const { companies, employees, fetchCompanies, fetchEmployees } = useCompanyStore()

  useEffect(() => {
    fetchCompanies()
    fetchEmployees()
  }, [fetchCompanies, fetchEmployees])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  const stats = [
    { label: 'Companies',  value: companies.length,  to: '/companies',  color: 'bg-brand-50 text-brand-700' },
    { label: 'Employees',  value: employees.length,  to: '/employees',  color: 'bg-green-50 text-green-700' },
    { label: 'Payslips',   value: '—',               to: '/payslips',   color: 'bg-purple-50 text-purple-700' },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Welcome back, {firstName} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Trial banner — only show if trialing AND on free plan (not manually upgraded by admin) */}
      {profile?.subscription_status === 'trialing'
        && profile.plan === 'free'
        && profile.trial_ends_at && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-yellow-800 text-sm">Free trial active</p>
            <p className="text-yellow-700 text-xs mt-0.5">
              Trial ends {new Date(profile.trial_ends_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <Link to="/billing" className="btn-primary text-sm shrink-0">Upgrade now</Link>
        </div>
      )}

      {/* Active paid plan badge */}
      {profile?.plan !== 'free' && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 flex items-center gap-3">
          <span className="text-green-600 text-lg">✓</span>
          <p className="text-green-800 text-sm font-medium capitalize">
            {profile?.plan} plan active
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(s => (
          <Link key={s.label} to={s.to}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardTitle>{s.label}</CardTitle>
              <div className={`text-3xl font-extrabold rounded-lg inline-block px-3 py-1 ${s.color}`}>
                {s.value}
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <Card>
        <CardTitle>Quick Actions</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link to="/payslip/new" className="btn-primary justify-start gap-3 py-3">
            <span className="text-lg">＋</span>
            <div className="text-left">
              <div className="font-semibold">New Payslip</div>
              <div className="text-xs opacity-80">Generate a pay stub</div>
            </div>
          </Link>
          <Link to="/companies" className="btn-secondary justify-start gap-3 py-3">
            <span className="text-lg">🏢</span>
            <div className="text-left">
              <div className="font-semibold">Add Company</div>
              <div className="text-xs opacity-80">Set up employer details</div>
            </div>
          </Link>
          <Link to="/employees" className="btn-secondary justify-start gap-3 py-3">
            <span className="text-lg">👤</span>
            <div className="text-left">
              <div className="font-semibold">Add Employee</div>
              <div className="text-xs opacity-80">Create an employee profile</div>
            </div>
          </Link>
          <Link to="/payslips" className="btn-secondary justify-start gap-3 py-3">
            <span className="text-lg">📄</span>
            <div className="text-left">
              <div className="font-semibold">View Payslips</div>
              <div className="text-xs opacity-80">Browse pay history</div>
            </div>
          </Link>
        </div>
      </Card>

      {/* Setup checklist */}
      {(companies.length === 0 || employees.length === 0) && (
        <Card>
          <CardTitle>Getting Started</CardTitle>
          <ul className="space-y-3">
            {[
              { done: companies.length > 0, label: 'Add your first company', to: '/companies' },
              { done: employees.length > 0, label: 'Add your first employee', to: '/employees' },
              { done: false, label: 'Generate your first payslip', to: '/payslip/new' },
            ].map(item => (
              <li key={item.label} className="flex items-center gap-3">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  item.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {item.done ? '✓' : '○'}
                </span>
                <Link to={item.to} className={`text-sm ${item.done ? 'line-through text-gray-400' : 'text-brand-600 hover:underline font-medium'}`}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
