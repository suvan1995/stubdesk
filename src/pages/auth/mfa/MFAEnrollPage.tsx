/**
 * MFA Enroll Page — lets users set up TOTP (Google Authenticator, Authy, etc.)
 * Accessible from Settings page.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function MFAEnrollPage() {
  const navigate = useNavigate()
  const [qrCode,    setQrCode]    = useState<string | null>(null)
  const [secret,    setSecret]    = useState<string | null>(null)
  const [factorId,  setFactorId]  = useState<string | null>(null)
  const [code,      setCode]      = useState('')
  const [error,     setError]     = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [enrolled,  setEnrolled]  = useState(false)
  const [existing,  setExisting]  = useState(false)

  useEffect(() => { checkExisting() }, [])

  async function checkExisting() {
    const { data } = await supabase.auth.mfa.listFactors()
    if (data?.totp && data.totp.length > 0) {
      setExisting(true)
    } else {
      startEnrollment()
    }
  }

  async function startEnrollment() {
    setLoading(true)
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'StubDesk Authenticator',
    })
    setLoading(false)
    if (error || !data) { setError(error?.message ?? 'Failed to start enrollment.'); return }
    setFactorId(data.id)
    setQrCode(data.totp.qr_code)
    setSecret(data.totp.secret)
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId) return
    if (code.length !== 6) { setError('Enter the 6-digit code.'); return }
    setLoading(true); setError(null)

    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId })
    if (cErr || !challenge) { setError(cErr?.message ?? 'Challenge failed.'); setLoading(false); return }

    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.trim(),
    })
    setLoading(false)
    if (vErr) { setError('Invalid code. Check your authenticator app and try again.'); return }
    setEnrolled(true)
  }

  async function handleUnenroll() {
    const { data } = await supabase.auth.mfa.listFactors()
    const totp = data?.totp?.[0]
    if (!totp) return
    if (!confirm('Remove two-factor authentication? Your account will be less secure.')) return
    await supabase.auth.mfa.unenroll({ factorId: totp.id })
    setExisting(false)
    startEnrollment()
  }

  if (enrolled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">2FA Enabled</h2>
          <p className="text-gray-500 text-sm mb-6">
            Your account is now protected with two-factor authentication.
            You'll need your authenticator app every time you sign in.
          </p>
          <button className="btn-primary w-full" onClick={() => navigate('/settings')}>
            Back to Settings
          </button>
        </div>
      </div>
    )
  }

  if (existing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
          <div className="text-5xl mb-4">🔐</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">2FA Already Enabled</h2>
          <p className="text-gray-500 text-sm mb-6">
            Your account already has an authenticator app enrolled.
          </p>
          <div className="space-y-3">
            <button className="btn-secondary w-full" onClick={() => navigate('/settings')}>
              Back to Settings
            </button>
            <button className="btn-danger w-full" onClick={handleUnenroll}>
              Remove 2FA
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">📱</div>
          <h1 className="text-2xl font-extrabold text-brand-700">Set Up 2FA</h1>
          <p className="text-gray-500 text-sm mt-2">
            Use Google Authenticator, Authy, or any TOTP app
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        {loading && !qrCode && (
          <div className="text-center py-8 text-gray-400">Generating QR code…</div>
        )}

        {qrCode && (
          <>
            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Step 1 — Scan this QR code with your authenticator app
                </p>
                <div className="flex justify-center">
                  <img src={qrCode} alt="QR Code" className="w-48 h-48 border border-gray-200 rounded-lg" />
                </div>
              </div>

              {secret && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 mb-1">
                    Can't scan? Enter this key manually:
                  </p>
                  <code className="text-xs font-mono bg-white border border-gray-200 rounded px-2 py-1 block text-center tracking-widest">
                    {secret}
                  </code>
                </div>
              )}
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="label">
                  Step 2 — Enter the 6-digit code from your app
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  className="input text-center text-2xl tracking-[0.5em] font-mono"
                  placeholder="000000"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  autoComplete="one-time-code"
                />
              </div>
              <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
                {loading ? 'Verifying…' : 'Enable 2FA'}
              </button>
            </form>
          </>
        )}

        <button
          onClick={() => navigate('/settings')}
          className="w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-4"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
