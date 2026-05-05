import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { Card, CardTitle } from '@/components/ui/Card'
import clsx from 'clsx'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Try StubDesk with no commitment.',
    features: [
      '1 company',
      '2 employees',
      '10 payslips / month',
      'PDF downloads',
      'All 5 templates',
    ],
    priceId: null,
    highlight: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 7.49,
    description: 'For small businesses with a couple of companies.',
    features: [
      '2 companies',
      '5 employees per company',
      'Unlimited payslips',
      'PDF downloads',
      'All 5 templates',
      'T4 slip generation',
      'CRA T4 PDF export',
    ],
    priceId: import.meta.env.VITE_STRIPE_STARTER_PRICE_ID,
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 12.99,
    description: 'Unlimited everything for growing businesses.',
    features: [
      'Unlimited companies',
      'Unlimited employees',
      'Unlimited payslips',
      'PDF downloads',
      'All 5 templates',
      'T4 slip generation',
      'CRA XML export (electronic filing)',
      'Priority support',
    ],
    priceId: import.meta.env.VITE_STRIPE_PRO_PRICE_ID,
    highlight: true,
  },
]

export default function BillingPage() {
  const { profile } = useAuthStore()
  const [loading, setLoading] = useState<string | null>(null)

  async function getToken() {
    return (await supabase.auth.getSession()).data.session?.access_token
  }

  async function handleSubscribe(priceId: string | null, planId: string) {
    if (!priceId) return
    setLoading(planId)
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await getToken()}` },
        body: JSON.stringify({
          priceId,
          successUrl: `${import.meta.env.VITE_APP_URL}/dashboard?upgraded=1`,
          cancelUrl:  `${import.meta.env.VITE_APP_URL}/billing`,
        }),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch { alert('Could not start checkout. Please try again.') }
    finally { setLoading(null) }
  }

  async function handleManage() {
    setLoading('portal')
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/customer-portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await getToken()}` },
        body: JSON.stringify({ returnUrl: `${import.meta.env.VITE_APP_URL}/billing` }),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch { alert('Could not open billing portal.') }
    finally { setLoading(null) }
  }

  const currentPlan = profile?.plan ?? 'free'
  const isActive    = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1>Billing &amp; Plans</h1>

      {/* Current status */}
      <Card>
        <CardTitle>Current Plan</CardTitle>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <span className={clsx('text-lg font-bold capitalize',
              currentPlan === 'pro'     ? 'text-purple-600' :
              currentPlan === 'starter' ? 'text-green-600'  : 'text-gray-600'
            )}>
              {currentPlan} Plan
            </span>
            {profile?.subscription_status && (
              <span className={clsx('ml-3 badge',
                profile.subscription_status === 'active'   ? 'badge-green'  :
                profile.subscription_status === 'trialing' ? 'badge-yellow' :
                profile.subscription_status === 'past_due' ? 'badge-red'    : 'badge-gray'
              )}>
                {profile.subscription_status}
              </span>
            )}
            {profile?.trial_ends_at && profile.subscription_status === 'trialing' && (
              <p className="text-sm text-gray-500 mt-1">
                Trial ends {new Date(profile.trial_ends_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>
          {isActive && currentPlan !== 'free' && (
            <button className="btn-secondary" onClick={handleManage} disabled={loading === 'portal'}>
              {loading === 'portal' ? 'Opening…' : 'Manage Subscription'}
            </button>
          )}
        </div>
      </Card>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {PLANS.map(plan => (
          <div key={plan.id} className={clsx('card p-6 flex flex-col',
            plan.highlight && 'ring-2 ring-brand-500'
          )}>
            {plan.highlight && <div className="badge-blue self-start mb-3">Most Popular</div>}
            <div className="font-bold text-xl text-gray-800">{plan.name}</div>
            <div className="mt-1 mb-3">
              {plan.price === 0
                ? <span className="text-3xl font-extrabold text-gray-600">Free</span>
                : <><span className="text-3xl font-extrabold text-brand-700">${plan.price}</span>
                   <span className="text-gray-400 text-sm">/month CAD</span></>
              }
            </div>
            <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
            <ul className="space-y-2 mb-6 flex-1">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="text-green-500 font-bold shrink-0">✓</span> {f}
                </li>
              ))}
            </ul>
            <button
              className={clsx('w-full', plan.highlight ? 'btn-primary' : 'btn-secondary')}
              disabled={currentPlan === plan.id || !plan.priceId || loading === plan.id}
              onClick={() => plan.priceId && handleSubscribe(plan.priceId, plan.id)}
            >
              {loading === plan.id   ? 'Redirecting…'          :
               currentPlan === plan.id ? 'Current Plan'        :
               plan.price === 0     ? 'Free Plan'              :
               `Upgrade to ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center">
        Paid plans include a 14-day free trial. Cancel anytime. Prices in CAD.
        Payments processed securely by Stripe.
      </p>
    </div>
  )
}
