import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

const features = [
  {
    icon: '🇨🇦',
    title: 'Built for Canadian Payroll',
    desc: 'CPP, CPP2, EI, and income tax calculated correctly for Ontario, Alberta, and British Columbia — updated annually from CRA T4127.',
  },
  {
    icon: '📄',
    title: 'Professional Pay Stubs',
    desc: 'Generate polished PDF pay stubs in seconds. Choose from five design templates and include your company logo.',
  },
  {
    icon: '🗂',
    title: 'Year-End T4 Slips',
    desc: 'Auto-generate T4 slips from your payslip history. Export CRA-compliant XML for electronic filing — no manual data entry.',
  },
  {
    icon: '🏢',
    title: 'Multiple Companies',
    desc: 'Manage payroll for more than one business from a single account. Each company keeps its own employees and payslip history.',
  },
  {
    icon: '🔐',
    title: 'Your Data Stays Private',
    desc: 'Hosted on Canadian servers. Row-level security means your data is never visible to other users — or to us.',
  },
  {
    icon: '⚡',
    title: 'Fast to Learn, Fast to Use',
    desc: 'A four-step wizard walks you through each payslip. Most users generate their first pay stub in under five minutes.',
  },
]

const steps = [
  { n: '1', title: 'Add your company',   desc: 'Enter your business name, address, and CRA business number.' },
  { n: '2', title: 'Add employees',      desc: 'Set up each employee with their pay rate, type, and schedule.' },
  { n: '3', title: 'Run payroll',        desc: 'Pick the pay period, review the calculated deductions, and generate the PDF.' },
  { n: '4', title: 'File year-end T4s',  desc: 'At year end, auto-generate T4 slips and export the CRA XML file.' },
]

const plans = [
  {
    name: 'Free',
    price: 0,
    note: 'No credit card needed',
    features: ['1 company', '2 employees', '10 payslips / month', 'PDF pay stubs', 'All 5 templates'],
    cta: 'Get Started Free',
    highlight: false,
  },
  {
    name: 'Starter',
    price: 7.49,
    note: 'per month · CAD',
    features: ['2 companies', '5 employees each', 'Unlimited payslips', 'T4 slip generation', 'PDF T4 export'],
    cta: 'Start Free Trial',
    highlight: false,
  },
  {
    name: 'Pro',
    price: 12.99,
    note: 'per month · CAD',
    features: ['Unlimited companies', 'Unlimited employees', 'Unlimited payslips', 'T4 generation + CRA XML export', 'Priority support'],
    cta: 'Start Free Trial',
    highlight: true,
  },
]

export default function LandingPage() {
  const { user, loading } = useAuthStore()

  // Redirect logged-in users straight to dashboard
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen bg-white text-gray-800">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-extrabold text-sm">P</span>
            </div>
            <span className="font-extrabold text-brand-700 text-lg tracking-tight">StubDesk</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#features" className="text-sm text-gray-500 hover:text-gray-800 hidden sm:block">Features</a>
            <a href="#pricing"  className="text-sm text-gray-500 hover:text-gray-800 hidden sm:block">Pricing</a>
            {user ? (
              <Link to="/dashboard" className="btn-primary text-sm">Dashboard →</Link>
            ) : (
              <>
                <Link to="/login"  className="text-sm font-medium text-gray-600 hover:text-brand-600">Sign In</Link>
                <Link to="/signup" className="btn-primary text-sm">Try Free</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="bg-gradient-to-b from-brand-600 via-brand-700 to-brand-800 text-white pt-24 pb-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Canadian payroll · CRA 2026 rates
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-6 tracking-tight">
            Payroll software that<br />
            <span className="text-brand-200">actually makes sense.</span>
          </h1>
          <p className="text-brand-100 text-lg leading-relaxed mb-10 max-w-xl mx-auto">
            Calculate CPP, EI, and income tax correctly every time.
            Generate professional pay stubs and year-end T4s — without a payroll degree.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="bg-white text-brand-700 font-bold px-8 py-3.5 rounded-xl hover:bg-brand-50 transition-colors text-base shadow-lg"
            >
              Start for free — no card needed
            </Link>
            <Link
              to="/login"
              className="border border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors text-base"
            >
              Sign in
            </Link>
          </div>
          <p className="text-brand-300 text-sm mt-5">14-day trial on paid plans · Cancel anytime</p>
        </div>

        {/* Fake UI preview */}
        <div className="max-w-2xl mx-auto mt-16 bg-white/10 border border-white/20 rounded-2xl p-4 backdrop-blur">
          <div className="bg-white rounded-xl overflow-hidden shadow-2xl">
            <div className="bg-brand-600 px-5 py-3 flex items-center justify-between">
              <span className="text-white font-bold text-sm">StubDesk — Payslip Builder</span>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-white/30"></div>
                <div className="w-3 h-3 rounded-full bg-white/30"></div>
                <div className="w-3 h-3 rounded-full bg-white/30"></div>
              </div>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3 text-xs">
              {[
                ['Employee', 'Jane Smith'],
                ['Pay Period', 'Jun 1 – Jun 14, 2026'],
                ['Gross Pay', '$2,884.62'],
                ['CPP', '−$148.20'],
                ['EI', '−$47.10'],
                ['Federal Tax', '−$312.40'],
                ['Provincial Tax (ON)', '−$148.80'],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between border-b border-gray-100 pb-1.5">
                  <span className="text-gray-400">{label}</span>
                  <span className={`font-semibold ${val.startsWith('−') ? 'text-red-500' : 'text-gray-800'}`}>{val}</span>
                </div>
              ))}
              <div className="col-span-2 bg-green-50 rounded-lg px-3 py-2 flex justify-between items-center mt-1">
                <span className="font-bold text-green-800">Net Pay</span>
                <span className="font-extrabold text-green-700 text-base">$2,228.12</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-extrabold text-center text-gray-800 mb-3">How it works</h2>
          <p className="text-center text-gray-500 mb-12">Four steps from setup to filed T4s.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map(s => (
              <div key={s.n} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="w-9 h-9 rounded-full bg-brand-600 text-white font-extrabold text-sm flex items-center justify-center mb-4">
                  {s.n}
                </div>
                <h3 className="font-bold text-gray-800 mb-2 text-base">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-extrabold text-center text-gray-800 mb-3">Everything you need</h2>
          <p className="text-center text-gray-500 mb-12">No spreadsheets. No guesswork. No CRA surprises.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title} className="rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-gray-800 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-extrabold text-center text-gray-800 mb-3">Straightforward pricing</h2>
          <p className="text-center text-gray-500 mb-12">All prices in Canadian dollars. No hidden fees.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {plans.map(p => (
              <div
                key={p.name}
                className={`rounded-2xl border p-7 flex flex-col ${
                  p.highlight
                    ? 'border-brand-500 ring-2 ring-brand-400 bg-white shadow-lg'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {p.highlight && (
                  <div className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3">Most Popular</div>
                )}
                <div className="font-bold text-xl text-gray-800 mb-1">{p.name}</div>
                <div className="mb-1">
                  {p.price === 0 ? (
                    <span className="text-3xl font-extrabold text-gray-700">Free</span>
                  ) : (
                    <>
                      <span className="text-3xl font-extrabold text-brand-700">${p.price}</span>
                      <span className="text-gray-400 text-sm ml-1">{p.note}</span>
                    </>
                  )}
                </div>
                {p.price === 0 && (
                  <p className="text-xs text-gray-400 mb-4">{p.note}</p>
                )}
                <ul className="space-y-2.5 my-5 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-green-500 font-bold mt-0.5 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className={`text-center font-semibold py-2.5 rounded-xl transition-colors text-sm ${
                    p.highlight
                      ? 'bg-brand-600 text-white hover:bg-brand-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-8">
            Paid plans include a 14-day free trial. Cancel anytime from your account settings.
            Payments processed securely by Stripe.
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6 bg-brand-600 text-white text-center">
        <h2 className="text-3xl font-extrabold mb-4">Ready to simplify your payroll?</h2>
        <p className="text-brand-200 mb-8 max-w-md mx-auto">
          Create a free account and generate your first pay stub in minutes.
          No credit card required.
        </p>
        <Link
          to="/signup"
          className="bg-white text-brand-700 font-bold px-10 py-3.5 rounded-xl hover:bg-brand-50 transition-colors text-base inline-block shadow-lg"
        >
          Create free account →
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-500 rounded flex items-center justify-center">
              <span className="text-white font-extrabold text-xs">S</span>
            </div>
            <span className="font-bold text-white">StubDesk</span>
            <span className="text-gray-600 text-sm">· Canadian Payroll Software</span>
          </div>
          <div className="flex gap-6 text-sm">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing"  className="hover:text-white transition-colors">Pricing</a>
            <Link to="/login"   className="hover:text-white transition-colors">Sign In</Link>
          </div>
          <p className="text-sm text-gray-600">© {new Date().getFullYear()} StubDesk. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
