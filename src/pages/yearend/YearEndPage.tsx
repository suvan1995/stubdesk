import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useCompanyStore } from '@/store/companyStore'
import { useLimitsStore } from '@/store/limitsStore'
import clsx from 'clsx'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i)

interface FormCard {
  id:          string
  title:       string
  subtitle:    string
  description: string
  icon:        string
  color:       string
  bgColor:     string
  route:       string
  newRoute:    string
  who:         string
  requiresT4:  boolean
}

const FORM_CARDS: FormCard[] = [
  {
    id:          't4',
    title:       'T4',
    subtitle:    'Statement of Remuneration Paid',
    description: 'For employees who received employment income, CPP, and EI deductions.',
    icon:        '👔',
    color:       'text-brand-700',
    bgColor:     'bg-brand-50 border-brand-200',
    route:       '/yearend/t4',
    newRoute:    '/yearend/t4/new',
    who:         'Employees (T4 employment)',
    requiresT4:  true,
  },
  {
    id:          't4a',
    title:       'T4A',
    subtitle:    'Statement of Pension, Retirement, Annuity & Other Income',
    description: 'For self-employed contractors, freelancers, pension recipients, and fees for services.',
    icon:        '🧾',
    color:       'text-purple-700',
    bgColor:     'bg-purple-50 border-purple-200',
    route:       '/yearend/t4a',
    newRoute:    '/yearend/t4a/new',
    who:         'Self-employed / contractors / pension',
    requiresT4:  true,
  },
  {
    id:          't5',
    title:       'T5',
    subtitle:    'Statement of Investment Income',
    description: 'For dividends, interest, and other investment income paid to shareholders or investors.',
    icon:        '📈',
    color:       'text-green-700',
    bgColor:     'bg-green-50 border-green-200',
    route:       '/yearend/t5',
    newRoute:    '/yearend/t5/new',
    who:         'Shareholders / investors',
    requiresT4:  true,
  },
]

export default function YearEndPage() {
  const navigate = useNavigate()
  const { companies, fetchCompanies } = useCompanyStore()
  const { limits } = useLimitsStore()
  const [taxYear, setTaxYear] = useState(CURRENT_YEAR - 1)
  const [counts,  setCounts]  = useState<Record<string, number>>({ t4: 0, t4a: 0, t5: 0 })
  const [filterCo, setFilterCo] = useState('')

  useEffect(() => { fetchCompanies() }, [fetchCompanies])
  useEffect(() => { loadCounts() }, [taxYear, filterCo])

  async function loadCounts() {
    const tables = ['t4_slips', 't4a_slips', 't5_slips']
    const keys   = ['t4', 't4a', 't5']
    const results = await Promise.all(tables.map(t => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase.from(t) as any)
        .select('id', { count: 'exact', head: true })
        .eq('tax_year', taxYear)
      if (filterCo) q = q.eq('company_id', filterCo)
      return q
    }))
    const newCounts: Record<string, number> = {}
    keys.forEach((k, i) => { newCounts[k] = results[i].count ?? 0 })
    setCounts(newCounts)
  }

  const canT4 = limits?.can_generate_t4 ?? false

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Year-End Forms</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Generate CRA year-end slips for employees, contractors, and investors
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <select className="input w-48 text-sm" value={filterCo}
            onChange={e => setFilterCo(e.target.value)}>
            <option value="">All companies</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="input w-28 text-sm" value={taxYear}
            onChange={e => setTaxYear(+e.target.value)}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Plan gate */}
      {!canT4 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
          <p className="text-sm text-yellow-800">
            Year-end form generation is available on <strong>Starter</strong> and <strong>Pro</strong> plans.
          </p>
          <button className="btn-primary text-sm shrink-0" onClick={() => navigate('/billing')}>
            Upgrade Plan
          </button>
        </div>
      )}

      {/* CRA deadline note */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 text-sm text-blue-800">
        <strong>Filing deadline:</strong> T4, T4A, and T5 slips must be filed with the CRA and distributed to recipients by the <strong>last day of February</strong> following the tax year.
      </div>

      {/* Form cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {FORM_CARDS.map(card => (
          <div
            key={card.id}
            className={clsx(
              'rounded-xl border-2 p-5 flex flex-col transition-shadow',
              canT4 ? 'hover:shadow-md cursor-pointer' : 'opacity-60 cursor-not-allowed',
              card.bgColor
            )}
            onClick={() => canT4 && navigate(card.route)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="text-3xl">{card.icon}</div>
              <span className={clsx(
                'text-xs font-bold px-2 py-0.5 rounded-full',
                counts[card.id] > 0 ? 'bg-white/80 text-gray-700' : 'bg-white/50 text-gray-400'
              )}>
                {counts[card.id]} slip{counts[card.id] !== 1 ? 's' : ''}
              </span>
            </div>
            <div className={clsx('text-xl font-extrabold mb-0.5', card.color)}>{card.title}</div>
            <div className="text-xs font-semibold text-gray-600 mb-2">{card.subtitle}</div>
            <p className="text-xs text-gray-500 leading-relaxed flex-1">{card.description}</p>
            <div className="mt-3 pt-3 border-t border-white/60 flex items-center justify-between">
              <span className="text-xs text-gray-400">{card.who}</span>
              {canT4 && (
                <button
                  className={clsx('text-xs font-semibold hover:underline', card.color)}
                  onClick={e => { e.stopPropagation(); navigate(card.newRoute) }}
                >
                  + New
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quick guide */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-700 mb-3 text-sm">Which form do I use?</h3>
        <div className="space-y-2.5">
          {[
            { form: 'T4',  desc: 'Regular employees — salary, wages, CPP, EI deducted at source' },
            { form: 'T4A', desc: 'Self-employed contractors, freelancers, consultants, fees for services (Box 048), pension, RRSP income, retiring allowances' },
            { form: 'T5',  desc: 'Dividends paid to shareholders, interest income, investment income' },
          ].map(r => (
            <div key={r.form} className="flex items-start gap-3 text-sm">
              <span className="font-bold text-brand-700 w-8 shrink-0">{r.form}</span>
              <span className="text-gray-500">{r.desc}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Note: A person can receive both a T4 (for employment income) and a T4A (for self-employment or other income) in the same year.
        </p>
      </div>
    </div>
  )
}
