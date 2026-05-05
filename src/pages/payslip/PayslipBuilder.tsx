import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompanyStore } from '@/store/companyStore'
import { useAuthStore } from '@/store/authStore'
import { calculatePayslip, fmtCAD } from '@/lib/payrollEngine'
import { generatePayslipPDF, buildStoragePath } from '@/lib/pdfGenerator'
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
const TEMPLATE_NAMES = ['Classic Blue', 'Modern Dark', 'Forest Green', 'Slate Minimal', 'Warm Burgundy']
const TEMPLATE_COLORS = ['#1a5276', '#16213e', '#1b5e20', '#37474f', '#6a1b4d']

export default function PayslipBuilder() {
  const navigate = useNavigate()
  const { companies, employees, fetchCompanies, fetchEmployees } = useCompanyStore()
  const { profile } = useAuthStore()

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<PayslipResult | null>(null)

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

  // Step 3 — Extras
  const [extras,    setExtras]    = useState<{ label: string; amount: number }[]>([])
  const [deductions,setDeductions]= useState<{ label: string; amount: number }[]>([])
  const [notes,     setNotes]     = useState('')
  const [template,  setTemplate]  = useState(1)

  useEffect(() => {
    fetchCompanies()
    fetchEmployees()
  }, [fetchCompanies, fetchEmployees])

  // Auto-fill when employee selected
  useEffect(() => {
    if (selectedEmployee) {
      setVacRate(4)
    }
  }, [selectedEmployee])

  function buildInputs(): PayslipInputs {
    const emp = selectedEmployee!
    const co  = selectedCompany!
    return {
      province:    co.province,
      empType:     emp.emp_type,
      annualSalary: emp.emp_type === 'salaried' ? emp.rate : 0,
      hourlyRate:  emp.emp_type === 'hourly'   ? emp.rate : 0,
      stdWeeklyHours: emp.std_weekly_hours,
      actualHours,
      overtimeHours: overtimeHrs,
      overtimeMultiplier: overtimeMult,
      periods:     emp.pay_frequency as 52|26|24|12,
      vacType,
      vacRate,
      extraEarnings:    extras.filter(e => e.amount > 0),
      customDeductions: deductions.filter(d => d.amount > 0),
      ytdPrev: { gross:0, vac:0, cpp1:0, cpp2:0, ei:0, fed:0, prov:0, custom:0, net:0 },
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
      displayPeriodNum: null,
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
            <div className="grid grid-cols-2 gap-4">
              <Input label="Period Start" type="date" required value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
              <Input label="Period End"   type="date" required value={periodEnd}   onChange={e => setPeriodEnd(e.target.value)} />
              <Input label="Pay Date"     type="date" required value={payDate}     onChange={e => setPayDate(e.target.value)} />
              <div>
                <label className="label">Payment Method</label>
                <div className="flex gap-3 mt-1">
                  {(['eft', 'cheque'] as const).map(m => (
                    <label key={m} className={clsx(
                      'flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer text-sm font-medium transition-colors flex-1 justify-center',
                      payMethod === m ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-300 text-gray-600 hover:border-brand-300'
                    )}>
                      <input type="radio" className="sr-only" checked={payMethod === m} onChange={() => setPayMethod(m)} />
                      {m === 'eft' ? '🏦 Direct Deposit' : '📝 Cheque'}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {payMethod === 'cheque' && (
              <div className="grid grid-cols-2 gap-4">
                <Input label="Cheque Number" required value={chequeNum} onChange={e => setChequeNum(e.target.value)} />
                <Input label="Cheque Date"   type="date" required value={chequeDate} onChange={e => setChequeDate(e.target.value)} />
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
                <div className="mt-3 w-40">
                  <Input label="Vacation Rate (%)" type="number" min={0} max={20} step={0.5}
                    value={vacRate} onChange={e => setVacRate(parseFloat(e.target.value) || 4)} />
                </div>
              )}
            </div>

            {/* Overtime (hourly only) */}
            {selectedEmployee?.emp_type === 'hourly' && (
              <div className="grid grid-cols-3 gap-4">
                <Input label="Actual Regular Hours" type="number" min={0} step={0.5}
                  value={actualHours || ''} placeholder="Leave blank = standard"
                  onChange={e => setActualHours(parseFloat(e.target.value) || 0)} />
                <Input label="Overtime Hours" type="number" min={0} step={0.5}
                  value={overtimeHrs || ''} placeholder="0"
                  onChange={e => setOvertimeHrs(parseFloat(e.target.value) || 0)} />
                <Select label="OT Multiplier"
                  options={[
                    { value: 1.5, label: '1.5× Time and a half' },
                    { value: 2.0, label: '2.0× Double time' },
                    { value: 2.5, label: '2.5× Double time and a half' },
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
                disabled={!periodStart || !periodEnd || !payDate || (payMethod === 'cheque' && (!chequeNum || !chequeDate))}
                onClick={() => setStep(2)}>
                Next: Extras →
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

          {/* Template */}
          <Card>
            <CardTitle>Payslip Template</CardTitle>
            <div className="grid grid-cols-5 gap-3">
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

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-semibold text-gray-600">Description</th>
                  <th className="text-right py-2 font-semibold text-gray-600">This Period</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="bg-gray-50"><td colSpan={2} className="py-1.5 px-2 text-xs font-bold uppercase text-gray-400 tracking-wide">Earnings</td></tr>
                <tr><td className="py-2">Regular Pay</td><td className="py-2 text-right font-mono">{fmtCAD(result.regularPay)}</td></tr>
                {result.otPay > 0 && <tr><td className="py-2">Overtime Pay ({overtimeMult}×)</td><td className="py-2 text-right font-mono">{fmtCAD(result.otPay)}</td></tr>}
                {result.extraLines.map((e, i) => <tr key={i}><td className="py-2">{e.label}</td><td className="py-2 text-right font-mono">{fmtCAD(e.amount)}</td></tr>)}
                {result.vacPay > 0 && <tr><td className="py-2">Vacation Pay ({vacRate}%)</td><td className="py-2 text-right font-mono">{fmtCAD(result.vacPay)}</td></tr>}
                <tr className="font-bold bg-blue-50"><td className="py-2">Gross Pay</td><td className="py-2 text-right font-mono">{fmtCAD(result.totalGross)}</td></tr>

                <tr className="bg-gray-50"><td colSpan={2} className="py-1.5 px-2 text-xs font-bold uppercase text-gray-400 tracking-wide">Deductions</td></tr>
                <tr><td className="py-2">CPP</td><td className="py-2 text-right font-mono text-red-600">−{fmtCAD(result.cpp1)}</td></tr>
                {result.cpp2 > 0 && <tr><td className="py-2">CPP2</td><td className="py-2 text-right font-mono text-red-600">−{fmtCAD(result.cpp2)}</td></tr>}
                <tr><td className="py-2">EI</td><td className="py-2 text-right font-mono text-red-600">−{fmtCAD(result.eiEmployee)}</td></tr>
                <tr><td className="py-2">Federal Tax</td><td className="py-2 text-right font-mono text-red-600">−{fmtCAD(result.fedTax)}</td></tr>
                <tr><td className="py-2">Provincial Tax ({selectedCompany.province})</td><td className="py-2 text-right font-mono text-red-600">−{fmtCAD(result.provTax)}</td></tr>
                {result.customDeductLines.map((d, i) => <tr key={i}><td className="py-2">{d.label}</td><td className="py-2 text-right font-mono text-red-600">−{fmtCAD(d.amount)}</td></tr>)}
                <tr className="font-bold bg-red-50"><td className="py-2">Total Deductions</td><td className="py-2 text-right font-mono">{fmtCAD(result.totalDeductions + result.customDeductTotal)}</td></tr>
              </tbody>
            </table>

            <div className="mt-4 bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex justify-between items-center">
              <span className="font-bold text-green-800 text-lg">NET PAY</span>
              <span className="font-extrabold text-green-700 text-2xl">{fmtCAD(result.netPay)}</span>
            </div>

            <div className="mt-3 bg-gray-50 rounded-lg px-4 py-3 text-xs text-gray-500">
              <strong>Employer contributions (not deducted):</strong>{' '}
              Employer CPP {fmtCAD(result.employerCPP)} · Employer EI {fmtCAD(result.eiEmployer)} · Total cost {fmtCAD(result.totalEmployerCost)}
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
