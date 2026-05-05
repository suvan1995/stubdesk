import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useCompanyStore } from '@/store/companyStore'
import { Card, CardTitle } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import type { T4ASlip } from '@/types/database'
import { generateT4APDF } from '@/lib/yearEndPdfGenerator'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i)

export default function T4AEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const { companies, fetchCompanies } = useCompanyStore()
  const isNew = !id || id === 'new'

  const [saving, setSaving] = useState(false)
  const [slip, setSlip] = useState<Partial<T4ASlip>>({
    tax_year: CURRENT_YEAR - 1,
    box_16_pension: 0, box_18_lump_sum: 0, box_20_self_employed: 0,
    box_22_income_tax: 0, box_24_annuities: 0, box_28_other_income: 0,
    box_48_fees_services: 0, status: 'draft',
  })

  useEffect(() => {
    fetchCompanies()
    if (!isNew && id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(supabase.from('t4a_slips') as any).select('*').eq('id', id).single()
        .then(({ data }: { data: T4ASlip | null }) => { if (data) setSlip(data) })
    }
  }, [id, fetchCompanies])

  function set(key: keyof T4ASlip, val: unknown) {
    setSlip(prev => ({ ...prev, [key]: val }))
  }

  async function handleSave(status: 'draft' | 'final') {
    if (!slip.company_id || !slip.recipient_name) {
      alert('Company and recipient name are required.'); return
    }
    setSaving(true)
    const payload = { ...slip, user_id: profile!.id, status }
    if (isNew) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('t4a_slips') as any).insert(payload)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('t4a_slips') as any).update(payload).eq('id', id)
    }
    setSaving(false)
    navigate('/yearend/t4a')
  }

  function handleDownload() {
    const co = companies.find(c => c.id === slip.company_id)
    if (!co) { alert('Select a company first.'); return }
    const blob = generateT4APDF(slip as T4ASlip, co)
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `T4A_${(slip.recipient_name ?? 'recipient').replace(/\s+/g,'_')}_${slip.tax_year}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button className="btn-ghost text-sm" onClick={() => navigate('/yearend/t4a')}>← Back</button>
        <h1 className="text-2xl font-bold text-gray-800">{isNew ? 'New T4A Slip' : 'Edit T4A Slip'}</h1>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-xl px-5 py-3 text-xs text-purple-800">
        <strong>T4A</strong> — Use for self-employed contractors, freelancers, pension income, RRSP payments, retiring allowances, and fees for services. Box 048 (Fees for services) is the most common for contractors.
      </div>

      <Card>
        <CardTitle>Payer &amp; Recipient</CardTitle>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Company (Payer)" required
            options={companies.map(c => ({ value: c.id, label: c.name }))}
            placeholder="— Select Company —"
            value={slip.company_id ?? ''}
            onChange={e => set('company_id', e.target.value)} />
          <Select label="Tax Year" required
            options={YEARS.map(y => ({ value: y, label: String(y) }))}
            value={slip.tax_year ?? CURRENT_YEAR - 1}
            onChange={e => set('tax_year', +e.target.value)} />
          <Input label="Recipient Name" required
            value={slip.recipient_name ?? ''}
            onChange={e => set('recipient_name', e.target.value)} />
          <Input label="Recipient SIN"
            value={slip.recipient_sin ?? ''}
            onChange={e => set('recipient_sin', e.target.value)} />
          <div className="col-span-2">
            <Input label="Recipient Address"
              value={slip.recipient_address ?? ''}
              onChange={e => set('recipient_address', e.target.value)} />
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>Income Boxes</CardTitle>
        <p className="text-xs text-gray-400 mb-4">Leave at 0 if not applicable. Only non-zero boxes appear on the slip.</p>
        <div className="grid grid-cols-2 gap-4">
          {[
            { box:'048', label:'Fees for Services (most common for contractors)', key:'box_48_fees_services' },
            { box:'020', label:'Self-Employment Commissions',                     key:'box_20_self_employed' },
            { box:'022', label:'Income Tax Deducted',                             key:'box_22_income_tax' },
            { box:'016', label:'Pension or Superannuation',                       key:'box_16_pension' },
            { box:'018', label:'Lump-Sum Payments',                               key:'box_18_lump_sum' },
            { box:'024', label:'Annuities',                                       key:'box_24_annuities' },
            { box:'028', label:'Other Income',                                    key:'box_28_other_income' },
            { box:'030', label:'Patronage Allocations',                           key:'box_30_patronage' },
            { box:'032', label:'RPP Contributions',                               key:'box_32_rpp' },
            { box:'034', label:'Pension Adjustment',                              key:'box_34_pension_adj' },
            { box:'040', label:'Research Grants',                                 key:'box_40_research' },
            { box:'042', label:'Reimbursements / Awards',                         key:'box_42_reimbursements' },
            { box:'046', label:'Charitable Donations',                            key:'box_46_charitable' },
          ].map(f => (
            <div key={f.key}>
              <label className="label text-xs">Box {f.box} — {f.label}</label>
              <input type="number" className="input text-sm" min={0} step={0.01}
                value={(slip[f.key as keyof T4ASlip] as number) ?? ''}
                placeholder="0.00"
                onChange={e => set(f.key as keyof T4ASlip, parseFloat(e.target.value) || 0)} />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>Notes</CardTitle>
        <textarea className="input resize-y" rows={2}
          value={slip.notes ?? ''}
          onChange={e => set('notes', e.target.value || null)} />
      </Card>

      <div className="flex gap-3 flex-wrap">
        <button className="btn-primary" onClick={() => handleSave('draft')} disabled={saving}>
          {saving ? 'Saving…' : '💾 Save as Draft'}
        </button>
        <button className="btn-success" onClick={() => handleSave('final')} disabled={saving}>
          {saving ? 'Saving…' : '✓ Save as Final'}
        </button>
        <button className="btn-secondary" onClick={handleDownload}>⬇ Download PDF</button>
        <button className="btn-ghost" onClick={() => navigate('/yearend/t4a')}>Cancel</button>
      </div>
    </div>
  )
}
