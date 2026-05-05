import { Navigate, Outlet, NavLink } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import clsx from 'clsx'

const adminNav = [
  { to: '/admin',          label: 'Overview',    icon: '⊞', end: true },
  { to: '/admin/users',    label: 'Users',       icon: '👥' },
  { to: '/admin/plans',    label: 'Plan Limits', icon: '⚙' },
]

export default function AdminLayout() {
  const { profile } = useAuthStore()

  if (!profile?.is_admin) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Admin sidebar */}
      <aside className="w-52 bg-gray-900 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-gray-700">
          <div className="text-white font-extrabold text-lg">StubDesk Admin</div>
          <div className="text-gray-400 text-xs mt-0.5">Management Console</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {adminNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-gray-700">
          <NavLink to="/dashboard" className="text-gray-400 text-xs hover:text-white">
            ← Back to App
          </NavLink>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
