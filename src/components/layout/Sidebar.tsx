import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import clsx from 'clsx'

const nav = [
  { to: '/dashboard',  label: 'Dashboard',  icon: '⊞' },
  { to: '/payslip/new',label: 'New Payslip', icon: '＋', highlight: true },
  { to: '/payslips',   label: 'Payslips',    icon: '📄' },
  { to: '/t4',         label: 'T4 Slips',    icon: '🗂' },
  { to: '/employees',  label: 'Employees',   icon: '👤' },
  { to: '/companies',  label: 'Companies',   icon: '🏢' },
  { to: '/billing',    label: 'Billing',     icon: '💳' },
  { to: '/settings',   label: 'Settings',    icon: '⚙' },
]

export default function Sidebar() {
  const { profile } = useAuthStore()

  return (
    <aside className="w-56 bg-brand-600 flex flex-col shrink-0">
      <div className="px-5 py-5 border-b border-brand-500">
        <span className="text-white font-extrabold text-xl tracking-tight">StubDesk</span>
        <span className="ml-2 text-brand-200 text-xs font-medium">Canadian Payroll</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              item.highlight
                ? 'bg-white text-brand-700 hover:bg-brand-50 font-semibold'
                : isActive
                  ? 'bg-brand-700 text-white'
                  : 'text-brand-100 hover:bg-brand-500 hover:text-white'
            )}
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        {/* Admin link — only shown to admins */}
        {profile?.is_admin && (
          <NavLink
            to="/admin"
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mt-4 border border-brand-400',
              isActive ? 'bg-brand-700 text-white' : 'text-brand-200 hover:bg-brand-500 hover:text-white'
            )}
          >
            <span className="text-base leading-none">🔧</span>
            Admin Panel
          </NavLink>
        )}
      </nav>

      <div className="px-4 py-4 border-t border-brand-500">
        <div className="text-brand-200 text-xs mb-1 truncate">{profile?.email}</div>
        <span className={clsx(
          'text-xs font-bold uppercase px-2 py-0.5 rounded-full',
          profile?.plan === 'pro'     ? 'bg-purple-400 text-purple-900' :
          profile?.plan === 'starter' ? 'bg-green-400 text-green-900'   :
                                        'bg-brand-400 text-white'
        )}>
          {profile?.plan ?? 'free'} plan
        </span>
      </div>
    </aside>
  )
}
