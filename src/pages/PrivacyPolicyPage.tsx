import { Link } from 'react-router-dom'

export default function PrivacyPolicyPage() {
  return (
    <main className="landing-dark-body min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-16 sm:py-24">
        <Link to="/" className="text-sm font-semibold text-cyan-400 hover:text-cyan-300">
          Back to StubDesk
        </Link>

        <section className="card-glass mt-8 p-6 sm:p-10 space-y-8">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">Privacy Policy</p>
            <h1 className="text-4xl sm:text-5xl font-black text-white">How StubDesk protects your data</h1>
            <p className="text-sm text-slate-500">Effective date: July 5, 2026</p>
          </div>

          <div className="space-y-6 text-sm leading-7 text-slate-300">
            <p>
              StubDesk provides Canadian payroll software for small businesses. This policy explains what information
              we collect, how we use it, and the choices you have when using the service.
            </p>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-white">Information We Collect</h2>
              <p>
                We collect account details such as name, email address, company profile information, employee payroll
                details, payslip records, year-end form data, billing identifiers, and support messages you send us.
              </p>
              <p>
                Payment card details are processed by Stripe. StubDesk does not store full payment card numbers.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-white">How We Use Information</h2>
              <p>
                We use your information to operate payroll workflows, calculate deductions, generate documents, manage
                subscriptions, provide support, improve reliability, and protect the service from misuse.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-white">Storage and Security</h2>
              <p>
                Payroll data is stored using cloud infrastructure and access controls designed to limit data to the
                authenticated account owner and authorized system processes. No online service can guarantee absolute
                security, but we work to apply reasonable safeguards for sensitive payroll information.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-white">Sharing</h2>
              <p>
                We share information only with service providers needed to run StubDesk, such as hosting, database,
                authentication, billing, and support providers. We may also disclose information when required by law
                or to protect StubDesk, customers, or the public.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-white">Your Choices</h2>
              <p>
                You can update account information in the app, request help correcting data, or ask about deletion and
                export options by contacting support. Some records may need to be retained for legal, tax, security, or
                audit reasons.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-white">Contact</h2>
              <p>
                Questions about privacy can be sent through the contact support page.
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
