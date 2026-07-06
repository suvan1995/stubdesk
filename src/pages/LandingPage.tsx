import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function LandingPage() {
  const { user, loading } = useAuthStore()

  // Calculator Preview Widget States
  const [hourlyRate, setHourlyRate] = useState<number>(35)
  const [hoursWorked, setHoursWorked] = useState<number>(40)
  const [province, setProvince] = useState<'ON' | 'AB' | 'BC'>('ON')
  
  // Pricing toggle state
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly')

  // FAQ state
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  // Redirect logged-in users straight to dashboard
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />
  }

  // Quick Payroll Calculator engine for the homepage demo
  const grossPay = hourlyRate * hoursWorked
  const cppRate = 0.0595
  const eiRate = 0.0164
  const taxRate = province === 'ON' ? 0.142 : province === 'AB' ? 0.155 : 0.138

  const cppDeduct = grossPay * cppRate
  const eiDeduct = grossPay * eiRate
  const taxDeduct = grossPay * taxRate
  const totalDeductions = cppDeduct + eiDeduct + taxDeduct
  const netPay = grossPay - totalDeductions

  const fmt = (val: number) =>
    new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(val)

  const faqs = [
    {
      q: 'Is StubDesk compliant with the latest CRA tax regulations?',
      a: 'Absolutely. StubDesk is built specifically for Canadian payroll and is updated annually with the latest Canada Revenue Agency (CRA) guidelines, including standard CPP, EI premiums, and the new progressive CPP2 contributions for high-earning employees.'
    },
    {
      q: 'How does year-end T4 slip generation work?',
      a: 'At year-end, StubDesk aggregates all payslip history for your employees and automatically populates Box 14, 16, 17, 18, 22, 24, and 26. You can download official CRA-compliant T4 PDF slips for your employees and export the required XML internet file transfers.'
    },
    {
      q: 'Can I manage payroll for multiple corporate branches or companies?',
      a: 'Yes! StubDesk supports multi-company management from a single account. Our Pro Plan offers unlimited companies and employees, making it ideal for accounting professionals and serial entrepreneurs.'
    },
    {
      q: 'Is my financial and employee data secure with StubDesk?',
      a: 'Data safety is our primary focus. We implement strict Content Security Policies (CSP), automatic session timeout logs to protect admin panels on shared devices, and secure cloud storage synced directly with enterprise Supabase databases.'
    }
  ]

  return (
    <div className="landing-dark-body relative min-h-screen overflow-hidden">
      {/* Glow Orbs background effect */}
      <div className="glow-sphere glow-cyan"></div>
      <div className="glow-sphere glow-purple"></div>

      {/* Sticky Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#080b11]/75 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center shadow-lg badge-glowing shrink-0">
              <span className="text-slate-950 font-black text-xl">S</span>
            </div>
            <div>
              <div className="font-extrabold text-white text-xl tracking-tight leading-none">
                Stub<span className="text-gradient-cyan">Desk</span>
              </div>
              <div className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mt-1">Canadian Payroll</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-semibold text-slate-300 hover:text-cyan-400 transition-colors">Features</a>
            <a href="#demo" className="text-sm font-semibold text-slate-300 hover:text-cyan-400 transition-colors">Interactive Demo</a>
            <a href="#pricing" className="text-sm font-semibold text-slate-300 hover:text-cyan-400 transition-colors">Pricing</a>
            <a href="#faq" className="text-sm font-semibold text-slate-300 hover:text-cyan-400 transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="inline-flex items-center justify-center border-1.5 border-white/10 hover:border-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:text-cyan-400 rounded-xl transition-all hover:bg-cyan-500/5 bg-transparent cursor-pointer">Sign In</Link>
            <Link to="/signup" className="inline-flex items-center justify-center bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold px-4 py-2 text-sm rounded-xl transition-all shadow-lg hover:shadow-cyan-400/30 hover:scale-[1.02] cursor-pointer">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero & Interactive Demo Section */}
      <header className="pt-36 pb-20 lg:pt-44 lg:pb-32 relative">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          {/* Hero Content Left */}
          <div className="lg:col-span-6 space-y-8 text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 text-xs font-bold">
              <span className="pulsing-indicator"></span>
              2026 CRA COMPLIANT
            </div>
            
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white leading-tight tracking-tight">
              Payroll that <br />
              calculates <br />
              <span className="text-gradient-cyan">itself.</span>
            </h1>
            
            <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
              Calculate federal & provincial taxes, instantly generate gorgeous PDF payslips, and compile year-end T4 returns in seconds. Engineered precisely for Canadian small businesses.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link to="/signup" className="inline-flex items-center justify-center bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-extrabold px-8 py-4 rounded-2xl transition-all shadow-lg hover:shadow-cyan-400/40 hover:scale-[1.02] cursor-pointer text-base">
                Start Free Trial
              </Link>
              <a href="#demo" className="inline-flex items-center justify-center border-2 border-white/10 hover:border-cyan-500 px-8 py-4 text-base font-semibold text-white hover:text-cyan-400 rounded-2xl transition-all hover:bg-cyan-500/5 bg-transparent cursor-pointer">
                Try the Calculator
              </a>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-800/60">
              <div>
                <div className="text-3xl font-black text-white">100%</div>
                <div className="text-xs text-slate-500 font-medium mt-1">CRA Accuracy Guarantee</div>
              </div>
              <div>
                <div className="text-3xl font-black text-white">5k+</div>
                <div className="text-xs text-slate-500 font-medium mt-1">Payslips Generated</div>
              </div>
              <div>
                <div className="text-3xl font-black text-white">&lt; 10s</div>
                <div className="text-xs text-slate-500 font-medium mt-1">Processing Time</div>
              </div>
            </div>
          </div>

          {/* Interactive Calculator Widget Right */}
          <div id="demo" className="lg:col-span-6">
            <div className="card-glass relative overflow-hidden p-6 sm:p-8 space-y-6">
              
              {/* Decorative top gradient bar */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-purple-500"></div>
              
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📱</span> Interactive Calculator Preview
                </h3>
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                  Live Engine
                </span>
              </div>

              {/* Calculator Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">
                    Hourly Wage
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-sm text-slate-500">
                      $
                    </span>
                    <input 
                      type="number"
                      className="preview-input preview-input-currency" 
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">
                    Hours Worked
                  </label>
                  <input 
                    type="number"
                    className="preview-input" 
                    value={hoursWorked}
                    onChange={(e) => setHoursWorked(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">
                    Province
                  </label>
                  <select 
                    className="preview-input"
                    value={province}
                    onChange={(e) => setProvince(e.target.value as any)}
                  >
                    <option value="ON">Ontario (ON)</option>
                    <option value="AB">Alberta (AB)</option>
                    <option value="BC">British Columbia (BC)</option>
                  </select>
                </div>
              </div>

              {/* Interactive Mock Payslip Preview */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 font-mono text-xs text-slate-300 space-y-4">
                <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                  <div>
                    <div className="font-bold text-white uppercase tracking-wider text-sm">StubDesk Corp</div>
                    <div className="text-slate-500 text-[10px] mt-0.5">123 Bay St | Toronto, ON</div>
                  </div>
                  <div className="text-right">
                    <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                      SAMPLE PREVIEW
                    </span>
                  </div>
                </div>

                {/* Payslip details */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-left">
                    <span className="text-slate-500">Gross Earnings:</span>
                    <span className="font-bold text-white">{fmt(grossPay)}</span>
                  </div>
                  <div className="flex justify-between pl-3 text-slate-400 text-left">
                    <span>Regular Pay ({hoursWorked} hrs @ {fmt(hourlyRate)}/hr):</span>
                    <span>{fmt(grossPay)}</span>
                  </div>

                  <div className="border-t border-slate-905 my-2"></div>

                  <div className="flex justify-between text-red-400 text-left">
                    <span className="font-semibold">Statutory Deductions:</span>
                    <span>-{fmt(totalDeductions)}</span>
                  </div>
                  <div className="flex justify-between pl-3 text-slate-400 text-left">
                    <span>CPP contribution (5.95%):</span>
                    <span>-{fmt(cppDeduct)}</span>
                  </div>
                  <div className="flex justify-between pl-3 text-slate-400 text-left">
                    <span>EI premium (1.64%):</span>
                    <span>-{fmt(eiDeduct)}</span>
                  </div>
                  <div className="flex justify-between pl-3 text-slate-400 text-left">
                    <span>Estimated Income Tax:</span>
                    <span>-{fmt(taxDeduct)}</span>
                  </div>
                </div>

                {/* Dynamic Net Pay Box */}
                <div className="bg-cyan-950/30 border border-cyan-500/20 rounded-xl p-3 flex justify-between items-center text-sm">
                  <span className="font-black text-cyan-400">NET PAYOUT:</span>
                  <span className="font-black text-cyan-400 text-base">{fmt(netPay)}</span>
                </div>

                {/* CRA remittance summary note */}
                <div className="text-[10px] text-slate-500 text-center italic">
                  * Estimated CRA Remittance: {fmt(cppDeduct * 2 + eiDeduct * 2.4 + taxDeduct)} due by next month.
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Core Features Grid */}
      <section id="features" className="py-28 relative bg-slate-950/40 border-y border-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <h2 className="text-4xl md:text-5xl font-black text-white">
              Everything you need to stay <span className="text-gradient-cyan">CRA Compliant.</span>
            </h2>
            <p className="text-lg text-slate-400">
              Enterprise payroll infrastructure simplified into a beautiful, lightning-fast dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Precision Calculations',
                desc: 'Automatic CPP, CPP2 surtax, EI, and progressive income taxes dynamically matched to Ontario, Alberta, and British Columbia regulations.',
                icon: '🇨🇦',
                color: 'cyan'
              },
              {
                title: 'Beautiful Multi-Templates',
                desc: 'Instantly download, print, or email payslips with 7 elegant layouts, including black & white minimal and robust corporate formats.',
                icon: '📄',
                color: 'purple'
              },
              {
                title: 'Year-End T4 Automations',
                desc: 'Generate, edit, and approve T4 returns at year-end. Export official XML data transfer sheets ready for direct CRA upload.',
                icon: '⚡',
                color: 'cyan'
              },
              {
                title: 'Cloud Document Vault',
                desc: 'Securely archive every historical payslip, record of employment, and tax year. Access your entire payroll system anywhere, anytime.',
                icon: '☁️',
                color: 'purple'
              },
              {
                title: 'Multi-Company Support',
                desc: 'Manage payroll for multiple corporations, branches, or clients under a single centralized dashboard. Perfect for growing firms.',
                icon: '🏢',
                color: 'cyan'
              },
              {
                title: 'Secure Admin Oversight',
                desc: 'Role-based limits, advanced data sanitization, full-fledged tax bracket customization panels, and secure session logs.',
                icon: '🔒',
                color: 'purple'
              }
            ].map((f, i) => (
              <div 
                key={i} 
                className={`card-glass ${f.color === 'purple' ? 'card-glass-purple' : ''} text-left p-10 space-y-4`}
              >
                <div className="text-4xl inline-block bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold text-white">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dynamic Pricing Cards Section */}
      <section id="pricing" className="py-28 relative">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-12">
          
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-4xl md:text-5xl font-black text-white">
              Sleek pricing. <span className="text-gradient-purple">No hidden fees.</span>
            </h2>
            <p className="text-lg text-slate-400">
              Pick the tier that fits your company size. Switch or cancel anytime.
            </p>
            
            {/* Toggle Billing Pill */}
            <div className="pt-4">
              <div className="toggle-container">
                <button 
                  className={`toggle-btn ${billingCycle === 'monthly' ? 'active-purple' : ''}`}
                  onClick={() => setBillingCycle('monthly')}
                >
                  Monthly
                </button>
                <button 
                  className={`toggle-btn ${billingCycle === 'yearly' ? 'active-purple' : ''}`}
                  onClick={() => setBillingCycle('yearly')}
                >
                  Yearly (Save 20%)
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto pt-6 text-left">
            
            {/* Free Plan */}
            <div className="card-glass flex flex-col justify-between p-8">
              <div className="space-y-6">
                <div>
                  <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">Free Tier</span>
                  <h3 className="text-2xl font-bold text-white mt-1">Hobbyist</h3>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">$0</span>
                  <span className="text-slate-500 text-sm">/month</span>
                </div>
                <p className="text-slate-400 text-sm">Perfect for generating occasional single payslips without cloud storage.</p>
                <div className="border-t border-slate-800/80 my-4"></div>
                <ul className="space-y-3 text-sm text-slate-300">
                  <li className="flex items-center gap-2">✓ 1 Active Company</li>
                  <li className="flex items-center gap-2">✓ Up to 2 Employees</li>
                  <li className="flex items-center gap-2">✓ Dynamic 2026 Tax Engine</li>
                  <li className="flex items-center gap-2 text-slate-600">✗ No Cloud Storage/Vault</li>
                  <li className="flex items-center gap-2 text-slate-600">✗ No Year-End T4 Slips</li>
                </ul>
              </div>
              <Link to="/signup" className="inline-flex items-center justify-center border-1.5 border-white/10 hover:border-cyan-500 text-white hover:text-cyan-400 bg-transparent rounded-xl py-3.5 mt-8 font-semibold text-center text-sm transition-all hover:bg-cyan-500/5 cursor-pointer">
                Get Started
              </Link>
            </div>

            {/* Starter Plan - Highlighted */}
            <div className="card-glass border-cyan-500/30 shadow-cyan-950/20 relative flex flex-col justify-between p-8 transform scale-105 z-20">
              <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-cyan-400 to-cyan-600 text-slate-950 font-black text-[10px] tracking-widest px-4 py-1 rounded-full uppercase shadow">
                MOST POPULAR
              </div>
              <div className="space-y-6 pt-2">
                <div>
                  <span className="text-xs uppercase tracking-widest text-cyan-400 font-bold">Standard Tier</span>
                  <h3 className="text-2xl font-bold text-white mt-1">Starter</h3>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">
                    {billingCycle === 'yearly' ? '$16' : '$20'}
                  </span>
                  <span className="text-slate-500 text-sm">/month</span>
                </div>
                <p className="text-slate-400 text-sm">Best for growing small businesses needing dynamic cloud storage and T4 slips.</p>
                <div className="border-t border-slate-800/80 my-4"></div>
                <ul className="space-y-3 text-sm text-slate-300">
                  <li className="flex items-center gap-2">✓ Up to 3 Companies</li>
                  <li className="flex items-center gap-2">✓ Up to 15 Employees</li>
                  <li className="flex items-center gap-2">✓ Secure Cloud Storage</li>
                  <li className="flex items-center gap-2">✓ Auto-aggregate T4 Slips</li>
                  <li className="flex items-center gap-2 text-slate-600">✗ No CRA XML File Transfers</li>
                </ul>
              </div>
              <Link to="/signup" className="inline-flex items-center justify-center bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold rounded-xl py-3.5 mt-8 text-center text-sm transition-all shadow-lg hover:shadow-cyan-400/30 hover:scale-[1.02] cursor-pointer">
                Start Starter Trial
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="card-glass flex flex-col justify-between p-8">
              <div className="space-y-6">
                <div>
                  <span className="text-xs uppercase tracking-widest text-purple-400 font-bold">Unlimited Tier</span>
                  <h3 className="text-2xl font-bold text-white mt-1">Business Pro</h3>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">
                    {billingCycle === 'yearly' ? '$40' : '$50'}
                  </span>
                  <span className="text-slate-500 text-sm">/month</span>
                </div>
                <p className="text-slate-400 text-sm">Perfect for accounting offices, remote bookkeeping, and multiple corporations.</p>
                <div className="border-t border-slate-800/80 my-4"></div>
                <ul className="space-y-3 text-sm text-slate-300">
                  <li className="flex items-center gap-2">✓ Unlimited Companies</li>
                  <li className="flex items-center gap-2">✓ Unlimited Employees</li>
                  <li className="flex items-center gap-2">✓ Full XML CRA File Export</li>
                  <li className="flex items-center gap-2">✓ Multi-Template Branding</li>
                  <li className="flex items-center gap-2">✓ Priority Dedicated Support</li>
                </ul>
              </div>
              <Link to="/signup" className="inline-flex items-center justify-center bg-gradient-to-r from-purple-400 to-indigo-500 text-white font-bold rounded-xl py-3.5 mt-8 text-center text-sm transition-all shadow-lg hover:shadow-purple-400/30 hover:scale-[1.02] cursor-pointer">
                Go Pro Unlimited
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* Accordion FAQ Section */}
      <section id="faq" className="py-28 relative bg-slate-950/20 border-t border-slate-900">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl font-black text-white">
              Got <span className="text-gradient-cyan">questions?</span> We've got answers.
            </h2>
            <p className="text-slate-400">Everything you need to know about the StubDesk platform.</p>
          </div>

          <div className="card-glass divide-y divide-slate-800/60 p-6 sm:p-10 text-left">
            {faqs.map((faq, index) => (
              <div key={index} className="faq-item">
                <button 
                  className="faq-trigger"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <span>{faq.q}</span>
                  <span className={`faq-icon font-mono text-xl ${openFaq === index ? 'open' : ''}`}>
                    {openFaq === index ? '−' : '+'}
                  </span>
                </button>
                <div className={`faq-content ${openFaq === index ? 'open' : ''}`}>
                  <p className="leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Futuristic CTA Section */}
      <section className="py-28 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 space-y-8 relative z-10">
          <h2 className="text-4xl sm:text-6xl font-black text-white leading-tight">
            Ready to completely <br />
            simplify your <span className="text-gradient-cyan">payroll?</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
            Join hundreds of Canadian business owners who save hours every month. Start generating precise payslips instantly.
          </p>
          <div className="pt-2">
            <Link to="/signup" className="inline-flex items-center justify-center bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black text-lg px-12 py-5 rounded-2xl transition-all shadow-lg hover:shadow-cyan-400/40 hover:scale-[1.02] cursor-pointer badge-glowing">
              Start Your 14-Day Free Trial
            </Link>
          </div>
          <p className="text-xs text-slate-500 font-medium">No credit card required · Instant access</p>
        </div>
      </section>

      {/* Dark Luxury Footer */}
      <footer className="py-16 bg-slate-950/80 border-t border-slate-900/60 text-slate-500 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
              <span className="text-slate-950 font-black text-sm">S</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Stub<span className="text-cyan-400">Desk</span>
            </span>
          </div>
          
          <div className="flex gap-8 text-sm font-semibold">
            <Link to="/privacy-policy" className="hover:text-cyan-400 transition-colors">Privacy Policy</Link>
            <Link to="/terms-of-service" className="hover:text-cyan-400 transition-colors">Terms of Service</Link>
            <Link to="/contact-support" className="hover:text-cyan-400 transition-colors">Contact Support</Link>
          </div>
          
          <p className="text-sm">
            © {new Date().getFullYear()} StubDesk. Built with precision for Canadian businesses. 🇨🇦
          </p>
        </div>
      </footer>
    </div>
  )
}
