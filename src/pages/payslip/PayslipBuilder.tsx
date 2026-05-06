import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompanyStore } from '@/store/companyStore'
import { useAuthStore } from '@/store/authStore'
import { calculatePayslip, fmtCAD } from '@/lib/payrollEngine'
import { generatePayslipPDF, buildStoragePath } from '@/lib/pdfGenerator'
import { calcPayDate, calcPeriodDates, fmtDisplay, detectCurrentPeriod } from '@/lib/dateUtils'
import { supabase } from '@/lib/supabase'
import type { PayslipInputs, PayslipResult } from '@/types/payroll'
import type { Company, Employee } from '@/types/database'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import { Card, CardTitle } from '@/components/ui/Card'
import clsx from 'clsx'

// Step labels
const STEPS = ['Company & Employee', 'Pay Details', 'Deductions & Extras', 'Preview & Download']

const FREQ_OPTIONS  = [
  { value: 52, label: 'Weekly (52/year)' },
  { value: 26, label: 'Bi-Weekly (26/year)' },
  { value: 24, label: 'Semi-Monthly (24/year)' },
  { value: 12, label: 'Monthly (12/year)' },
]
const TEMPLATE_NAMES  = ['Classic Blue', 'Modern Dark', 'Forest Green', 'Slate Minimal', 'Warm Burgundy', 'QuickBooks Classic', 'Dayforce Corporate']
const TEMPLATE_COLORS = ['#1a5276', '#16213e', '#1b5e20', '#37474f', '#6a1b4d', '#2b8254', '#0f2850']

export default function PayslipBuilder() {
  const navigate = useNavigate()
  const { companies, employees, fetchCompanies, fetchEmployees } = useCompanyStore()
  const { profile } = useAuthStore()

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<PayslipResult | null>(null)
  const [anchorWarning, setAnchorWarning] = useState(false)

  // Step 1 — Company & Employee
  const [selectedCompany,  setSelectedCompany]  = useState<Company | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

  // Step 2 — Pay Details
  const [periodStart,  setPeriodStart]  = useState('')
  const [periodEnd,    setPeriodEnd]    = useState('')
  const [payDate,      setPayDate]      = useState('')
  const [payMethod,    setPayMethod]    = useState<'eft' | 'cheque'>('eft')
  const [chequeNum,    setChequeNum]    = useState('')
  const [chequeDate,   setChequeDate]   = useState('')
  const [vacType,      setVacType]      = useState<'accruing' | 'included'>('accruing')
  const [vacRate,      setVacRate]      = useState(4)
  const [overtimeHrs,  setOvertimeHrs]  = useState(0)
  const [overtimeMult, setOvertimeMult] = useState(1.5)
  const [actualHours,  setActualHours]  = useState(0)

  // Step 2b — Pay date auto-calc
  const [autoDate,      setAutoDate]      = useState(false)
  const [firstPeriodStart, setFirstPeriodStart] = useState('')
  const [periodNumber,  setPeriodNumber]  = useState(1)
  const [payDateOffset, setPayDateOffset] = useState(3)

  // Step 3 — Extras
  const [extras,    setExtras]    = useState<{ label: string; amount: number }[]>([])
  const [deductions,setDeductions]= useState<{ label: string; amount: number }[]>([])
  const [notes,     setNotes]     = useState('')
  const [template,  setTemplate]  = useState(1)

  // Step 3b — YTD prior balances
  const [ytdGross,  setYtdGross]  = useState(0)
  const [ytdVac,    setYtdVac]    = useState(0)
  const [ytdCpp1,   setYtdCpp1]   = useState(0)
  const [ytdCpp2,   setYtdCpp2]   = useState(0)
  const [ytdEi,     setYtdEi]     = useState(0)
  const [ytdFed,    setYtdFed]    = useState(0)
  const [ytdProv,   setYtdProv]   = useState(0)
  const [ytdCustom, setYtdCustom] = useState(0)
  const [ytdNet,    setYtdNet]    = useState(0)

  useEffect(() => {
    fetchCompanies()
    fetchEmployees()
  }, [fetchCompanies, fetchEmployees])

  // When company+employee selected: detect current period by backtracking,
  // then auto-fill YTD from saved payslip history for prior periods this year.
  useEffect(() => {
    if (!selectedEmployee || !selectedCompany) return

    // 1. Detect which period we're in right now
    const info = detectCurrentPeriod(
      selectedEmployee.pay_frequency,
      selectedEmployee.start_date,
      selectedCompany.province,
      payDateOffset,
      selectedCompany.first_period_start ?? null
    )

    // Auto-fill dates if not already set
    if (!periodStart) setPeriodStart(info.periodStart)
    if (!periodEnd)   setPeriodEnd(info.periodEnd)
    if (!payDate)     setPayDate(info.payDate)
    setPeriodNumber(info.periodNumber)
    setAnchorWarning(info.anchorWarning ?? false)

    // 2. Fetch all saved payslips for this employee this year
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('payslips') as any)
      .select('gross_pay,vac_pay,cpp1,cpp2,ei,fed_tax,prov_tax,net_pay,custom_deductions,pay_date,period_start')
      .eq('employee_id', selectedEmployee.id)
      .eq('company_id', selectedCompany.id)
      .then(({ data }: { data: any[] | null }) => {
        if (!data || data.length === 0) return
        const year = new Date().getFullYear()
        // Only include payslips from prior periods this year (not the current period)
        const priorSlips = data.filter(p => {
          const slipYear = new Date(p.pay_date).getFullYear()
          return slipYear === year && p.period_start < info.periodStart
        })
        if (priorSlips.length === 0) return

        setYtdGross(priorSlips.reduce((s: number, p: any) => s + (p.gross_pay || 0), 0))
        setYtdVac(priorSlips.reduce((s: number, p: any) => s + (p.vac_pay || 0), 0))
        setYtdCpp1(priorSlips.reduce((s: number, p: any) => s + (p.cpp1 || 0), 0))
        setYtdCpp2(priorSlips.reduce((s: number, p: any) => s + (p.cpp2 || 0), 0))
        setYtdEi(priorSlips.reduce((s: number, p: any) => s + (p.ei || 0), 0))
        setYtdFed(priorSlips.reduce((s: number, p: any) => s + (p.fed_tax || 0), 0))
        setYtdProv(priorSlips.reduce((s: number, p: any) => s + (p.prov_tax || 0), 0))
        setYtdNet(priorSlips.reduce((s: number, p: any) => s + (p.net_pay || 0), 0))
        const customTotal = priorSlips.reduce((s: number, p: any) => {
          const deducts = (p.custom_deductions as { amount: number }[]) ?? []
          return s + deducts.reduce((ds: number, d: any) => ds + (d.amount || 0), 0)
        }, 0)
        setYtdCustom(customTotal)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployee?.id, selectedCompany?.id])

  // Auto-calculate dates when in auto mode
  useEffect(() => {
    if (!autoDate || !firstPeriodStart || !selectedCompany) return
    const { start, end } = calcPeriodDates(firstPeriodStart, periodNumber, selectedEmployee?.pay_frequency ?? 26)
    setPeriodStart(start)
    setPeriodEnd(end)
    const pd = calcPayDate(end, selectedCompany.province, payDateOffset)
    setPayDate(pd)
  }, [autoDate, firstPeriodStart, periodNumber, payDateOffset, selectedCompany, selectedEmployee])

  // Recalc pay date when period end or offset changes in manual mode
  useEffect(() => {
    if (autoDate || !periodEnd || !selectedCompany) return
    if (payDateOffset > 0) {
      const pd = calcPayDate(periodEnd, selectedCompany.province, payDateOffset)
      setPayDate(pd)
    }
  }, [periodEnd, payDateOffset, selectedCompany, autoDate])

  function buildInputs(): PayslipInputs {
    const emp = selectedEmployee!
    const co  = selectedCompany!
    // Force-parse all numeric fields — Supabase returns numeric columns as strings
    const rate        = parseFloat(String(emp.rate))           || 0
    const stdHours    = parseFloat(String(emp.std_weekly_hours)) || 40
    const payFreq     = parseInt(String(emp.pay_frequency))    || 26
    return {
      province:    co.province,
      empType:     emp.emp_type,
      annualSalary: emp.emp_type === 'salaried' ? rate : 0,
      hourlyRate:  emp.emp_type === 'hourly'   ? rate : 0,
      stdWeeklyHours: stdHours,
      actualHours,
      overtimeHours: overtimeHrs,
      overtimeMultiplier: overtimeMult,
      periods:     payFreq as 52|26|24|12,
      vacType,
      vacRate,
      extraEarnings:    extras.filter(e => e.amount > 0),
      customDeductions: deductions.filter(d => d.amount > 0),
      ytdPrev: {
        gross:  ytdGross,
        vac:    ytdVac,
        cpp1:   ytdCpp1,
        cpp2:   ytdCpp2,
        ei:     ytdEi,
        fed:    ytdFed,
        prov:   ytdProv,
        custom: ytdCustom,
        net:    ytdNet,
      },
      periodStart,
      periodEnd,
      payDate,
      effectivePayDate: payMethod === 'cheque' && chequeDate ? chequeDate : payDate,
      payMethod,
      chequeNumber: chequeNum,
      chequeDate,
      empJobTitle:  emp.job_title ?? '',
      empDepartment: emp.department ?? '',
      payslipNotes: notes,
      selectedTemplate: template,
      logoDataURL:  co.logo_url,
      displayPeriodNum: periodNumber > 0 ? { num: periodNumber, basis: 'year' as const } : null,
    }
  }

  function handleCalculate() {
    if (!selectedCompany || !selectedEmployee) return
    const inputs = buildInputs()
    setResult(calculatePayslip(inputs))
    setStep(3)
  }

  async function handleSave() {
    if (!result || !selectedCompany || !selectedEmployee || !profile) return
    setSaving(true)

    // 1. Generate PDF blob
    const pdfBlob = generatePayslipPDF({
      result,
      company:      selectedCompany,
      employee:     selectedEmployee,
      periodStart,
      periodEnd,
      payDate,
      payMethod,
      chequeNumber: chequeNum,
      chequeDate,
      vacType,
      vacRate,
      overtimeMult,
      notes,
      template,
      logoDataURL:  selectedCompany.logo_url,
    })

    // 2. Upload to Supabase Storage
    //    Path: {userId}/{CompanyName}/{EmployeeName}/{periodStart}.pdf
    const storagePath = buildStoragePath(
      profile.id,
      selectedCompany.name,
      selectedEmployee.name,
      periodStart
    )

    let pdfUrl: string | null = null
    const { error: uploadError } = await supabase.storage
      .from('payslips')
      .upload(storagePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true,          // overwrite if re-saving same period
      })

    if (!uploadError) {
      // Create a signed URL valid for 10 years (effectively permanent for the user)
      const { data: signedData } = await supabase.storage
        .from('payslips')
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365 * 10)
      pdfUrl = signedData?.signedUrl ?? null
    }

    // 3. Save payslip record with pdf_url
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('payslips') as any).insert({
      user_id:           profile.id,
      company_id:        selectedCompany.id,
      employee_id:       selectedEmployee.id,
      period_start:      periodStart,
      period_end:        periodEnd,
      pay_date:          payDate,
      pay_method:        payMethod,
      cheque_number:     chequeNum || null,
      gross_pay:         result.totalGross,
      cpp1:              result.cpp1,
      cpp2:              result.cpp2,
      ei:                result.eiEmployee,
      fed_tax:           result.fedTax,
      prov_tax:          result.provTax,
      net_pay:           result.netPay,
      custom_deductions: result.customDeductLines,
      extra_earnings:    result.extraLines,
      vac_pay:           result.vacPay,
      template,
      notes:             notes || null,
      pdf_url:           pdfUrl,
    })

    setSaving(false)
    navigate('/payslips')
  }

  const empOptions = employees
    .filter(e => !selectedCompany || e.company_id === selectedCompany.id)
    .map(e => ({ value: e.id, label: e.name }))

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1>New Payslip</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => i < step && setStep(i)}
              className={clsx(
                'flex items-center gap-2 text-sm font-medium transition-colors',
                i === step ? 'text-brand-700' : i < step ? 'text-green-600 cursor-pointer' : 'text-gray-400 cursor-default'
              )}
            >
              <span className={clsx(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                i === step ? 'bg-brand-600 text-white' :
                i < step   ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
              )}>
                {i < step ? '✓' : i + 1}
              </span>
              <span className="hidden sm:block">{s}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={clsx('flex-1 h-0.5 mx-2', i < step ? 'bg-green-400' : 'bg-gray-200')} />
            )}
          </div>
        ))}
      </div>

      {/* ── STEP 0: Company & Employee ── */}
      {step === 0 && (
        <Card>
          <CardTitle>Select Company &amp; Employee</CardTitle>
          <div className="space-y-4">
            <Select
              label="Company" required
              options={companies.map(c => ({ value: c.id, label: c.name }))}
              placeholder="— Select Company —"
              value={selectedCompany?.id ?? ''}
              onChange={e => {
                const co = companies.find(c => c.id === e.target.value) ?? null
                setSelectedCompany(co)
                setSelectedEmployee(null)
              }}
            />
            <Select
              label="Employee" required
              options={empOptions}
              placeholder={selectedCompany ? '— Select Employee —' : '— Select a company first —'}
              value={selectedEmployee?.id ?? ''}
              disabled={!selectedCompany}
              onChange={e => setSelectedEmployee(employees.find(emp => emp.id === e.target.value) ?? null)}
            />

            {selectedEmployee && (
              <div className="space-y-2">
                <div className="bg-brand-50 rounded-lg p-4 text-sm space-y-1">
                  <div className="font-semibold text-brand-800">{selectedEmployee.name}</div>
                  <div className="text-brand-600">
                    {selectedEmployee.emp_type === 'salaried'
                      ? `Salaried · $${selectedEmployee.rate.toLocaleString()}/yr`
                      : `Hourly · $${selectedEmployee.rate}/hr`}
                    {' · '}{FREQ_OPTIONS.find(f => f.value === selectedEmployee.pay_frequency)?.label}
                  </div>
                  {(selectedEmployee.job_title || selectedEmployee.department) && (
                    <div className="text-gray-500">
                      {[selectedEmployee.job_title, selectedEmployee.department].filter(Boolean).join(' · ')}
                    </div>
                  )}
                  {periodStart && periodEnd && (
                    <div className="text-xs text-brand-600 mt-1 pt-1 border-t border-brand-100">
                      Detected: Period {periodNumber} &nbsp;·&nbsp; {fmtDisplay(periodStart)} to {fmtDisplay(periodEnd)} &nbsp;·&nbsp; Pay: {fmtDisplay(payDate)}
                    </div>
                  )}
                </div>
                {anchorWarning && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-xs text-yellow-800">
                    ⚠ Period detection is using Jan 1 as the anchor because this company has no First Pay Period Start Date set.
                    Set it in the Companies page to get accurate period alignment.
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end pt-2">
              <button
                className="btn-primary"
                disabled={!selectedCompany || !selectedEmployee}
                onClick={() => setStep(1)}
              >
                Next: Pay Details →
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* ── STEP 1: Pay Details ── */}
      {step === 1 && (
        <Card>
          <CardTitle>Pay Period &amp; Details</CardTitle>
          <div className="space-y-4">

            {/* Auto-date toggle */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={autoDate}
                  onChange={e => setAutoDate(e.target.checked)} />
                <div className="w-10 h-5 bg-gray-300 peer-checked:bg-brand-600 rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
              </label>
              <span className="text-sm font-medium text-gray-700">Auto-calculate pay dates</span>
            </div>

            {autoDate ? (
              <div className="grid grid-cols-2 gap-4">
                <Input label="First Pay Period Start Date of the Year" type="date" required
                  value={firstPeriodStart} onChange={e => setFirstPeriodStart(e.target.value)} />
                <Input label="Pay Period Number" type="number" min={1} max={52} required
                  value={periodNumber} onChange={e => setPeriodNumber(parseInt(e.target.value)||1)}
                  hint="Period 1 = first pay period of the year" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Input label="Period Start" type="date" required value={periodStart}
                  onChange={e => setPeriodStart(e.target.value)} />
                <Input label="Period End" type="date" required value={periodEnd}
                  onChange={e => setPeriodEnd(e.target.value)} />
                <Input label="Period Number (optional)" type="number" min={1} max={52}
                  value={periodNumber || ''} onChange={e => setPeriodNumber(parseInt(e.target.value)||0)}
                  hint="Used for YTD estimation" />
              </div>
            )}

            {/* Pay date offset */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Pay Date Falls</label>
                <select className="input" value={payDateOffset}
                  onChange={e => setPayDateOffset(parseInt(e.target.value))}>
                  <option value={0}>On the last day of the pay period</option>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <option key={n} value={n}>+{n} business day{n>1?'s':''} after period end</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Automatically moved earlier if it falls on a weekend or holiday</p>
              </div>
              {payDateOffset === 0 && (
                <Input label="Pay Date" type="date" required value={payDate}
                  onChange={e => setPayDate(e.target.value)} />
              )}
              {payDateOffset > 0 && payDate && (
                <div>
                  <label className="label">Pay Date (auto-calculated)</label>
                  <div className="input bg-gray-50 text-gray-600">{fmtDisplay(payDate)}</div>
                  <p className="text-xs text-gray-400 mt-1">+{payDateOffset} business days after period end</p>
                </div>
              )}
            </div>

            {/* Payment method */}
            <div>
              <label className="label">Payment Method</label>
              <div className="flex gap-3 mt-1">
                {(['eft', 'cheque'] as const).map(m => (
                  <label key={m} className={clsx(
                    'flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer text-sm font-medium transition-colors flex-1 justify-center',
                    payMethod === m ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-300 text-gray-600 hover:border-brand-300'
                  )}>
                    <input type="radio" className="sr-only" checked={payMethod === m} onChange={() => setPayMethod(m)} />
                    {m === 'eft' ? '🏦 Direct Deposit (EFT)' : '📝 Cheque'}
                  </label>
                ))}
              </div>
            </div>

            {payMethod === 'cheque' && (
              <div className="grid grid-cols-2 gap-4">
                <Input label="Cheque Number" required value={chequeNum} onChange={e => setChequeNum(e.target.value)} />
                <Input label="Cheque Date" type="date" required value={chequeDate} onChange={e => setChequeDate(e.target.value)}
                  hint="Used as the pay date on the payslip" />
              </div>
            )}

            {/* Vacation */}
            <div>
              <label className="label">Vacation Pay</label>
              <div className="flex gap-3">
                {(['accruing', 'included'] as const).map(v => (
                  <label key={v} className={clsx(
                    'flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer text-sm font-medium transition-colors flex-1',
                    vacType === v ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-300 text-gray-600 hover:border-brand-300'
                  )}>
                    <input type="radio" className="sr-only" checked={vacType === v} onChange={() => setVacType(v)} />
                    {v === 'accruing' ? 'Accruing separately' : 'Included in rate'}
                  </label>
                ))}
              </div>
              {vacType === 'accruing' && (
                <div className="mt-3 w-48">
                  <Input label="Vacation Rate (%)" type="number" min={0} max={20} step={0.5}
                    value={vacRate} onChange={e => setVacRate(parseFloat(e.target.value)||4)}
                    hint="Provincial minimum: 4% (6% after 5 years)" />
                </div>
              )}
            </div>

            {/* Overtime (hourly only) */}
            {selectedEmployee?.emp_type === 'hourly' && (
              <div className="grid grid-cols-3 gap-4">
                <Input label="Actual Regular Hours" type="number" min={0} step={0.5}
                  value={actualHours||''} placeholder="Leave blank = standard"
                  onChange={e => setActualHours(parseFloat(e.target.value)||0)} />
                <Input label="Overtime Hours" type="number" min={0} step={0.5}
                  value={overtimeHrs||''} placeholder="0"
                  onChange={e => setOvertimeHrs(parseFloat(e.target.value)||0)} />
                <Select label="OT Multiplier"
                  options={[
                    { value: 1.5, label: '1.5× Time and a half' },
                    { value: 2.0, label: '2.0× Double time' },
                    { value: 2.5, label: '2.5× Double time and a half' },
                    { value: 1.25, label: '1.25× Custom' },
                    { value: 1.0, label: '1.0× Straight time' },
                  ]}
                  value={overtimeMult}
                  onChange={e => setOvertimeMult(parseFloat(e.target.value))}
                />
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button className="btn-ghost" onClick={() => setStep(0)}>← Back</button>
              <button className="btn-primary"
                disabled={
                  (autoDate ? !firstPeriodStart : (!periodStart || !periodEnd)) ||
                  !payDate ||
                  (payMethod === 'cheque' && (!chequeNum || !chequeDate))
                }
                onClick={() => setStep(2)}>
                Next: Extras &amp; YTD →
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* ── STEP 2: Extras & Template ── */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Extra earnings */}
          <Card>
            <CardTitle>Additional Earnings <span className="text-gray-400 font-normal normal-case">(optional)</span></CardTitle>
            {extras.map((e, i) => (
              <div key={i} className="flex gap-3 mb-3">
                <input className="input flex-1" placeholder="Label (e.g. Bonus)" value={e.label}
                  onChange={ev => setExtras(ex => ex.map((x, j) => j===i ? {...x, label: ev.target.value} : x))} />
                <input className="input w-32" type="number" min={0} step={0.01} placeholder="0.00" value={e.amount || ''}
                  onChange={ev => setExtras(ex => ex.map((x, j) => j===i ? {...x, amount: parseFloat(ev.target.value)||0} : x))} />
                <button className="text-red-400 hover:text-red-600 px-2" onClick={() => setExtras(ex => ex.filter((_,j)=>j!==i))}>✕</button>
              </div>
            ))}
            <button className="text-brand-600 text-sm font-semibold hover:underline"
              onClick={() => setExtras(ex => [...ex, { label: '', amount: 0 }])}>
              + Add Earning
            </button>
          </Card>

          {/* Custom deductions */}
          <Card>
            <CardTitle>Custom Deductions <span className="text-gray-400 font-normal normal-case">(optional)</span></CardTitle>
            {deductions.map((d, i) => (
              <div key={i} className="flex gap-3 mb-3">
                <input className="input flex-1" placeholder="Label (e.g. Health Benefits)" value={d.label}
                  onChange={ev => setDeductions(ds => ds.map((x, j) => j===i ? {...x, label: ev.target.value} : x))} />
                <input className="input w-32" type="number" min={0} step={0.01} placeholder="0.00" value={d.amount || ''}
                  onChange={ev => setDeductions(ds => ds.map((x, j) => j===i ? {...x, amount: parseFloat(ev.target.value)||0} : x))} />
                <button className="text-red-400 hover:text-red-600 px-2" onClick={() => setDeductions(ds => ds.filter((_,j)=>j!==i))}>✕</button>
              </div>
            ))}
            <button className="text-brand-600 text-sm font-semibold hover:underline"
              onClick={() => setDeductions(ds => [...ds, { label: '', amount: 0 }])}>
              + Add Deduction
            </button>
          </Card>

          {/* Notes */}
          <Card>
            <CardTitle>Notes / Memo <span className="text-gray-400 font-normal normal-case">(optional)</span></CardTitle>
            <textarea className="input resize-y" rows={3} placeholder="e.g. Includes statutory holiday pay."
              value={notes} onChange={e => setNotes(e.target.value)} />
          </Card>

          {/* YTD Prior Balances */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="mb-0">Year-to-Date Balances <span className="text-gray-400 font-normal normal-case">— prior periods only</span></CardTitle>
              <button className="text-xs text-brand-600 hover:underline font-medium" onClick={() => {
                setYtdGross(0); setYtdVac(0); setYtdCpp1(0); setYtdCpp2(0)
                setYtdEi(0); setYtdFed(0); setYtdProv(0); setYtdCustom(0); setYtdNet(0)
              }}>
                ↺ Reset
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Auto-filled from saved payslips for prior periods this year. The period number is detected
              by backtracking from today using the employee's pay frequency
              {selectedEmployee?.start_date ? ` and employment start date (${fmtDisplay(selectedEmployee.start_date)})` : ''}.
              Edit any field manually if needed.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'YTD Gross Pay',         val: ytdGross,  set: setYtdGross  },
                { label: 'YTD Vacation Pay',       val: ytdVac,    set: setYtdVac    },
                { label: 'YTD CPP',                val: ytdCpp1,   set: setYtdCpp1   },
                { label: 'YTD CPP2',               val: ytdCpp2,   set: setYtdCpp2   },
                { label: 'YTD EI',                 val: ytdEi,     set: setYtdEi     },
                { label: 'YTD Federal Tax',        val: ytdFed,    set: setYtdFed    },
                { label: 'YTD Provincial Tax',     val: ytdProv,   set: setYtdProv   },
                { label: 'YTD Custom Deductions',  val: ytdCustom, set: setYtdCustom },
                { label: 'YTD Net Pay',            val: ytdNet,    set: setYtdNet    },
              ].map(f => (
                <div key={f.label}>
                  <label className="label text-xs">{f.label}</label>
                  <input type="number" className="input text-sm" min={0} step={0.01}
                    value={f.val || ''} placeholder="0.00"
                    onChange={e => f.set(parseFloat(e.target.value)||0)} />
                </div>
              ))}
            </div>
          </Card>

          {/* Template */}
          <Card>
            <CardTitle>Payslip Template</CardTitle>
            <div className="grid grid-cols-7 gap-2">
              {TEMPLATE_NAMES.map((name, i) => (
                <button key={i} onClick={() => setTemplate(i + 1)}
                  className={clsx(
                    'rounded-xl overflow-hidden border-2 transition-all',
                    template === i + 1 ? 'border-brand-500 ring-2 ring-brand-300' : 'border-gray-200 hover:border-gray-400'
                  )}>
                  <div className="h-12" style={{ background: TEMPLATE_COLORS[i] }} />
                  <div className="text-xs font-medium py-1.5 px-1 text-center text-gray-700 bg-white">{name}</div>
                </button>
              ))}
            </div>
          </Card>

          <div className="flex justify-between">
            <button className="btn-ghost" onClick={() => setStep(1)}>← Back</button>
            <button className="btn-success" onClick={handleCalculate}>⚙ Calculate &amp; Preview →</button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Preview ── */}
      {step === 3 && result && selectedEmployee && selectedCompany && (
        <div className="space-y-4">
          {/* Summary card */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-bold text-lg text-gray-800">{selectedEmployee.name}</div>
                <div className="text-sm text-gray-500">{selectedCompany.name} · {periodStart} → {periodEnd}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400 uppercase tracking-wide">Net Pay</div>
                <div className="text-2xl font-extrabold text-green-600">{fmtCAD(result.netPay)}</div>
              </div>
            </div>

          {/* Full YTD earnings/deductions table */}
          {(() => {
            const allZero = !ytdGross && !ytdVac && !ytdCpp1 && !ytdCpp2 && !ytdEi && !ytdFed && !ytdProv && !ytdCustom && !ytdNet
            const pSoFar  = periodNumber > 0 ? periodNumber : 1
            const ytd = allZero ? {
              regular: result.regularPay * pSoFar,
              ot:      result.otPay      * pSoFar,
              gross:   result.totalGross * pSoFar,
              vac:     result.vacPay     * pSoFar,
              cpp1:    result.cpp1       * pSoFar,
              cpp2:    result.cpp2       * pSoFar,
              ei:      result.eiEmployee * pSoFar,
              fed:     result.fedTax     * pSoFar,
              prov:    result.provTax    * pSoFar,
              custom:  result.customDeductTotal * pSoFar,
              net:     result.netPay     * pSoFar,
              statutory: (result.cpp1 + result.cpp2 + result.eiEmployee + result.fedTax + result.provTax) * pSoFar,
            } : {
              regular: Math.max(0, ytdGross - ytdVac) + result.regularPay,
              ot:      result.otPay,
              gross:   ytdGross  + result.totalGross,
              vac:     ytdVac    + result.vacPay,
              cpp1:    ytdCpp1   + result.cpp1,
              cpp2:    ytdCpp2   + result.cpp2,
              ei:      ytdEi     + result.eiEmployee,
              fed:     ytdFed    + result.fedTax,
              prov:    ytdProv   + result.provTax,
              custom:  ytdCustom + result.customDeductTotal,
              net:     ytdNet    + result.netPay,
              statutory: (ytdCpp1+ytdCpp2+ytdEi+ytdFed+ytdProv) + (result.cpp1+result.cpp2+result.eiEmployee+result.fedTax+result.provTax),
            }
            const row = (label: string, period: number, ytdVal: number | null, bold = false, green = false) => (
              <tr key={label} className={bold ? 'bg-gray-50 font-semibold' : ''}>
                <td className={`py-2 text-sm ${green ? 'text-green-700 font-bold' : ''}`}>{label}</td>
                <td className={`py-2 text-right font-mono text-sm ${green ? 'text-green-700 font-bold' : ''}`}>{fmtCAD(period)}</td>
                <td className={`py-2 text-right font-mono text-sm ${green ? 'text-green-700 font-bold' : 'text-gray-400'}`}>
                  {ytdVal !== null ? fmtCAD(ytdVal) : <span className="text-gray-300">—</span>}
                </td>
              </tr>
            )
            const head = (label: string) => (
              <tr key={label} className="bg-gray-100">
                <td colSpan={3} className="py-1.5 px-2 text-xs font-bold uppercase text-gray-400 tracking-wide">{label}</td>
              </tr>
            )
            return (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-2 font-semibold text-gray-600">Description</th>
                    <th className="text-right py-2 font-semibold text-gray-600">This Period</th>
                    <th className="text-right py-2 font-semibold text-gray-600">
                      YTD {allZero && pSoFar > 1 && <span className="text-xs font-normal text-gray-400">(est.)</span>}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {head('Earnings')}
                  {row('Regular Pay', result.regularPay, ytd.regular)}
                  {result.otPay > 0 && row(`Overtime Pay (${overtimeMult}×)`, result.otPay, ytd.ot > 0 ? ytd.ot : null)}
                  {result.extraLines.map((e) => row(e.label, e.amount, allZero ? e.amount * pSoFar : e.amount))}
                  {result.vacPay > 0 && row(`Vacation Pay (${vacRate}%)`, result.vacPay, ytd.vac)}
                  {row('Gross Pay', result.totalGross, ytd.gross, true)}
                  {head('Statutory Deductions')}
                  {row('CPP', result.cpp1, ytd.cpp1)}
                  {result.cpp2 > 0 && row('CPP2', result.cpp2, ytd.cpp2)}
                  {row('EI', result.eiEmployee, ytd.ei)}
                  {row('Federal Tax', result.fedTax, ytd.fed)}
                  {row(`Provincial Tax (${selectedCompany.province})`, result.provTax, ytd.prov)}
                  {row('Total Statutory Deductions', result.totalDeductions, ytd.statutory, true)}
                  {result.customDeductLines.length > 0 && head('Other Deductions')}
                  {result.customDeductLines.map((d) => row(d.label, d.amount, allZero ? d.amount * pSoFar : d.amount))}
                  {result.customDeductLines.length > 0 && row('Total Other Deductions', result.customDeductTotal, ytd.custom, true)}
                </tbody>
              </table>
            )
          })()}

            <div className="mt-4 bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex justify-between items-center">
              <span className="font-bold text-green-800 text-lg">NET PAY</span>
              <span className="font-extrabold text-green-700 text-2xl">{fmtCAD(result.netPay)}</span>
            </div>

            <div className="mt-3 bg-gray-50 rounded-lg px-4 py-3 text-xs text-gray-500">
              <strong>Employer contributions (not deducted):</strong>{' '}
              Employer CPP {fmtCAD(result.employerCPP)} · Employer EI {fmtCAD(result.eiEmployer)} · Total cost {fmtCAD(result.totalEmployerCost)}
            </div>

            {/* Remittance summary */}
            <div className="mt-3 border border-blue-200 rounded-xl overflow-hidden">
              <div className="bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-blue-700">
                Employer Remittance to CRA
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2 font-semibold text-gray-500">Item</th>
                    <th className="text-right px-4 py-2 font-semibold text-gray-500">Employee</th>
                    <th className="text-right px-4 py-2 font-semibold text-gray-500">Employer</th>
                    <th className="text-right px-4 py-2 font-semibold text-gray-500">Total to Remit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ['CPP / CPP2', result.cpp1+result.cpp2, result.employerCPP, (result.cpp1+result.cpp2)+result.employerCPP],
                    ['EI',         result.eiEmployee,        result.eiEmployer,  result.eiEmployee+result.eiEmployer],
                    ['Federal Tax',result.fedTax,            0,                  result.fedTax],
                    ['Provincial Tax', result.provTax,       0,                  result.provTax],
                  ].map(([label, emp, empr, total]) => (
                    <tr key={label as string}>
                      <td className="px-4 py-2">{label}</td>
                      <td className="px-4 py-2 text-right font-mono">{fmtCAD(emp as number)}</td>
                      <td className="px-4 py-2 text-right font-mono">{(empr as number) > 0 ? fmtCAD(empr as number) : '—'}</td>
                      <td className="px-4 py-2 text-right font-mono font-semibold">{fmtCAD(total as number)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold">
                    <td className="px-4 py-2">Total Remittance</td>
                    <td className="px-4 py-2 text-right font-mono">{fmtCAD(result.totalDeductions)}</td>
                    <td className="px-4 py-2 text-right font-mono">{fmtCAD(result.employerCPP+result.eiEmployer)}</td>
                    <td className="px-4 py-2 text-right font-mono">{fmtCAD(result.totalDeductions+result.employerCPP+result.eiEmployer)}</td>
                  </tr>
                </tbody>
              </table>
              <div className="px-4 py-2 bg-blue-50 text-xs text-blue-600">
                Due by the 15th of the month following the pay date (regular remitters).
              </div>
            </div>
          </Card>

          <div className="flex gap-3 flex-wrap">
            <button className="btn-ghost" onClick={() => setStep(2)}>← Edit</button>
            <button className="btn-success" onClick={handleSave} disabled={saving}>
              {saving ? 'Uploading & Saving…' : '☁ Save to Cloud'}
            </button>
            <button className="btn-secondary" onClick={() => {
              if (!result || !selectedCompany || !selectedEmployee) return
              const blob = generatePayslipPDF({
                result, company: selectedCompany, employee: selectedEmployee,
                periodStart, periodEnd, payDate, payMethod,
                chequeNumber: chequeNum, chequeDate, vacType, vacRate,
                overtimeMult, notes, template, logoDataURL: selectedCompany.logo_url,
              })
              const url = URL.createObjectURL(blob)
              const a   = document.createElement('a')
              a.href    = url
              a.download = `${selectedEmployee.name.split(' ')[0]}_${periodStart}.pdf`
              a.click()
              URL.revokeObjectURL(url)
            }}>
              ⬇ Download PDF
            </button>
            <button className="btn-ghost" onClick={() => navigate('/payslips')}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}