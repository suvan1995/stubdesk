// Generic list page for T4A and T5 slips
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useCompanyStore } from '@/store/companyStore'
import clsx from 'clsx'

interface SlipRow {
  id: string
  recipient_name: string
  company_id: string
  tax_year: number
  status: 'draft' | 'final' | 'filed'
  created_at: string
  [key: string]: unknown
}

interface Props {
  table:       string          // 't4a_slips' | 't5_slips'
  title:       string          // 'T4A Slips' | 'T5 Slips'
  subtitle:    string
  editRoute:   string          // '/yearend/t4a' | '/yearend/t5'
  color:       string          // tailwind text color
  onDownload:  (slip: SlipRow, co: unknown) => void
}

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i)

export default function SlipListPage({ table, title, subtitle, editRoute, color, onDownload }: Props) {
  const navigate = useNavigate()
  const { companies, fetchCompanies } = useCompanyStore()
  const [slips,    setSlips]    = useState<SlipRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [taxYear,  setTaxYear]  = useState(CURRENT_YEAR - 1)
  const [filterCo, setFilterCo] = useState('')

  useEffect(() => { fetchCompanies() }, [fetchCompanies])
  useEffect(() => { loadSlips() }, [taxYear, filterCo])

  async function loadSlips() {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase.from(table) as any)
      .select('*').eq('tax_year', taxYear).order('created_at', { ascending: false })
    if (filterCo) q = q.eq('company_id', filterCo)
    const { data } = await q
    setSlips((data ?? []) as SlipRow[])
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this slip?')) return
    await supabase.from(table as 't4a_slips').delete().eq('id', id)
    setSlips(prev => prev.filter(s => s.id !== id))
  }

  async function markStatus(id: string, status: 'draft' | 'final' | 'filed') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from(table) as any).update({ status }).eq('id', id)
    setSlips(prev => prev.map(s => s.id === id ? { ...s, status } : s))
  }

  const coMap = new Map(companies.map(c => [c.id, c]))

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <select className="input w-28 text-sm" value={taxYear}
            onChange={e => setTaxYear(+e.target.value)}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="input w-44 text-sm" value={filterCo}
            onChange={e => setFilterCo(e.target.value)}>
            <option value="">All companies</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="btn-primary" onClick={() => navigate(`${editRoute}/new`)}>+ New Slip</button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400">Loading…</div>
      ) : slips.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-400 mb-4">No {title} slips for {taxYear}.</p>
          <button className="btn-primary" onClick={() => navigate(`${editRoute}/new`)}>Create First Slip</button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Recipient</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Company</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {slips.map(slip => {
                const co = coMap.get(slip.company_id)
                return (
                  <tr key={slip.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className={clsx('font-semibold', color)}>{slip.recipient_name}</div>
                      <div className="text-xs text-gray-400">{slip.tax_year} tax year</div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{co?.name ?? '—'}</td>
                    <td className="px-5 py-3.5 text-center">
                      <select
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                        value={slip.status}
                        onChange={e => markStatus(slip.id, e.target.value as 'draft' | 'final' | 'filed')}
                      >
                        <option value="draft">Draft</option>
                        <option value="final">Final</option>
                        <option value="filed">Filed</option>
                      </select>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          className="flex items-center gap-1 px-3 py-1.5 border border-green-300 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-50 transition-colors"
                          onClick={() => co && onDownload(slip, co)}
                        >
                          ⬇ PDF
                        </button>
                        <button
                          className="flex items-center gap-1 px-3 py-1.5 border border-brand-300 text-brand-600 rounded-lg text-xs font-semibold hover:bg-brand-50 transition-colors"
                          onClick={() => navigate(`${editRoute}/${slip.id}/edit`)}
                        >
                          Edit
                        </button>
                        <button
                          className="p-1.5 border border-red-200 text-red-400 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                          onClick={() => handleDelete(slip.id)}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
