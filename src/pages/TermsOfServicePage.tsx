import { Link } from 'react-router-dom'

export default function TermsOfServicePage() {
  return (
    <main className="landing-dark-body min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-16 sm:py-24">
        <Link to="/" className="text-sm font-semibold text-cyan-400 hover:text-cyan-300">
          Back to StubDesk
        </Link>

        <section className="card-glass mt-8 p-6 sm:p-10 space-y-8">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">Terms of Service</p>
            <h1 className="text-4xl sm:text-5xl font-black text-white">Rules for using StubDesk</h1>
            <p className="text-sm text-slate-500">Effective date: July 5, 2026</p>
          </div>

          <div className="space-y-6 text-sm leading-7 text-slate-300">
            <p>
              These terms govern your use of StubDesk. By creating an account or using the service, you agree to these
              terms.
            </p>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-white">Use of the Service</h2>
              <p>
                StubDesk is designed to help Canadian businesses calculate payroll, generate payslips, and prepare
                related records. You are responsible for reviewing outputs, keeping your data accurate, and confirming
                compliance with your own tax, employment, and accounting obligations.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-white">Accounts</h2>
              <p>
                You must keep login credentials secure and notify us if you believe your account has been compromised.
                You are responsible for activity that occurs under your account.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-white">Subscriptions and Billing</h2>
              <p>
                Paid plans are billed through Stripe. Subscription terms, trial periods, renewals, cancellations, and
                invoices are managed through the billing tools available in the app or through Stripe-hosted pages.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-white">Acceptable Use</h2>
              <p>
                You may not misuse StubDesk, attempt unauthorized access, interfere with service operations, upload
                unlawful content, or use the service to harm another person or organization.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-white">No Professional Advice</h2>
              <p>
                StubDesk provides software tools and calculations, not legal, tax, accounting, or employment advice.
                Consult a qualified professional when you need advice for your specific situation.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-white">Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, StubDesk is provided as-is and we are not liable for indirect,
                incidental, special, consequential, or punitive damages arising from your use of the service.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-white">Contact</h2>
              <p>
                Questions about these terms can be sent through the contact support page.
              </p>
              <Link to="/contact-support" className="inline-flex text-cyan-400 hover:text-cyan-300 font-semibold">
                Contact support
              </Link>
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}
