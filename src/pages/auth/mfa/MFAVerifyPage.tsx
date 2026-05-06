/**
 * MFA Verify Page — shown after login when the user has TOTP enrolled.
 * User enters the 6-digit code from their authenticator app.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function MFAVerifyPage() {
  const navigate = useNavigate()
  const [code,    setCode]    = useState('')
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 6) { setError('Enter the 6-digit code from your authenticator app.'); return }
    setLoading(true); setError(null)

    // Get the current MFA challenge
    const { data: factors } = await supabase.auth.mfa.listFactors()
    const totp = factors?.totp?.[0]
    if (!totp) { setError('No authenticator app enrolled. Please set one up in Settings.'); setLoading(false); return }

    const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: totp.id })
    if (challengeErr || !challenge) { setError(challengeErr?.message ?? 'Challenge failed.'); setLoading(false); return }

    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId:    totp.id,
      challengeId: challenge.id,
      code:        code.trim(),
    })

    setLoading(false)
    if (verifyErr) { setError('Invalid code. Please try again.'); return }
    navigate('/dashboard', { replace: true })
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🔐</div>
          <h1 className="text-2xl font-extrabold text-brand-700">Two-Factor Auth</h1>
          <p className="text-gray-500 text-sm mt-2">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            className="input text-center text-2xl tracking-[0.5em] font-mono"
            placeholder="000000"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            autoFocus
            autoComplete="one-time-code"
          />
          <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
            {loading ? 'Verifying…' : 'Verify'}
          </button>
        </form>

        <button
          onClick={handleSignOut}
          className="w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-4"
        >
          Sign out and use a different account
        </button>
      </div>
    </div>
  )
}
