import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useCompanyStore } from '@/store/companyStore'
import { fmtDisplay } from '@/lib/dateUtils'
import { ROE_REASON_CODES, PAY_PERIOD_TYPE_LABELS } from '@/types/database'
import type { ROE } from '@/types/database'
import { generateROEPDF } from '@/lib/roePdfGenerator'
import CRAFormLinks from '@/components/ui/CRAFormLinks'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { Card, CardTitle } from '@/components/ui/Card'

const REASON_OPTIONS = Object.entries(ROE_REASON_CODES).map(([v, l]) => ({ value: v, label: l }))
const PAY_PERIOD_OPTIONS = Object.entries(PAY_PERIOD_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))

export default function ROEEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const { companies, employees, fetchCompanies, fetchEmployees } = useCompanyStore()

  const isNew = !id || id === 'new'
  const [saving, setSaving] = useState(false)
  const [roe, setRoe] = useState<Partial<ROE>>({
    employment_type:      'E',
    pay_period_type:      'B',
    reason_code:          'A',
    vacation_pay_type:    'I',
    vacation_pay_amount:  0,
    stat_holiday_pay:     0,
    other_monies_amount:  0,
    total_insurable_hours: 0,
    total_insurable_earnings: 0,
    insurable_earnings_by_period: [],
    status: 'draft',
  })

  // Insurable earnings by period (up to 27)
  const [earningsByPeriod, setEarningsByPeriod] = useState<number[]>(Array(27).fill(0))

  useEffect(() => {
    fetchCompanies()
    fetchEmployees()
    if (!isNew && id) loadROE(id)
  }, [id, fetchCompanies, fetchEmployees])

  async function loadROE(roeId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('roes') as any).select('*').eq('id', roeId).single()
    if (data) {
      setRoe(data as ROE)
      const periods = (data as ROE).insurable_earnings_by_period ?? []
      const arr = Array(27).fill(0)
      periods.forEach((v: number, i: number) => { if (i < 27) arr[i] = v })
      setEarningsByPeriod(arr)
    }
  }

  // Auto-fill from payslip history when employee selected
  async function autoFillFromPayslips() {
    if (!roe.employee_id || !roe.company_id) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('payslips') as any)
      .select('gross_pay,ei,vac_pay,pay_date,period_start,period_end')
      .eq('employee_id', roe.employee_id)
      .eq('company_id', roe.company_id)
      .order('pay_date', { ascending: false })
      .limit(27)
    if (!data || data.length === 0) { alert('No payslips found for this employee.'); return }

    const totalHours = employees.find(e => e.id === roe.employee_id)?.std_weekly_hours ?? 40
    const weeksPerPeriod = 52 / (employees.find(e => e.id === roe.employee_id)?.pay_frequency ?? 26)
    const hoursPerPeriod = totalHours * weeksPerPeriod

    const totalInsurableEarnings = data.reduce((s: number, p: any) => s + (p.gross_pay || 0), 0)
    const totalInsurableHours    = data.length * hoursPerPeriod

    const arr = Array(27).fill(0)
    data.forEach((p: any, i: number) => { arr[i] = p.gross_pay || 0 })
    setEarningsByPeriod(arr)

    setRoe(prev => ({
      ...prev,
      total_insurable_earnings: totalInsurableEarnings,
      total_insurable_hours:    totalInsurableHours,
      last_day_paid:            data[0]?.pay_date ?? prev.last_day_paid,
      final_pay_period_end:     data[0]?.period_end ?? prev.final_pay_period_end,
      first_day_worked:         employees.find(e => e.id === roe.employee_id)?.start_date ?? prev.first_day_worked,
    }))
    alert(`Auto-filled from ${data.length} payslip(s).`)
  }

  function set(key: keyof ROE, val: unknown) {
    setRoe(prev => ({ ...prev, [key]: val }))
  }

  function handleDownload() {
    if (!selectedCo || !selectedEmp) { alert('Save the ROE first, then download.'); return }
    const payload = { ...roe, insurable_earnings_by_period: earningsByPeriod } as ROE
    const blob = generateROEPDF(payload, selectedCo, selectedEmp)
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `ROE_${selectedEmp.name.replace(/\s+/g,'_')}_${roe.last_day_paid ?? 'draft'}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleSave(status: 'draft' | 'issued') {
    if (!roe.company_id || !roe.employee_id) { alert('Select a company and employee.'); return }
    if (!roe.first_day_worked || !roe.last_day_paid || !roe.final_pay_period_end) {
      alert('Fill in all required date fields.'); return
    }
    setSaving(true)
    const payload = {
      ...roe,
      user_id: profile!.id,
      status,
      insurable_earnings_by_period: earningsByPeriod.filter(v => v > 0),
      issued_at: status === 'issued' ? new Date().toISOString() : roe.issued_at,
    }
    if (isNew) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('roes') as any).insert(payload)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('roes') as any).update(payload).eq('id', id)
    }
    setSaving(false)
    navigate('/roe')
  }

  const empOptions = employees
    .filter(e => !roe.company_id || e.company_id === roe.company_id)
    .map(e => ({ value: e.id, label: e.name }))

  const selectedEmp = employees.find(e => e.id === roe.employee_id)
  const selectedCo  = companies.find(c => c.id === roe.company_id)

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button className="btn-ghost text-sm" onClick={() => navigate('/roe')}>← Back</button>
        <h1 className="text-2xl font-bold text-gray-800">{isNew ? 'New ROE' : 'Edit ROE'}</h1>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 text-xs text-blue-700">
        Complete this form and file the ROE electronically via{' '}
        <a href="https://www.canada.ca/en/employment-social-development/services/my-account.html"
          target="_blank" rel="noopener noreferrer" className="underline font-semibold">
          Service Canada My Account
        </a>. Block numbers correspond to the official CRA ROE form (ROE Web).
      </div>

      <CRAFormLinks formKey="ROE" />

      {/* Employer & Employee */}
      <Card>
        <CardTitle>Employer &amp; Employee</CardTitle>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Company (Employer)" required
            options={companies.map(c => ({ value: c.id, label: c.name }))}
            placeholder="— Select Company —"
            value={roe.company_id ?? ''}
            onChange={e => { set('company_id', e.target.value); set('employee_id', '') }} />
          <Select label="Employee" required
            options={empOptions} placeholder="— Select Employee —"
            value={roe.employee_id ?? ''}
            disabled={!roe.company_id}
            onChange={e => set('employee_id', e.target.value)} />
          <Input label="Block 2 — Employee SIN" placeholder="e.g. 123 456 789"
            value={roe.sin ?? ''} onChange={e => set('sin', e.target.value)} />
          <Input label="Block 4 — Employer Payroll Reference No." placeholder="Optional"
            value={roe.payroll_ref ?? ''} onChange={e => set('payroll_ref', e.target.value)} />
        </div>
        {roe.employee_id && (
          <div className="mt-3 flex items-center justify-between bg-brand-50 rounded-lg px-4 py-3">
            <div className="text-sm text-brand-700">
              <strong>{selectedEmp?.name}</strong> · {selectedCo?.name}
              {selectedEmp?.start_date && ` · Started ${fmtDisplay(selectedEmp.start_date)}`}
            </div>
            <button className="btn-secondary text-xs py-1.5" onClick={autoFillFromPayslips}>
              ⚡ Auto-fill from payslips
            </button>
          </div>
        )}
      </Card>

      {/* Pay period & dates */}
      <Card>
        <CardTitle>Block 5–8 — Pay Period &amp; Dates</CardTitle>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Block 5 — Pay Period Type" required
            options={PAY_PERIOD_OPTIONS}
            value={roe.pay_period_type ?? 'B'}
            onChange={e => set('pay_period_type', e.target.value)} />
          <Select label="Block 3 — Type of Employment"
            options={[{ value:'E', label:'E — Insurable employment' }, { value:'C', label:'C — Casual employment' }]}
            value={roe.employment_type ?? 'E'}
            onChange={e => set('employment_type', e.target.value)} />
          <Input label="Block 6 — First Day Worked" type="date" required
            value={roe.first_day_worked ?? ''} onChange={e => set('first_day_worked', e.target.value)} />
          <Input label="Block 7 — Last Day for Which Paid" type="date" required
            value={roe.last_day_paid ?? ''} onChange={e => set('last_day_paid', e.target.value)} />
          <Input label="Block 8 — Final Pay Period Ending Date" type="date" required
            value={roe.final_pay_period_end ?? ''} onChange={e => set('final_pay_period_end', e.target.value)} />
        </div>
      </Card>

      {/* Reason */}
      <Card>
        <CardTitle>Block 9 — Reason for Issuing ROE</CardTitle>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Reason Code" required
            options={REASON_OPTIONS}
            value={roe.reason_code ?? 'A'}
            onChange={e => set('reason_code', e.target.value)} />
          <Input label="Comments (optional)"
            value={roe.reason_comments ?? ''} onChange={e => set('reason_comments', e.target.value)} />
        </div>
      </Card>

      {/* Insurable hours & earnings */}
      <Card>
        <CardTitle>Blocks 10–11 — Insurable Hours &amp; Earnings</CardTitle>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Block 10 — Total Insurable Hours" type="number" min={0} step={0.5}
            value={roe.total_insurable_hours ?? 0}
            onChange={e => set('total_insurable_hours', parseFloat(e.target.value)||0)}
            hint="Total hours worked in the last 52 weeks (max 3,120)" />
          <Input label="Block 11 — Total Insurable Earnings" type="number" min={0} step={0.01}
            value={roe.total_insurable_earnings ?? 0}
            onChange={e => set('total_insurable_earnings', parseFloat(e.target.value)||0)}
            hint="Total insurable earnings in the last 27 pay periods" />
        </div>
      </Card>

      {/* Insurable earnings by period */}
      <Card>
        <CardTitle>Block 15 — Insurable Earnings by Pay Period</CardTitle>
        <p className="text-xs text-gray-400 mb-4">
          Enter insurable earnings for each pay period, most recent first (Period 1 = most recent).
          Leave at 0 for periods that don't apply. Auto-fill above populates these from saved payslips.
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {earningsByPeriod.map((val, i) => (
            <div key={i}>
              <label className="text-xs text-gray-400 font-medium block mb-1">Period {i + 1}</label>
              <input type="number" className="input text-sm py-1.5" min={0} step={0.01}
                value={val || ''}
                placeholder="0.00"
                onChange={ev => {
                  const arr = [...earningsByPeriod]
                  arr[i] = parseFloat(ev.target.value) || 0
                  setEarningsByPeriod(arr)
                }} />
            </div>
          ))}
        </div>
      </Card>

      {/* Other amounts */}
      <Card>
        <CardTitle>Blocks 12–14 — Other Amounts</CardTitle>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Select label="Block 12 — Vacation Pay"
              options={[
                { value:'I', label:'I — Included in each pay period' },
                { value:'P', label:'P — Paid because no longer employed' },
              ]}
              value={roe.vacation_pay_type ?? 'I'}
              onChange={e => set('vacation_pay_type', e.target.value)} />
            <div className="mt-2">
              <Input label="Vacation Pay Amount ($)" type="number" min={0} step={0.01}
                value={roe.vacation_pay_amount ?? 0}
                onChange={e => set('vacation_pay_amount', parseFloat(e.target.value)||0)} />
            </div>
          </div>
          <Input label="Block 13 — Statutory Holiday Pay ($)" type="number" min={0} step={0.01}
            value={roe.stat_holiday_pay ?? 0}
            onChange={e => set('stat_holiday_pay', parseFloat(e.target.value)||0)} />
          <Input label="Block 14 — Other Monies ($)" type="number" min={0} step={0.01}
            value={roe.other_monies_amount ?? 0}
            onChange={e => set('other_monies_amount', parseFloat(e.target.value)||0)} />
          <Input label="Block 14 — Other Monies Type" placeholder="e.g. Severance pay"
            value={roe.other_monies_type ?? ''}
            onChange={e => set('other_monies_type', e.target.value)} />
        </div>
      </Card>

      {/* Contact & comments */}
      <Card>
        <CardTitle>Blocks 16–17 — Contact &amp; Comments</CardTitle>
        <div className="grid grid-cols-3 gap-4">
          <Input label="Contact Name"
            value={roe.contact_name ?? ''} onChange={e => set('contact_name', e.target.value)} />
          <Input label="Contact Phone"
            value={roe.contact_phone ?? ''} onChange={e => set('contact_phone', e.target.value)} />
          <Input label="Extension"
            value={roe.contact_ext ?? ''} onChange={e => set('contact_ext', e.target.value)} />
        </div>
        <div className="mt-4">
          <label className="label">Block 17 — Comments</label>
          <textarea className="input resize-y" rows={3}
            value={roe.comments ?? ''} onChange={e => set('comments', e.target.value)} />
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button className="btn-primary" onClick={() => handleSave('draft')} disabled={saving}>
          {saving ? 'Saving…' : '💾 Save as Draft'}
        </button>
        <button className="btn-success" onClick={() => handleSave('issued')} disabled={saving}>
          {saving ? 'Saving…' : '✓ Mark as Issued'}
        </button>
        <button className="btn-secondary" onClick={handleDownload}>
          ⬇ Download PDF
        </button>
        <button className="btn-ghost" onClick={() => navigate('/roe')}>Cancel</button>
      </div>
    </div>
  )
}
