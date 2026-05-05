import { useAuthStore } from '@/store/authStore'
import { useCompanyStore } from '@/store/companyStore'

export default function TopBar() {
  const { profile, signOut } = useAuthStore()
  const { activeCompany, activeEmployee } = useCompanyStore()

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4 shrink-0">
      {/* Active session indicator */}
      {activeCompany && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Working on:</span>
          <span className="font-semibold text-brand-700">{activeCompany.name}</span>
          {activeEmployee && (
            <>
              <span className="text-gray-300">›</span>
              <span className="font-medium text-gray-700">{activeEmployee.name}</span>
            </>
          )}
        </div>
      )}

      <div className="ml-auto flex items-center gap-3">
        <span className="text-sm text-gray-500 hidden sm:block">
          {profile?.full_name ?? profile?.email}
        </span>
        <button
          onClick={signOut}
          className="text-sm text-gray-500 hover:text-red-600 transition-colors font-medium"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
