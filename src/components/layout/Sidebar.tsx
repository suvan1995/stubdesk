import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import clsx from 'clsx'

const nav = [
  { to: '/dashboard',   label: 'Welcome',          icon: '⊞' },
  { to: '/payroll',     label: 'Payroll',           icon: '💰', highlight: true },
  { to: '/employees',   label: 'Employees',         icon: '👥' },
  { to: '/remittance',  label: 'Remittance',        icon: '🏦' },
  { to: '/companies',   label: 'Company',           icon: '🏢' },
  { to: '/t4',          label: 'T4 Slips',          icon: '🗂' },
  { to: '/roe',         label: 'ROE',               icon: '📋' },
  { to: '/payslips',    label: 'Pay History',       icon: '📄' },
  { to: '/billing',     label: 'My Subscription',   icon: '💳' },
  { to: '/settings',    label: 'Settings',          icon: '⚙' },
]

export default function Sidebar() {
  const { profile } = useAuthStore()

  return (
    <aside className="w-52 bg-white border-r border-gray-200 flex flex-col shrink-0 shadow-sm">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-extrabold text-sm">S</span>
          </div>
          <span className="font-extrabold text-brand-700 text-lg tracking-tight">StubDesk</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              item.highlight && !isActive
                ? 'text-brand-700 hover:bg-brand-50'
                : isActive
                  ? 'bg-brand-50 text-brand-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
            )}
          >
            <span className="text-base leading-none w-5 text-center">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        {/* Account section */}
        <div className="pt-4 mt-2 border-t border-gray-100">
          <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Account
          </div>
          {profile?.is_admin && (
            <NavLink
              to="/admin"
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive ? 'bg-gray-100 text-gray-800' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
              )}
            >
              <span className="text-base leading-none w-5 text-center">🔧</span>
              Admin Panel
            </NavLink>
          )}
        </div>
      </nav>

      {/* Plan badge + user */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="text-xs text-gray-400 truncate mb-1">{profile?.email}</div>
        <span className={clsx(
          'text-xs font-bold uppercase px-2 py-0.5 rounded-full',
          profile?.plan === 'pro'     ? 'bg-purple-100 text-purple-700' :
          profile?.plan === 'starter' ? 'bg-green-100 text-green-700'   :
                                        'bg-gray-100 text-gray-500'
        )}>
          {profile?.plan ?? 'free'} plan
        </span>
      </div>
    </aside>
  )
}
