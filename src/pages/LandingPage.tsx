import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function LandingPage() {
  const { user, loading } = useAuthStore()

  // Redirect logged-in users straight to dashboard
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">

      {/* ── Floating Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-200">
              <span className="text-white font-black text-xl">S</span>
            </div>
            <div>
              <div className="font-black text-brand-700 text-xl tracking-tight">StubDesk</div>
              <div className="text-xs text-gray-500 -mt-0.5">Canadian Payroll</div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-brand-600 transition-colors hidden md:block">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-brand-600 transition-colors hidden md:block">How It Works</a>
            <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-brand-600 transition-colors hidden md:block">Pricing</a>
            {user ? (
              <Link to="/dashboard" className="btn-primary text-sm shadow-lg shadow-brand-200">Dashboard →</Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-semibold text-gray-700 hover:text-brand-600 transition-colors">Sign In</Link>
                <Link to="/signup" className="btn-primary text-sm shadow-lg shadow-brand-200">Get Started Free</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-10 w-96 h-96 bg-brand-200/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur border border-brand-200 rounded-full px-5 py-2 text-sm font-semibold text-brand-700 mb-8 shadow-lg shadow-brand-100">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500"></span>
              </span>
              CRA 2026 Compliant · Built for Canada
            </div>

            {/* Main headline */}
            <h1 className="text-5xl md:text-7xl font-black text-gray-900 leading-tight mb-6 tracking-tight">
              Payroll that<br />
              <span className="bg-gradient-to-r from-brand-600 via-brand-500 to-indigo-600 bg-clip-text text-transparent">
                just works.
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 leading-relaxed mb-10 max-w-3xl mx-auto font-light">
              Calculate CPP, EI, and income tax with confidence. Generate professional pay stubs and T4s in minutes — no accounting degree required.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link
                to="/signup"
                className="group bg-gradient-to-r from-brand-600 to-brand-700 text-white font-bold px-10 py-4 rounded-2xl hover:shadow-2xl hover:shadow-brand-300 transition-all duration-300 text-lg flex items-center gap-2 shadow-xl shadow-brand-200"
              >
                Start Free Trial
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <Link
                to="/login"
                className="bg-white text-gray-700 font-semibold px-10 py-4 rounded-2xl hover:bg-gray-50 transition-all duration-300 text-lg border-2 border-gray-200 shadow-lg"
              >
                Sign In
              </Link>
            </div>

            <p className="text-sm text-gray-500">
              ✓ No credit card required  ·  ✓ 14-day free trial  ·  ✓ Cancel anytime
            </p>
          </div>

          {/* Hero Image / Preview */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent h-32 bottom-0 z-10"></div>
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden transform hover:scale-[1.02] transition-transform duration-500">
              <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-white/30"></div>
                    <div className="w-3 h-3 rounded-full bg-white/30"></div>
                    <div className="w-3 h-3 rounded-full bg-white/30"></div>
                  </div>
                  <span className="text-white font-bold text-sm ml-3">StubDesk — Payslip Builder</span>
                </div>
                <div className="text-white/70 text-xs">Pay Period: Jun 1 – Jun 14, 2026</div>
              </div>
              <div className="p-8 bg-gradient-to-br from-gray-50 to-white">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                    <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Employee</div>
                    <div className="text-lg font-bold text-gray-900">Jane Smith</div>
                    <div className="text-sm text-gray-500 mt-1">Bi-Weekly · Salaried</div>
                  </div>
                  <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                    <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Gross Pay</div>
                    <div className="text-lg font-bold text-gray-900">$2,884.62</div>
                    <div className="text-sm text-gray-500 mt-1">Regular + Vacation</div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">CPP</span>
                    <span className="font-mono text-red-600">−$148.20</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">EI</span>
                    <span className="font-mono text-red-600">−$47.10</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Federal Tax</span>
                    <span className="font-mono text-red-600">−$312.40</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Provincial Tax (ON)</span>
                    <span className="font-mono text-red-600">−$148.80</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 mt-3"></div>
                  <div className="flex justify-between items-center bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg px-4 py-3 border border-green-200">
                    <span className="font-bold text-green-900">Net Pay</span>
                    <span className="font-black text-green-700 text-xl">$2,228.12</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-24 px-6 bg-white relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">How it works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Four simple steps from setup to year-end filing.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { num: '01', title: 'Add Company', desc: 'Enter your business details, address, and CRA business number.', icon: '🏢' },
              { num: '02', title: 'Add Employees', desc: 'Set up each employee with pay rate, schedule, and deductions.', icon: '👥' },
              { num: '03', title: 'Run Payroll', desc: 'Generate pay stubs with automatic tax calculations in seconds.', icon: '⚡' },
              { num: '04', title: 'File T4s', desc: 'Auto-generate T4 slips and export CRA XML at year-end.', icon: '📄' },
            ].map((step) => (
              <div key={step.num} className="relative group">
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-8 border-2 border-gray-200 hover:border-brand-300 hover:shadow-xl transition-all duration-300 h-full">
                  <div className="text-5xl mb-4">{step.icon}</div>
                  <div className="text-sm font-black text-brand-600 mb-2 tracking-wider">{step.num}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section id="features" className="py-24 px-6 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">Everything you need</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Powerful features designed for Canadian small businesses.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: '🇨🇦', title: 'CRA Compliant', desc: 'CPP, CPP2, EI, and income tax calculated correctly for ON, AB, and BC. Updated annually from CRA T4127.' },
              { icon: '📊', title: 'YTD Tracking', desc: 'Automatic year-to-date calculations for all earnings and deductions. Perfect for mid-year onboarding.' },
              { icon: '🎨', title: '7 Templates', desc: 'Choose from professional pay stub designs. Color or black & white. Add your company logo.' },
              { icon: '📱', title: 'Cloud Storage', desc: 'All payslips saved securely in the cloud. Access from anywhere, anytime.' },
              { icon: '🏢', title: 'Multi-Company', desc: 'Manage payroll for multiple businesses from one account. Each with separate employees and history.' },
              { icon: '📄', title: 'T4 Generation', desc: 'Auto-generate T4 slips from payslip history. Export CRA-compliant XML for electronic filing.' },
              { icon: '🔐', title: 'Secure & Private', desc: 'Hosted on Canadian servers. Row-level security ensures your data stays private.' },
              { icon: '⚡', title: 'Lightning Fast', desc: 'Generate professional pay stubs in under 30 seconds. No waiting, no complexity.' },
              { icon: '💰', title: 'Transparent Pricing', desc: 'Simple plans with no hidden fees. Free tier available. Cancel anytime.' },
            ].map((feature) => (
              <div key={feature.title} className="bg-white rounded-2xl p-8 border border-gray-200 hover:shadow-xl hover:border-brand-300 transition-all duration-300 group">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">All prices in Canadian dollars. No hidden fees. Cancel anytime.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Free',
                price: 0,
                period: 'Forever free',
                features: ['1 company', '2 employees', '10 payslips/month', 'All 7 templates', 'PDF pay stubs'],
                cta: 'Get Started',
                popular: false,
              },
              {
                name: 'Starter',
                price: 7.49,
                period: 'per month',
                features: ['2 companies', '5 employees each', 'Unlimited payslips', 'T4 generation', 'Cloud storage'],
                cta: 'Start Free Trial',
                popular: false,
              },
              {
                name: 'Pro',
                price: 12.99,
                period: 'per month',
                features: ['Unlimited companies', 'Unlimited employees', 'Unlimited payslips', 'T4 + CRA XML export', 'Priority support'],
                cta: 'Start Free Trial',
                popular: true,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-3xl p-8 border-2 relative ${
                  plan.popular
                    ? 'border-brand-500 bg-gradient-to-br from-brand-50 to-indigo-50 shadow-2xl shadow-brand-200 scale-105'
                    : 'border-gray-200 bg-white hover:border-brand-300 hover:shadow-xl transition-all duration-300'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-600 to-brand-700 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                    MOST POPULAR
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-black text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-2">
                    {plan.price === 0 ? (
                      <span className="text-5xl font-black text-gray-900">Free</span>
                    ) : (
                      <>
                        <span className="text-5xl font-black text-brand-700">${plan.price}</span>
                        <span className="text-gray-500 text-lg ml-2">{plan.period}</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{plan.period}</p>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <span className="text-green-500 font-bold text-lg shrink-0">✓</span>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/signup"
                  className={`block text-center font-bold py-4 rounded-xl transition-all duration-300 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-lg shadow-brand-200 hover:shadow-xl hover:shadow-brand-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-500 mt-12">
            All paid plans include a 14-day free trial. No credit card required to start. Payments processed securely by Stripe.
          </p>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-6 bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-black mb-6">Ready to simplify payroll?</h2>
          <p className="text-xl text-brand-100 mb-10 max-w-2xl mx-auto">
            Join hundreds of Canadian small businesses who trust StubDesk for their payroll needs.
          </p>
          <Link
            to="/signup"
            className="inline-block bg-white text-brand-700 font-bold px-12 py-5 rounded-2xl hover:bg-brand-50 transition-all duration-300 text-lg shadow-2xl hover:scale-105"
          >
            Start Free Trial →
          </Link>
          <p className="text-brand-200 text-sm mt-6">No credit card required · 14-day free trial · Cancel anytime</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-black text-lg">S</span>
              </div>
              <div>
                <div className="font-black text-white text-lg">StubDesk</div>
                <div className="text-xs text-gray-500">Canadian Payroll Software</div>
              </div>
            </div>

            <div className="flex gap-8 text-sm">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
              <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-600">© {new Date().getFullYear()} StubDesk. All rights reserved.</p>
            <p className="text-sm text-gray-600">Made with ❤️ in Canada</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
