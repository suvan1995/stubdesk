import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useCompanyStore } from '@/store/companyStore'
import { Card, CardTitle } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import type { T5Slip } from '@/types/database'
import { generateT5PDF } from '@/lib/yearEndPdfGenerator'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i)

export default function T5EditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const { companies, fetchCompanies } = useCompanyStore()
  const isNew = !id || id === 'new'

  const [saving, setSaving] = useState(false)
  const [slip, setSlip] = useState<Partial<T5Slip>>({
    tax_year: CURRENT_YEAR - 1,
    box_10_eligible_dividends: 0, box_11_taxable_eligible: 0,
    box_12_dividend_tax_credit: 0, box_13_interest: 0,
    box_14_other_income: 0, box_15_foreign_income: 0,
    box_16_foreign_tax: 0, box_17_royalties: 0,
    box_18_capital_gains_dividends: 0,
    box_24_ineligible_dividends: 0, box_25_taxable_ineligible: 0,
    box_26_ineligible_tax_credit: 0, status: 'draft',
  })

  useEffect(() => {
    fetchCompanies()
    if (!isNew && id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(supabase.from('t5_slips') as any).select('*').eq('id', id).single()
        .then(({ data }: { data: T5Slip | null }) => { if (data) setSlip(data) })
    }
  }, [id, fetchCompanies])

  function set(key: keyof T5Slip, val: unknown) {
    setSlip(prev => ({ ...prev, [key]: val }))
  }

  // Auto-calculate taxable amounts when eligible dividends change
  function setEligibleDividends(val: number) {
    set('box_10_eligible_dividends', val)
    set('box_11_taxable_eligible', +(val * 1.38).toFixed(2))
    set('box_12_dividend_tax_credit', +(val * 1.38 * 0.150198).toFixed(2))
  }
  function setIneligibleDividends(val: number) {
    set('box_24_ineligible_dividends', val)
    set('box_25_taxable_ineligible', +(val * 1.15).toFixed(2))
    set('box_26_ineligible_tax_credit', +(val * 1.15 * 0.090301).toFixed(2))
  }

  async function handleSave(status: 'draft' | 'final') {
    if (!slip.company_id || !slip.recipient_name) {
      alert('Company and recipient name are required.'); return
    }
    setSaving(true)
    const payload = { ...slip, user_id: profile!.id, status }
    if (isNew) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('t5_slips') as any).insert(payload)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('t5_slips') as any).update(payload).eq('id', id)
    }
    setSaving(false)
    navigate('/yearend/t5')
  }

  function handleDownload() {
    const co = companies.find(c => c.id === slip.company_id)
    if (!co) { alert('Select a company first.'); return }
    const blob = generateT5PDF(slip as T5Slip, co)
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `T5_${(slip.recipient_name ?? 'recipient').replace(/\s+/g,'_')}_${slip.tax_year}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button className="btn-ghost text-sm" onClick={() => navigate('/yearend/t5')}>← Back</button>
        <h1 className="text-2xl font-bold text-gray-800">{isNew ? 'New T5 Slip' : 'Edit T5 Slip'}</h1>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-xs text-green-800">
        <strong>T5</strong> — For dividends, interest, and investment income. Taxable amounts and dividend tax credits are calculated automatically when you enter the dividend amounts.
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
        <CardTitle>Eligible Dividends</CardTitle>
        <p className="text-xs text-gray-400 mb-4">Taxable amount (×1.38) and dividend tax credit (×15.0198%) are calculated automatically.</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label text-xs">Box 10 — Actual Eligible Dividends</label>
            <input type="number" className="input text-sm" min={0} step={0.01}
              value={slip.box_10_eligible_dividends || ''}
              onChange={e => setEligibleDividends(parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label text-xs">Box 11 — Taxable Amount (auto)</label>
            <input type="number" className="input text-sm bg-gray-50" readOnly
              value={slip.box_11_taxable_eligible ?? 0} />
          </div>
          <div>
            <label className="label text-xs">Box 12 — Dividend Tax Credit (auto)</label>
            <input type="number" className="input text-sm bg-gray-50" readOnly
              value={slip.box_12_dividend_tax_credit ?? 0} />
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>Ineligible Dividends</CardTitle>
        <p className="text-xs text-gray-400 mb-4">Taxable amount (×1.15) and dividend tax credit (×9.0301%) are calculated automatically.</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label text-xs">Box 24 — Actual Ineligible Dividends</label>
            <input type="number" className="input text-sm" min={0} step={0.01}
              value={slip.box_24_ineligible_dividends || ''}
              onChange={e => setIneligibleDividends(parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label text-xs">Box 25 — Taxable Amount (auto)</label>
            <input type="number" className="input text-sm bg-gray-50" readOnly
              value={slip.box_25_taxable_ineligible ?? 0} />
          </div>
          <div>
            <label className="label text-xs">Box 26 — Dividend Tax Credit (auto)</label>
            <input type="number" className="input text-sm bg-gray-50" readOnly
              value={slip.box_26_ineligible_tax_credit ?? 0} />
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>Other Investment Income</CardTitle>
        <div className="grid grid-cols-2 gap-4">
          {[
            { box:'13', label:'Interest from Canadian Sources', key:'box_13_interest' },
            { box:'14', label:'Other Income from Canadian Sources', key:'box_14_other_income' },
            { box:'15', label:'Foreign Income', key:'box_15_foreign_income' },
            { box:'16', label:'Foreign Tax Paid', key:'box_16_foreign_tax' },
            { box:'17', label:'Royalties from Canadian Sources', key:'box_17_royalties' },
            { box:'18', label:'Capital Gains Dividends', key:'box_18_capital_gains_dividends' },
            { box:'21', label:'ACB Adjustment', key:'box_21_acb_adjustment' },
          ].map(f => (
            <div key={f.key}>
              <label className="label text-xs">Box {f.box} — {f.label}</label>
              <input type="number" className="input text-sm" min={0} step={0.01}
                value={(slip[f.key as keyof T5Slip] as number) ?? ''}
                placeholder="0.00"
                onChange={e => set(f.key as keyof T5Slip, parseFloat(e.target.value) || 0)} />
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
        <button className="btn-ghost" onClick={() => navigate('/yearend/t5')}>Cancel</button>
      </div>
    </div>
  )
}
