import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useLimitsStore } from '@/store/limitsStore'
import { useTaxStore } from '@/store/taxStore'
import { setLiveTaxConstants } from '@/lib/payrollEngine'
import { startActivityTracking } from '@/lib/security'
import { CURRENT_TAX_YEAR } from '@/lib/taxYear'

// Layout & guards
import AppLayout         from '@/components/layout/AppLayout'
import AuthGuard         from '@/components/auth/AuthGuard'
import PlanGuard         from '@/components/auth/PlanGuard'

// Route-split pages so PDF/admin/year-end code is loaded only when visited.
const LandingPage        = lazy(() => import('@/pages/LandingPage'))
const LoginPage          = lazy(() => import('@/pages/auth/LoginPage'))
const SignupPage         = lazy(() => import('@/pages/auth/SignupPage'))
const MFAVerifyPage      = lazy(() => import('@/pages/auth/mfa/MFAVerifyPage'))
const MFAEnrollPage      = lazy(() => import('@/pages/auth/mfa/MFAEnrollPage'))
const DashboardPage      = lazy(() => import('@/pages/dashboard/DashboardPage'))
const PayslipBuilder     = lazy(() => import('@/pages/payslip/PayslipBuilder'))
const CompaniesPage      = lazy(() => import('@/pages/companies/CompaniesPage'))
const EmployeesPage      = lazy(() => import('@/pages/employees/EmployeesPage'))
const PayslipsPage       = lazy(() => import('@/pages/payslips/PayslipsPage'))
const T4ListPage         = lazy(() => import('@/pages/t4/T4ListPage'))
const T4EditPage         = lazy(() => import('@/pages/t4/T4EditPage'))
const PayrollSummaryPage = lazy(() => import('@/pages/payroll/PayrollSummaryPage'))
const RemittancePage     = lazy(() => import('@/pages/remittance/RemittancePage'))
const ROEListPage        = lazy(() => import('@/pages/roe/ROEListPage'))
const ROEEditPage        = lazy(() => import('@/pages/roe/ROEEditPage'))
const YearEndPage        = lazy(() => import('@/pages/yearend/YearEndPage'))
const T4AListPage        = lazy(() => import('@/pages/yearend/T4AListPage'))
const T4AEditPage        = lazy(() => import('@/pages/yearend/T4AEditPage'))
const T5ListPage         = lazy(() => import('@/pages/yearend/T5ListPage'))
const T5EditPage         = lazy(() => import('@/pages/yearend/T5EditPage'))
const SettingsPage       = lazy(() => import('@/pages/settings/SettingsPage'))
const BillingPage        = lazy(() => import('@/pages/billing/BillingPage'))
const PrivacyPolicyPage  = lazy(() => import('@/pages/PrivacyPolicyPage'))
const TermsOfServicePage = lazy(() => import('@/pages/TermsOfServicePage'))
const ContactSupportPage = lazy(() => import('@/pages/ContactSupportPage'))
const NotFoundPage       = lazy(() => import('@/pages/NotFoundPage'))

const AdminLayout        = lazy(() => import('@/pages/admin/AdminLayout'))
const AdminOverviewPage  = lazy(() => import('@/pages/admin/AdminOverviewPage'))
const AdminUsersPage     = lazy(() => import('@/pages/admin/AdminUsersPage'))
const AdminPlansPage     = lazy(() => import('@/pages/admin/AdminPlansPage'))
const AdminTaxPage       = lazy(() => import('@/pages/admin/AdminTaxPage'))

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading StubDesk...</p>
      </div>
    </div>
  )
}

export default function App() {
  const { setSession, fetchProfile, loading } = useAuthStore()
  const { fetchLimits, fetchUsage } = useLimitsStore()
  const { fetchConstants, constants } = useTaxStore()

  // Keep engine in sync whenever DB constants change
  useEffect(() => { setLiveTaxConstants(constants) }, [constants])

  // Start session timeout tracking
  useEffect(() => {
    const cleanup = startActivityTracking(async () => {
      await useAuthStore.getState().signOut()
    })
    return cleanup
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchProfile()
          .then(() => {
            const plan = useAuthStore.getState().profile?.plan ?? 'free'
            fetchLimits(plan)
            fetchUsage(session.user.id)
            fetchConstants(CURRENT_TAX_YEAR)
          })
          .catch((err) => {
            console.error('App init fetchProfile failed:', err)
          })
          .finally(() => {
            useAuthStore.setState({ loading: false })
          })
      } else {
        useAuthStore.setState({ loading: false })
      }
    }).catch(() => {
      useAuthStore.setState({ loading: false })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchProfile()
          .then(() => {
            const plan = useAuthStore.getState().profile?.plan ?? 'free'
            fetchLimits(plan)
            fetchUsage(session.user.id)
            fetchConstants(CURRENT_TAX_YEAR)
          })
          .catch((err) => {
            console.error('onAuthStateChange fetchProfile failed:', err)
          })
      } else {
        useAuthStore.setState({ profile: null, loading: false })
      }
    })

    return () => subscription.unsubscribe()
  }, [setSession, fetchProfile, fetchLimits, fetchUsage, fetchConstants])

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
      {/* Public */}
      <Route path="/"           element={<LandingPage />} />
      <Route path="/login"      element={<LoginPage />} />
      <Route path="/signup"     element={<SignupPage />} />
      <Route path="/mfa/verify" element={<MFAVerifyPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/terms-of-service" element={<TermsOfServicePage />} />
      <Route path="/contact-support" element={<ContactSupportPage />} />

      {/* Protected — user app */}
      <Route element={<AuthGuard />}>
        <Route path="/mfa/enroll" element={<MFAEnrollPage />} />
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
    </Suspense>
  )
}
