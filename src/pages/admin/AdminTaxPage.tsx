import { useEffect, useState } from 'react'
import { useTaxStore, type DBTaxRow } from '@/store/taxStore'
import { Card, CardTitle } from '@/components/ui/Card'
import { CURRENT_TAX_YEAR, TAX_YEAR_OPTIONS } from '@/lib/taxYear'

const YEARS = TAX_YEAR_OPTIONS

interface BracketRow { min: number; max: number | null; rate: number }

export default function AdminTaxPage() {
  const { constants, taxYear, lastUpdated, fetchConstants, updateConstants } = useTaxStore()
  const [year,    setYear]    = useState(CURRENT_TAX_YEAR)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // Local editable state — mirrors DB row fields
  const [cpp1Rate,           setCpp1Rate]           = useState(0)
  const [cpp1Exemption,      setCpp1Exemption]      = useState(0)
  const [cpp1MaxPensionable, setCpp1MaxPensionable] = useState(0)
  const [cpp1MaxEmployee,    setCpp1MaxEmployee]    = useState(0)
  const [cpp2Rate,           setCpp2Rate]           = useState(0)
  const [cpp2Ceiling,        setCpp2Ceiling]        = useState(0)
  const [cpp2MaxEmployee,    setCpp2MaxEmployee]    = useState(0)
  const [eiRate,             setEiRate]             = useState(0)
  const [eiMult,             setEiMult]             = useState(0)
  const [eiMaxInsurable,     setEiMaxInsurable]     = useState(0)
  const [eiMaxEmployee,      setEiMaxEmployee]      = useState(0)
  const [fedBPA,             setFedBPA]             = useState(0)
  const [fedCreditRate,      setFedCreditRate]      = useState(0)
  const [fedBrackets,        setFedBrackets]        = useState<BracketRow[]>([])
  const [onBPA,              setOnBPA]              = useState(0)
  const [onCreditRate,       setOnCreditRate]       = useState(0)
  const [onSurtax1,          setOnSurtax1]          = useState(0)
  const [onSurtax1Rate,      setOnSurtax1Rate]      = useState(0)
  const [onSurtax2,          setOnSurtax2]          = useState(0)
  const [onSurtax2Rate,      setOnSurtax2Rate]      = useState(0)
  const [onBrackets,         setOnBrackets]         = useState<BracketRow[]>([])
  const [abBPA,              setAbBPA]              = useState(0)
  const [abCreditRate,       setAbCreditRate]       = useState(0)
  const [abBrackets,         setAbBrackets]         = useState<BracketRow[]>([])
  const [bcBPA,              setBcBPA]              = useState(0)
  const [bcCreditRate,       setBcCreditRate]       = useState(0)
  const [bcBrackets,         setBcBrackets]         = useState<BracketRow[]>([])

  useEffect(() => { fetchConstants(year) }, [year, fetchConstants])

  // Sync local state from store whenever constants change
  useEffect(() => {
    const c = constants
    setCpp1Rate(c.CPP1_RATE)
    setCpp1Exemption(c.CPP1_BASIC_EXEMPTION)
    setCpp1MaxPensionable(c.CPP1_MAX_PENSIONABLE)
    setCpp1MaxEmployee(c.CPP1_MAX_EMPLOYEE)
    setCpp2Rate(c.CPP2_RATE)
    setCpp2Ceiling(c.CPP2_CEILING)
    setCpp2MaxEmployee(c.CPP2_MAX_EMPLOYEE)
    setEiRate(c.EI_EMPLOYEE_RATE)
    setEiMult(c.EI_EMPLOYER_MULT)
    setEiMaxInsurable(c.EI_MAX_INSURABLE)
    setEiMaxEmployee(c.EI_MAX_EMPLOYEE)
    setFedBPA(c.FED_BASIC_PERSONAL)
    setFedCreditRate(c.FED_CREDIT_RATE)
    setFedBrackets(c.FED_BRACKETS.map(b => ({ min: b.min, max: b.max === Infinity ? null : b.max, rate: b.rate })))
    setOnBPA(c.ON_BASIC_PERSONAL)
    setOnCreditRate(c.ON_CREDIT_RATE)
    setOnSurtax1(c.ON_SURTAX1_THRESHOLD)
    setOnSurtax1Rate(c.ON_SURTAX1_RATE)
    setOnSurtax2(c.ON_SURTAX2_THRESHOLD)
    setOnSurtax2Rate(c.ON_SURTAX2_RATE)
    setOnBrackets(c.ON_BRACKETS.map(b => ({ min: b.min, max: b.max === Infinity ? null : b.max, rate: b.rate })))
    setAbBPA(c.AB_BASIC_PERSONAL)
    setAbCreditRate(c.AB_CREDIT_RATE)
    setAbBrackets(c.AB_BRACKETS.map(b => ({ min: b.min, max: b.max === Infinity ? null : b.max, rate: b.rate })))
    setBcBPA(c.BC_BASIC_PERSONAL)
    setBcCreditRate(c.BC_CREDIT_RATE)
    setBcBrackets(c.BC_BRACKETS.map(b => ({ min: b.min, max: b.max === Infinity ? null : b.max, rate: b.rate })))
  }, [constants])

  async function handleSave() {
    setSaving(true); setError(null); setSaved(false)
    const updates: Partial<DBTaxRow> = {
      cpp1_rate: cpp1Rate, cpp1_basic_exemption: cpp1Exemption,
      cpp1_max_pensionable: cpp1MaxPensionable, cpp1_max_employee: cpp1MaxEmployee,
      cpp2_rate: cpp2Rate, cpp2_ceiling: cpp2Ceiling, cpp2_max_employee: cpp2MaxEmployee,
      ei_employee_rate: eiRate, ei_employer_mult: eiMult,
      ei_max_insurable: eiMaxInsurable, ei_max_employee: eiMaxEmployee,
      fed_basic_personal: fedBPA, fed_credit_rate: fedCreditRate,
      fed_brackets: fedBrackets,
      on_basic_personal: onBPA, on_credit_rate: onCreditRate,
      on_surtax1_threshold: onSurtax1, on_surtax1_rate: onSurtax1Rate,
      on_surtax2_threshold: onSurtax2, on_surtax2_rate: onSurtax2Rate,
      on_brackets: onBrackets,
      ab_basic_personal: abBPA, ab_credit_rate: abCreditRate, ab_brackets: abBrackets,
      bc_basic_personal: bcBPA, bc_credit_rate: bcCreditRate, bc_brackets: bcBrackets,
    }
    const { error: err } = await updateConstants(year, updates)
    setSaving(false)
    if (err) setError(err)
    else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
  }

  // ── Bracket editor ────────────────────────────────────────────────────────
  function BracketEditor({
    brackets, onChange, label
  }: { brackets: BracketRow[]; onChange: (b: BracketRow[]) => void; label: string }) {
    return (
      <div>
        <div className="text-xs font-semibold text-gray-500 mb-2">{label}</div>
        <div className="space-y-1.5">
          {brackets.map((b, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 items-center">
              <div>
                <label className="text-xs text-gray-400">Min ($)</label>
                <input type="number" className="input text-xs py-1" value={b.min}
                  onChange={e => { const n=[...brackets]; n[i]={...n[i],min:+e.target.value}; onChange(n) }} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Max ($) — blank = unlimited</label>
                <input type="number" className="input text-xs py-1" value={b.max ?? ''}
                  placeholder="unlimited"
                  onChange={e => { const n=[...brackets]; n[i]={...n[i],max:e.target.value===''?null:+e.target.value}; onChange(n) }} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Rate (decimal)</label>
                <input type="number" className="input text-xs py-1" step="0.0001" value={b.rate}
                  onChange={e => { const n=[...brackets]; n[i]={...n[i],rate:+e.target.value}; onChange(n) }} />
              </div>
              <div className="flex items-end gap-1 pb-0.5">
                <span className="text-xs text-gray-400">{(b.rate*100).toFixed(2)}%</span>
                {brackets.length > 1 && (
                  <button className="text-red-400 hover:text-red-600 text-xs ml-auto"
                    onClick={() => onChange(brackets.filter((_,j)=>j!==i))}>✕</button>
                )}
              </div>
            </div>
          ))}
          <button className="text-brand-600 text-xs font-semibold hover:underline"
            onClick={() => onChange([...brackets, { min: 0, max: null, rate: 0 }])}>
            + Add bracket
          </button>
        </div>
      </div>
    )
  }

  function NumField({ label, value, onChange, hint, pct = false }: {
    label: string; value: number; onChange: (v: number) => void; hint?: string; pct?: boolean
  }) {
    return (
      <div>
        <label className="label text-xs">{label}</label>
        <div className="flex items-center gap-2">
          <input type="number" className="input text-sm" step={pct ? '0.0001' : '0.01'}
            value={value} onChange={e => onChange(parseFloat(e.target.value)||0)} />
          {pct && <span className="text-xs text-gray-400 shrink-0">{(value*100).toFixed(4)}%</span>}
        </div>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tax Constants</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Update CRA rates each year. Changes take effect immediately for all new payslip calculations.
          </p>
          {lastUpdated && taxYear === year && (
            <p className="text-xs text-green-600 mt-1">
              Last updated: {new Date(lastUpdated).toLocaleString('en-CA')}
            </p>
          )}
        </div>
        <div className="flex gap-3 items-center">
          <select className="input w-28 text-sm" value={year} onChange={e => setYear(+e.target.value)}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : '💾 Save All Changes'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-3 text-xs text-yellow-800">
        <strong>Sources:</strong> Update these values each November/December from CRA's published rates.
        CPP/CPP2: <a href="https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/canada-pension-plan-cpp/cpp-contribution-rates-maximums-exemptions.html" target="_blank" rel="noopener noreferrer" className="underline">CRA CPP page</a> ·
        EI: <a href="https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/employment-insurance-ei/ei-premium-rates-maximums.html" target="_blank" rel="noopener noreferrer" className="underline">CRA EI page</a> ·
        Income tax: <a href="https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan.html" target="_blank" rel="noopener noreferrer" className="underline">T4127 Formulas</a>
      </div>

      {/* CPP */}
      <Card>
        <CardTitle>CPP — Canada Pension Plan</CardTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <NumField label="CPP1 Rate" value={cpp1Rate} onChange={setCpp1Rate} pct hint="e.g. 0.0595 = 5.95%" />
          <NumField label="Basic Exemption ($)" value={cpp1Exemption} onChange={setCpp1Exemption} hint="Annual, e.g. 3500" />
          <NumField label="YMPE — Max Pensionable ($)" value={cpp1MaxPensionable} onChange={setCpp1MaxPensionable} />
          <NumField label="Max Employee CPP1 ($)" value={cpp1MaxEmployee} onChange={setCpp1MaxEmployee} hint="(YMPE - exemption) × rate" />
          <NumField label="CPP2 Rate" value={cpp2Rate} onChange={setCpp2Rate} pct hint="e.g. 0.0400 = 4%" />
          <NumField label="YAMPE — CPP2 Ceiling ($)" value={cpp2Ceiling} onChange={setCpp2Ceiling} />
          <NumField label="Max Employee CPP2 ($)" value={cpp2MaxEmployee} onChange={setCpp2MaxEmployee} hint="(YAMPE - YMPE) × CPP2 rate" />
        </div>
      </Card>

      {/* EI */}
      <Card>
        <CardTitle>EI — Employment Insurance</CardTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <NumField label="Employee Rate" value={eiRate} onChange={setEiRate} pct hint="e.g. 0.0163 = 1.63%" />
          <NumField label="Employer Multiplier" value={eiMult} onChange={setEiMult} hint="Standard = 1.4" />
          <NumField label="Max Insurable Earnings ($)" value={eiMaxInsurable} onChange={setEiMaxInsurable} />
          <NumField label="Max Employee Premium ($)" value={eiMaxEmployee} onChange={setEiMaxEmployee} hint="Max insurable × rate" />
        </div>
      </Card>

      {/* Federal */}
      <Card>
        <CardTitle>Federal Income Tax</CardTitle>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <NumField label="Basic Personal Amount ($)" value={fedBPA} onChange={setFedBPA} />
          <NumField label="Credit Rate (lowest bracket rate)" value={fedCreditRate} onChange={setFedCreditRate} pct hint={`e.g. 0.14 = 14% for ${CURRENT_TAX_YEAR}`} />
        </div>
        <BracketEditor brackets={fedBrackets} onChange={setFedBrackets} label="Federal Tax Brackets" />
      </Card>

      {/* Ontario */}
      <Card>
        <CardTitle>Ontario Provincial Tax</CardTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
          <NumField label="Basic Personal Amount ($)" value={onBPA} onChange={setOnBPA} />
          <NumField label="Credit Rate" value={onCreditRate} onChange={setOnCreditRate} pct />
          <NumField label="Surtax 1 Threshold ($)" value={onSurtax1} onChange={setOnSurtax1} />
          <NumField label="Surtax 1 Rate" value={onSurtax1Rate} onChange={setOnSurtax1Rate} pct />
          <NumField label="Surtax 2 Threshold ($)" value={onSurtax2} onChange={setOnSurtax2} />
          <NumField label="Surtax 2 Rate" value={onSurtax2Rate} onChange={setOnSurtax2Rate} pct />
        </div>
        <BracketEditor brackets={onBrackets} onChange={setOnBrackets} label="Ontario Tax Brackets" />
      </Card>

      {/* Alberta */}
      <Card>
        <CardTitle>Alberta Provincial Tax</CardTitle>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <NumField label="Basic Personal Amount ($)" value={abBPA} onChange={setAbBPA} />
          <NumField label="Credit Rate" value={abCreditRate} onChange={setAbCreditRate} pct />
        </div>
        <BracketEditor brackets={abBrackets} onChange={setAbBrackets} label="Alberta Tax Brackets" />
      </Card>

      {/* BC */}
      <Card>
        <CardTitle>British Columbia Provincial Tax</CardTitle>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <NumField label="Basic Personal Amount ($)" value={bcBPA} onChange={setBcBPA} />
          <NumField label="Credit Rate" value={bcCreditRate} onChange={setBcCreditRate} pct />
        </div>
        <BracketEditor brackets={bcBrackets} onChange={setBcBrackets} label="BC Tax Brackets" />
      </Card>

      <div className="flex gap-3">
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : saved ? '✓ Saved' : '💾 Save All Changes'}
        </button>
      </div>
    </div>
  )
}
