import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useLimitsStore } from '@/store/limitsStore'
import { useTaxStore } from '@/store/taxStore'
import { setLiveTaxConstants } from '@/lib/payrollEngine'

// Pages — user app
import LandingPage       from '@/pages/LandingPage'
import LoginPage         from '@/pages/auth/LoginPage'
import SignupPage        from '@/pages/auth/SignupPage'
import DashboardPage     from '@/pages/dashboard/DashboardPage'
import PayslipBuilder    from '@/pages/payslip/PayslipBuilder'
import CompaniesPage     from '@/pages/companies/CompaniesPage'
import EmployeesPage     from '@/pages/employees/EmployeesPage'
import PayslipsPage      from '@/pages/payslips/PayslipsPage'
import T4ListPage        from '@/pages/t4/T4ListPage'
import T4EditPage        from '@/pages/t4/T4EditPage'
import PayrollSummaryPage from '@/pages/payroll/PayrollSummaryPage'
import RemittancePage    from '@/pages/remittance/RemittancePage'
import ROEListPage       from '@/pages/roe/ROEListPage'
import ROEEditPage       from '@/pages/roe/ROEEditPage'
import YearEndPage       from '@/pages/yearend/YearEndPage'
import T4AListPage       from '@/pages/yearend/T4AListPage'
import T4AEditPage       from '@/pages/yearend/T4AEditPage'
import T5ListPage        from '@/pages/yearend/T5ListPage'
import T5EditPage        from '@/pages/yearend/T5EditPage'
import SettingsPage      from '@/pages/settings/SettingsPage'
import BillingPage       from '@/pages/billing/BillingPage'
import NotFoundPage      from '@/pages/NotFoundPage'

// Pages — admin
import AdminLayout       from '@/pages/admin/AdminLayout'
import AdminOverviewPage from '@/pages/admin/AdminOverviewPage'
import AdminUsersPage    from '@/pages/admin/AdminUsersPage'
import AdminPlansPage    from '@/pages/admin/AdminPlansPage'
import AdminTaxPage      from '@/pages/admin/AdminTaxPage'

// Layout & guards
import AppLayout         from '@/components/layout/AppLayout'
import AuthGuard         from '@/components/auth/AuthGuard'
import PlanGuard         from '@/components/auth/PlanGuard'

export default function App() {
  const { setSession, fetchProfile, loading } = useAuthStore()
  const { fetchLimits, fetchUsage } = useLimitsStore()
  const { fetchConstants, constants } = useTaxStore()

  // Keep engine in sync whenever DB constants change
  useEffect(() => { setLiveTaxConstants(constants) }, [constants])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchProfile().then(() => {
          const plan = useAuthStore.getState().profile?.plan ?? 'free'
          fetchLimits(plan)
          fetchUsage(session.user.id)
          fetchConstants(2026)   // load live tax constants from DB
          useAuthStore.setState({ loading: false })
        })
      } else {
        useAuthStore.setState({ loading: false })    // no session — done immediately
      }
    }).catch(() => {
      useAuthStore.setState({ loading: false })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchProfile().then(() => {
          const plan = useAuthStore.getState().profile?.plan ?? 'free'
          fetchLimits(plan)
          fetchUsage(session.user.id)
        })
      } else {
        useAuthStore.setState({ profile: null })
      }
    })

    return () => subscription.unsubscribe()
  }, [setSession, fetchProfile, fetchLimits, fetchUsage, fetchConstants])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading StubDesk…</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/"       element={<LandingPage />} />
      <Route path="/login"  element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected — user app */}
      <Route element={<AuthGuard />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard"  element={<DashboardPage />} />
          <Route path="/companies"  element={<CompaniesPage />} />
          <Route path="/employees"  element={<EmployeesPage />} />
          <Route path="/payslips"   element={<PayslipsPage />} />
          <Route path="/payroll"    element={<PayrollSummaryPage />} />
          <Route path="/remittance" element={<RemittancePage />} />
          <Route path="/t4"          element={<T4ListPage />} />
          <Route path="/t4/new"      element={<T4EditPage />} />
          <Route path="/t4/:id/edit" element={<T4EditPage />} />
          <Route path="/yearend"              element={<YearEndPage />} />
          <Route path="/yearend/t4"           element={<T4ListPage />} />
          <Route path="/yearend/t4/new"       element={<T4EditPage />} />
          <Route path="/yearend/t4/:id/edit"  element={<T4EditPage />} />
          <Route path="/yearend/t4a"          element={<T4AListPage />} />
          <Route path="/yearend/t4a/new"      element={<T4AEditPage />} />
          <Route path="/yearend/t4a/:id/edit" element={<T4AEditPage />} />
          <Route path="/yearend/t5"           element={<T5ListPage />} />
          <Route path="/yearend/t5/new"       element={<T5EditPage />} />
          <Route path="/yearend/t5/:id/edit"  element={<T5EditPage />} />
          <Route path="/roe"         element={<ROEListPage />} />
          <Route path="/roe/new"     element={<ROEEditPage />} />
          <Route path="/roe/:id/edit" element={<ROEEditPage />} />
          <Route path="/settings"   element={<SettingsPage />} />
          <Route path="/billing"    element={<BillingPage />} />

          <Route element={<PlanGuard />}>
            <Route path="/payslip/new"       element={<PayslipBuilder />} />
            <Route path="/payslip/:id/edit"  element={<PayslipBuilder />} />
          </Route>
        </Route>

        {/* Admin — separate layout, admin-only guard inside AdminLayout */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index          element={<AdminOverviewPage />} />
          <Route path="users"   element={<AdminUsersPage />} />
          <Route path="plans"   element={<AdminPlansPage />} />
          <Route path="tax"     element={<AdminTaxPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
