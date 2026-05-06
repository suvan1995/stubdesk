import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'

export default function AuthGuard() {
  const { user, loading } = useAuthStore()
  const location = useLocation()
  const [mfaChecked, setMfaChecked] = useState(false)
  const [needsMFA,   setNeedsMFA]   = useState(false)

  useEffect(() => {
    if (!user) { setMfaChecked(true); return }
    checkMFA()
  }, [user])

  async function checkMFA() {
    try {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      // If user has TOTP enrolled (aal2 available) but current session is only aal1,
      // they need to complete MFA verification
      if (data?.nextLevel === 'aal2' && data?.currentLevel === 'aal1') {
        setNeedsMFA(true)
      }
    } catch {
      // MFA check failed — allow through (don't block on MFA errors)
    }
    setMfaChecked(true)
  }

  // Still loading session or checking MFA
  if (loading || !mfaChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (needsMFA && location.pathname !== '/mfa/verify') {
    return <Navigate to="/mfa/verify" replace />
  }

  return <Outlet />
}
