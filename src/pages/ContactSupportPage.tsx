import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

const supportTopics = [
  'Account access or MFA',
  'Billing and subscriptions',
  'Payroll calculations',
  'Payslip or year-end exports',
  'Privacy and data requests',
]

export default function ContactSupportPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('sending')
    setError('')

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contact-support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.error) throw new Error(data.error || 'Could not send your message.')

      setStatus('sent')
      setName('')
      setEmail('')
      setMessage('')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Could not send your message.')
    }
  }

  return (
    <main className="landing-dark-body min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-16 sm:py-24">
        <Link to="/" className="text-sm font-semibold text-cyan-400 hover:text-cyan-300">
          Back to StubDesk
        </Link>

        <section className="card-glass mt-8 p-6 sm:p-10 space-y-8">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">Contact Support</p>
            <h1 className="text-4xl sm:text-5xl font-black text-white">We are here to help</h1>
            <p className="text-slate-400">
              Send us the details of what is happening and we will help you get unstuck.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                <h2 className="text-lg font-bold text-white">Support Email</h2>
                <a
                  href="mailto:support@stubdesk.ca"
                  className="mt-2 inline-flex text-cyan-400 hover:text-cyan-300 font-semibold"
                >
                  support@stubdesk.ca
                </a>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                <h2 className="text-lg font-bold text-white">Helpful Details</h2>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {supportTopics.map(topic => (
                    <li key={topic}>- {topic}</li>
                  ))}
                </ul>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-5"
            >
              <div>
                <label htmlFor="support-name" className="block text-xs font-bold uppercase text-slate-400">
                  Name
                </label>
                <input
                  id="support-name"
                  name="name"
                  autoComplete="name"
                  className="preview-input mt-2"
                  value={name}
                  required
                  onChange={event => setName(event.target.value)}
                />
              </div>

              <div>
                <label htmlFor="support-email" className="block text-xs font-bold uppercase text-slate-400">
                  Email
                </label>
                <input
                  id="support-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="preview-input mt-2"
                  value={email}
                  required
                  onChange={event => setEmail(event.target.value)}
                />
              </div>

              <div>
                <label htmlFor="support-message" className="block text-xs font-bold uppercase text-slate-400">
                  Message
                </label>
                <textarea
                  id="support-message"
                  name="message"
                  rows={6}
                  className="preview-input mt-2 resize-y"
                  value={message}
                  required
                  onChange={event => setMessage(event.target.value)}
                />
              </div>

              {status === 'sent' && (
                <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
                  Your support request was sent. We will get back to you soon.
                </p>
              )}

              {status === 'error' && (
                <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 font-black text-slate-950 shadow-lg transition-all hover:shadow-cyan-400/30"
              >
                {status === 'sending' ? 'Sending...' : 'Send Support Request'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  )
}
