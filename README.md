# PayCub SaaS — Canadian Payroll Software

React + Supabase + Stripe subscription SaaS. CRA-compliant payroll for ON/AB/BC.

## Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Frontend    | React 18 + Vite + TypeScript      |
| Styling     | Tailwind CSS                      |
| Auth + DB   | Supabase (Postgres + RLS)         |
| Payments    | Stripe (subscriptions + webhooks) |
| PDF         | jsPDF                             |
| State       | Zustand                           |
| Hosting     | Vercel (recommended)              |

---

## Local Development Setup

### 1. Clone and install

```bash
cd paycub-saas
npm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase/migrations/001_initial_schema.sql`
3. Copy your project URL and anon key from **Settings → API**

### 3. Set up Stripe

1. Create an account at [stripe.com](https://stripe.com)
2. Create two recurring products in the Stripe dashboard:
   - **Starter** — $19 CAD/month
   - **Pro** — $49 CAD/month
3. Copy the **Price IDs** for each product
4. Add a webhook endpoint pointing to your Supabase Edge Function URL (see step 6)

### 4. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_STARTER_PRICE_ID=price_...
VITE_STRIPE_PRO_PRICE_ID=price_...

VITE_APP_URL=http://localhost:5173
```

### 5. Start the dev server

```bash
npm run dev
```

### 6. Deploy Supabase Edge Functions

Install the Supabase CLI, then:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Set secrets (these are server-side only, never in .env)
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_STARTER_PRICE_ID=price_...
supabase secrets set STRIPE_PRO_PRICE_ID=price_...

# Deploy all three functions
supabase functions deploy create-checkout
supabase functions deploy customer-portal
supabase functions deploy stripe-webhook
```

### 7. Configure Stripe webhook

In the Stripe dashboard → **Developers → Webhooks → Add endpoint**:

- URL: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
- Events to listen for:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

Copy the **Signing secret** and set it as `STRIPE_WEBHOOK_SECRET` above.

---

## Deployment to Vercel

```bash
npm install -g vercel
vercel
```

Set the same environment variables in the Vercel dashboard under **Settings → Environment Variables**.

---

## Project Structure

```
src/
├── components/
│   ├── auth/          # AuthGuard, PlanGuard
│   ├── layout/        # AppLayout, Sidebar, TopBar
│   └── ui/            # Input, Select, Modal, Card
├── lib/
│   ├── supabase.ts    # Supabase client
│   ├── payrollEngine.ts  # CRA calculation engine
│   └── taxConstants.ts   # 2026 tax rates
├── pages/
│   ├── auth/          # Login, Signup
│   ├── billing/       # Plans + Stripe checkout
│   ├── companies/     # Company CRUD
│   ├── dashboard/     # Home dashboard
│   ├── employees/     # Employee CRUD
│   ├── payslip/       # 4-step payslip builder
│   ├── payslips/      # Payslip history
│   └── settings/      # Profile + password
├── store/
│   ├── authStore.ts   # Auth state (Zustand)
│   └── companyStore.ts # Companies + employees state
└── types/
    ├── database.ts    # Supabase table types
    └── payroll.ts     # Payroll calculation types

supabase/
├── migrations/
│   └── 001_initial_schema.sql   # Full DB schema + RLS
└── functions/
    ├── create-checkout/   # Stripe Checkout session
    ├── customer-portal/   # Stripe billing portal
    └── stripe-webhook/    # Subscription lifecycle events
```

---

## Subscription Plans

| Feature                | Free | Starter ($19/mo) | Pro ($49/mo) |
|------------------------|------|------------------|--------------|
| Companies              | 1    | 1                | Unlimited    |
| Employees              | 3    | 10               | Unlimited    |
| Payslips               | 5    | Unlimited        | Unlimited    |
| PDF templates          | 1    | 5                | 5            |
| Remittance reports     | ✗    | ✗                | ✓            |
| Priority support       | ✗    | ✗                | ✓            |

Adjust limits in `PlanGuard.tsx` and the billing page as needed.

---

## Adding More Provinces

1. Add the province to the `province` check constraint in the migration
2. Add tax brackets to `src/lib/taxConstants.ts`
3. Update `calcProvincialTax` in `src/lib/payrollEngine.ts`
4. Add the option to province dropdowns in the UI

---

## Security Notes

- All database tables use **Row Level Security** — users can only access their own data
- Stripe secret keys are stored only in Supabase Edge Function secrets, never in the frontend
- The Stripe webhook verifies the signature on every request
- Supabase Auth handles JWT validation; the service role key is only used server-side
