import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useCompanyStore } from '@/store/companyStore'
import { aggregateT4FromPayslips } from '@/lib/t4Engine'
import { Card, CardTitle } from '@/components/ui/Card'
import Select from '@/components/ui/Select'
import type { T4Slip, Payslip } from '@/types/database'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i)

// All T4 boxes with metadata
const T4_BOXES = [
  // Auto-populated (read-only unless overridden)
  { box: '14', label: 'Employment Income',          key: 'box_14_employment_income',    auto: true,  required: true  },
  { box: '16', label: 'Employee CPP Contributions', key: 'box_16_cpp_employee',         auto: true,  required: true  },
  { box: '17', label: 'Employee CPP2 Contributions',key: 'box_17_cpp2_employee',        auto: true,  required: false },
  { box: '18', label: 'Employee EI Premiums',       key: 'box_18_ei_premiums',          auto: true,  required: true  },
  { box: '22', label: 'Income Tax Deducted',        key: 'box_22_income_tax',           auto: true,  required: true  },
  { box: '24', label: 'EI Insurable Earnings',      key: 'box_24_ei_insurable',         auto: true,  required: true  },
  { box: '26', label: 'CPP/QPP Pensionable Earnings',key:'box_26_cpp_pensionable',      auto: true,  required: true  },
  { box: '27', label: 'Employer CPP Contributions', key: 'box_27_cpp_employer',         auto: true,  required: false },
  { box: '19', label: 'Employer EI Premiums',       key: 'box_19_ei_employer',          auto: true,  required: false },
  // Manual boxes
  { box: '20', label: 'RPP Contributions',          key: 'box_20_rpp_contributions',    auto: false, required: false },
  { box: '40', label: 'Other Taxable Allowances',   key: 'box_40_other_taxable',        auto: false, required: false },
  { box: '41', label: 'Other Employment Income',    key: 'box_41_other_employment',     auto: false, required: false },
  { box: '42', label: 'Employment Commissions',     key: 'box_42_employment_commissions',auto:false, required: false },
  { box: '44', label: 'Union Dues',                 key: 'box_44_union_dues',           auto: false, required: false },
  { box: '46', label: 'Charitable Donations',       key: 'box_46_charitable_donations', auto: false, required: false },
  { box: '52', label: 'Pension Adjustment',         key: 'box_52_pension_adjustment',   auto: false, required: false },
  { box: '55', label: 'EI Rate',                    key: 'box_55_ei_rate',              auto: false, required: false },
  { box: '56', label: 'EI Insurable Earnings (Manual)', key: 'box_56_ei_insurable_manual', auto: false, required: false },
  { box: '57', label: 'Employment Income (Mar 15–May 9 2020)', key: 'box_57_employment_income_mar', auto: false, required: false },
  { box: '58', label: 'Employment Income (May 10–Jul 4 2020)', key: 'box_58_employment_income_apr', auto: false, required: false },
  { box: '59', label: 'Employment Income (Jul 5–Aug 29 2020)', key: 'box_59_employment_income_may', auto: false, required: false },
  { box: '60', label: 'Employment Income (Aug 30–Sep 26 2020)',key: 'box_60_employment_income_jun', auto: false, required: false },
]

const TEXT_BOXES = [
  { box: '50', label: 'RPP/DPSP Registration Number', key: 'box_50_rpp_dpsp_number' },
  { box: '53', label: 'DPSP Registration Number',     key: 'box_53_dpsp_number'     },
  { box: '54', label: 'Employee SIN (full)',           key: 'box_54_sin'             },
]

type BoxKey = keyof T4Slip

export default function T4EditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const { companies, employees, fetchCompanies, fetchEmployees } = useCompanyStore()

  const isNew = !id || id === 'new'

  const [slip,     setSlip]     = useState<Partial<T4Slip>>({})
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [saving,   setSaving]   = useState(false)
  const [taxYear,  setTaxYear]  = useState(CURRENT_YEAR - 1)
  const [selCo,    setSelCo]    = useState('')
  const [selEmp,   setSelEmp]   = useState('')

  useEffect(() => {
    fetchCompanies()
    fetchEmployees()
    supabase.from('payslips').select('*').then(({ data }) => setPayslips((data ?? []) as Payslip[]))
    if (!isNew && id) loadSlip(id)
  }, [id, fetchCompanies, fetchEmployees])

  async function loadSlip(slipId: string) {
    const { data } = await supabase.from('t4_slips').select('*').eq('id', slipId).single()
    if (data) {
      setSlip(data as T4Slip)
      setTaxYear((data as T4Slip).tax_year)
      setSelCo((data as T4Slip).company_id)
      setSelEmp((data as T4Slip).employee_id)
    }
  }

  function autoFill() {
    const co  = companies.find(c => c.id === selCo)
    const emp = employees.find(e => e.id === selEmp)
    if (!co || !emp) return
    const data = aggregateT4FromPayslips(payslips, emp, co, taxYear)
    setSlip(prev => ({ ...prev, ...data }))
  }

  function setBox(key: string, val: string) {
    setSlip(prev => ({ ...prev, [key]: val === '' ? null : parseFloat(val) }))
  }
  function setTextBox(key: string, val: string) {
    setSlip(prev => ({ ...prev, [key]: val || null }))
  }

  async function handleSave(status: 'draft' | 'final') {
    if (!selCo || !selEmp) { alert('Select a company and employee.'); return }
    setSaving(true)
    const payload = {
      ...slip,
      user_id:    profile!.id,
      company_id: selCo,
      employee_id: selEmp,
      tax_year:   taxYear,
      province_of_employment: companies.find(c => c.id === selCo)?.province ?? 'ON',
      status,
    }
    if (isNew) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('t4_slips') as any).insert(payload)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('t4_slips') as any).update(payload).eq('id', id)
    }
    setSaving(false)
    navigate('/t4')
  }

  const empOptions = employees
    .filter(e => !selCo || e.company_id === selCo)
    .map(e => ({ value: e.id, label: e.name }))

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button className="btn-ghost text-sm" onClick={() => navigate('/t4')}>← Back</button>
        <h1>{isNew ? 'New T4 Slip' : 'Edit T4 Slip'}</h1>
      </div>

      {/* Employee selection */}
      <Card>
        <CardTitle>Employee &amp; Tax Year</CardTitle>
        <div className="grid grid-cols-3 gap-4">
          <Select label="Tax Year" required
            options={YEARS.map(y => ({ value: y, label: String(y) }))}
            value={taxYear} onChange={e => setTaxYear(+e.target.value)} />
          <Select label="Company" required
            options={companies.map(c => ({ value: c.id, label: c.name }))}
            placeholder="— Select —" value={selCo}
            onChange={e => { setSelCo(e.target.value); setSelEmp('') }} />
          <Select label="Employee" required
            options={empOptions} placeholder="— Select —"
            value={selEmp} onChange={e => setSelEmp(e.target.value)}
            disabled={!selCo} />
        </div>
        {selCo && selEmp && (
          <button className="btn-secondary mt-4 text-sm" onClick={autoFill}>
            ⚡ Auto-fill from payslip history
          </button>
        )}
      </Card>

      {/* Auto-populated boxes */}
      <Card>
        <CardTitle>Core Boxes — Auto-populated from Payslips</CardTitle>
        <p className="text-xs text-gray-400 mb-4">These are calculated from your payslip records. You can override any value.</p>
        <div className="grid grid-cols-2 gap-4">
          {T4_BOXES.filter(b => b.auto).map(b => (
            <div key={b.key}>
              <label className="label">
                Box {b.box} — {b.label}
                {b.required && <span className="text-red-500 ml-0.5">*</span>}
                <span className="ml-2 badge badge-blue text-xs">Auto</span>
              </label>
              <input
                type="number" step="0.01" min="0"
                className="input"
                value={(slip[b.key as BoxKey] as number) ?? ''}
                onChange={e => setBox(b.key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Manual boxes */}
      <Card>
        <CardTitle>Additional Boxes — Enter Manually if Applicable</CardTitle>
        <p className="text-xs text-gray-400 mb-4">Leave blank if not applicable. Only non-zero values appear on the T4.</p>
        <div className="grid grid-cols-2 gap-4">
          {T4_BOXES.filter(b => !b.auto).map(b => (
            <div key={b.key}>
              <label className="label">Box {b.box} — {b.label}</label>
              <input
                type="number" step="0.01" min="0"
                className="input"
                value={(slip[b.key as BoxKey] as number | null) ?? ''}
                onChange={e => setBox(b.key, e.target.value)}
              />
            </div>
          ))}
        </div>

        {/* Text boxes */}
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
          {TEXT_BOXES.map(b => (
            <div key={b.key}>
              <label className="label">Box {b.box} — {b.label}</label>
              <input
                type="text" className="input"
                value={(slip[b.key as BoxKey] as string | null) ?? ''}
                onChange={e => setTextBox(b.key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Notes */}
      <Card>
        <CardTitle>Notes</CardTitle>
        <textarea className="input resize-y" rows={2}
          value={(slip.notes as string) ?? ''}
          onChange={e => setSlip(prev => ({ ...prev, notes: e.target.value || null }))} />
      </Card>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button className="btn-primary" onClick={() => handleSave('draft')} disabled={saving}>
          {saving ? 'Saving…' : '💾 Save as Draft'}
        </button>
        <button className="btn-success" onClick={() => handleSave('final')} disabled={saving}>
          {saving ? 'Saving…' : '✓ Save as Final'}
        </button>
        <button className="btn-ghost" onClick={() => navigate('/t4')}>Cancel</button>
      </div>
    </div>
  )
}
