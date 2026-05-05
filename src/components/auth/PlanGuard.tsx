import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

// Blocks access to payslip builder if user has no active plan
export default function PlanGuard() {
  const { profile } = useAuthStore()

  const isActive =
    profile?.subscription_status === 'active' ||
    profile?.subscription_status === 'trialing' ||
    // Free plan gets limited access
    profile?.plan === 'free'

  if (!isActive) {
    return <Navigate to="/billing" replace />
  }

  return <Outlet />
}
