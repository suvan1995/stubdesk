import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { Card, CardTitle } from '@/components/ui/Card'
import Input from '@/components/ui/Input'

export default function SettingsPage() {
  const { profile, fetchProfile } = useAuthStore()
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState<{ text: string; ok: boolean } | null>(null)

  const [_curPw, setCurPw]  = useState('')
  const [newPw,  setNewPw]  = useState('')
  const [pwMsg,  setPwMsg]  = useState<{ text: string; ok: boolean } | null>(null)
  const [pwSaving, setPwSaving] = useState(false)

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setMsg(null)
    const { error } = await (supabase.from('profiles') as any)
      .update({ full_name: fullName })
      .eq('id', profile!.id)
    setSaving(false)
    if (error) setMsg({ text: error.message, ok: false })
    else { setMsg({ text: 'Profile updated.', ok: true }); fetchProfile() }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPw.length < 8) { setPwMsg({ text: 'Password must be at least 8 characters.', ok: false }); return }
    setPwSaving(true); setPwMsg(null)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setPwSaving(false)
    if (error) setPwMsg({ text: error.message, ok: false })
    else { setPwMsg({ text: 'Password changed successfully.', ok: true }); setCurPw(''); setNewPw('') }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1>Settings</h1>

      {/* Profile */}
      <Card>
        <CardTitle>Profile</CardTitle>
        <form onSubmit={saveProfile} className="space-y-4">
          <Input label="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} />
          <div>
            <label className="label">Email</label>
            <input className="input bg-gray-50" value={profile?.email ?? ''} disabled />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed here. Contact support.</p>
          </div>
          {msg && (
            <p className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>
          )}
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      </Card>

      {/* Password */}
      <Card>
        <CardTitle>Change Password</CardTitle>
        <form onSubmit={changePassword} className="space-y-4">
          <Input label="New Password" type="password" value={newPw}
            onChange={e => setNewPw(e.target.value)} placeholder="Min. 8 characters" />
          {pwMsg && (
            <p className={`text-sm ${pwMsg.ok ? 'text-green-600' : 'text-red-500'}`}>{pwMsg.text}</p>
          )}
          <button type="submit" className="btn-primary" disabled={pwSaving}>
            {pwSaving ? 'Updating…' : 'Change Password'}
          </button>
        </form>
      </Card>

      {/* 2FA */}
      <Card>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <p className="text-sm text-gray-500 mb-4">
          Add an extra layer of security. After enabling, you'll need your authenticator app every time you sign in.
        </p>
        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📱</span>
            <div>
              <div className="font-semibold text-sm text-gray-800">Authenticator App (TOTP)</div>
              <div className="text-xs text-gray-400">Google Authenticator, Authy, 1Password, etc.</div>
            </div>
          </div>
          <Link to="/mfa/enroll" className="btn-primary text-sm py-2">
            Set Up 2FA
          </Link>
        </div>
        <p className="text-xs text-gray-400">
          After setup, you'll be asked for a 6-digit code from your app each time you log in.
        </p>
      </Card>

      {/* Danger zone */}
      <Card>
        <CardTitle className="text-red-500">Danger Zone</CardTitle>
        <p className="text-sm text-gray-500 mb-3">
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
        <button className="btn-danger" onClick={() => {
          if (confirm('Are you absolutely sure? This will delete your account and all data permanently.')) {
            alert('Please contact support to delete your account.')
          }
        }}>
          Delete Account
        </button>
      </Card>
    </div>
  )
}
