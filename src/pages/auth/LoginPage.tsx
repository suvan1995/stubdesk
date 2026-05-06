import { useState } from 'react'
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { recordLoginAttempt, isLoginLocked } from '@/lib/security'
import Input from '@/components/ui/Input'

export default function LoginPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { signIn, user, loading: authLoading } = useAuthStore()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'

  if (!authLoading && user) return <Navigate to="/dashboard" replace />

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Client-side rate limit check
    const lock = isLoginLocked()
    if (lock.locked) {
      setError(`Too many failed attempts. Try again in ${Math.ceil((lock.unlockIn ?? 900) / 60)} minutes.`)
      return
    }

    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)

    if (error) {
      const status = recordLoginAttempt(false)
      if (status.locked) {
        setError('Too many failed attempts. Account locked for 15 minutes.')
      } else {
        setError(`${error}${status.remaining < 3 ? ` (${status.remaining} attempt${status.remaining !== 1 ? 's' : ''} remaining)` : ''}`)
      }
      return
    }

    recordLoginAttempt(true)
    navigate(from, { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-brand-700 tracking-tight">StubDesk</h1>
          <p className="text-gray-500 text-sm mt-1">Canadian Payroll Software</p>
        </div>

        <h2 className="text-xl font-bold text-gray-800 mb-6">Sign in to your account</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email address"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-base mt-2"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-brand-600 font-semibold hover:underline">
            Start free trial
          </Link>
        </p>
      </div>
    </div>
  )
}
