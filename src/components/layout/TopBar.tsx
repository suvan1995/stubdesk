import { useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useCompanyStore } from '@/store/companyStore'

const PAGE_LABELS: Record<string, string> = {
  '/payroll':     'Payroll',
  '/employees':   'Employees',
  '/remittance':  'Remittance',
  '/companies':   'Company',
  '/t4':          'T4 Slips',
  '/roe':         'ROE',
  '/payslips':    'Pay History',
  '/billing':     'My Subscription',
  '/settings':    'Settings',
  '/dashboard':   'Welcome',
  '/payslip/new': 'New Payslip',
  '/admin':       'Admin',
}

export default function TopBar() {
  const { profile, signOut } = useAuthStore()
  const { activeCompany }    = useCompanyStore()
  const location             = useLocation()

  const pageLabel = PAGE_LABELS[location.pathname] ??
    Object.entries(PAGE_LABELS).find(([k]) => location.pathname.startsWith(k))?.[1] ?? ''

  return (
    <header className="h-12 bg-white border-b border-gray-100 flex items-center px-6 gap-3 shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 flex-1 min-w-0">
        {activeCompany && (
          <>
            <span className="text-brand-600 font-semibold truncate">{activeCompany.name}</span>
            <span className="text-gray-300">›</span>
          </>
        )}
        {pageLabel && (
          <span className="text-gray-600 font-medium">{pageLabel}</span>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4 shrink-0">
        <span className="text-sm text-gray-400 hidden sm:block truncate max-w-[180px]">
          {profile?.full_name ?? profile?.email}
        </span>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors font-medium"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign Out
        </button>
      </div>
    </header>
  )
}
