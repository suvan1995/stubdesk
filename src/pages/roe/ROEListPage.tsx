import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useCompanyStore } from '@/store/companyStore'
import { fmtDisplay } from '@/lib/dateUtils'
import { ROE_REASON_CODES } from '@/types/database'
import { generateROEPDF } from '@/lib/roePdfGenerator'
import type { ROE } from '@/types/database'
import clsx from 'clsx'

export default function ROEListPage() {
  const navigate = useNavigate()
  const { companies, employees, fetchCompanies, fetchEmployees } = useCompanyStore()
  const [roes,    setRoes]    = useState<ROE[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCo, setFilterCo] = useState('')

  useEffect(() => { fetchCompanies(); fetchEmployees() }, [fetchCompanies, fetchEmployees])
  useEffect(() => { loadROEs() }, [filterCo])

  async function loadROEs() {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase.from('roes') as any).select('*').order('created_at', { ascending: false })
    if (filterCo) q = q.eq('company_id', filterCo)
    const { data } = await q
    setRoes((data ?? []) as ROE[])
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this ROE?')) return
    await supabase.from('roes').delete().eq('id', id)
    setRoes(prev => prev.filter(r => r.id !== id))
  }

  function handleDownload(roe: ROE) {
    const emp = empMap.get(roe.employee_id)
    const co  = coMap.get(roe.company_id)
    if (!emp || !co) { alert('Employee or company data not loaded yet.'); return }
    const blob = generateROEPDF(roe, co, emp)
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `ROE_${emp.name.replace(/\s+/g,'_')}_${roe.last_day_paid}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const empMap = new Map(employees.map(e => [e.id, e]))
  const coMap  = new Map(companies.map(c => [c.id, c]))

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Records of Employment</h1>
          <p className="text-sm text-gray-400 mt-0.5">Issue ROEs when an employee's insurable employment is interrupted</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <select className="input w-48 text-sm" value={filterCo} onChange={e => setFilterCo(e.target.value)}>
            <option value="">All companies</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="btn-primary" onClick={() => navigate('/roe/new')}>+ New ROE</button>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-sm text-blue-800">
        <strong>When to issue an ROE:</strong> You must issue an ROE within 5 calendar days of an employee's last day of work, or within 5 days of the end of the pay period in which the interruption of earnings occurs. File electronically via{' '}
        <a href="https://www.canada.ca/en/employment-social-development/services/my-account.html" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Service Canada My Account</a>.
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400">Loading…</div>
      ) : roes.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-3xl mb-3">📋</div>
          <p className="text-gray-500 font-medium mb-1">No ROEs yet</p>
          <p className="text-gray-400 text-sm mb-5">Create an ROE when an employee's insurable employment is interrupted.</p>
          <button className="btn-primary" onClick={() => navigate('/roe/new')}>Create First ROE</button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Employee</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Company</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Last Day Paid</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Reason</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {roes.map(roe => {
                const emp = empMap.get(roe.employee_id)
                const co  = coMap.get(roe.company_id)
                return (
                  <tr key={roe.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-800">{emp?.name ?? '—'}</td>
                    <td className="px-5 py-3.5 text-gray-500">{co?.name ?? '—'}</td>
                    <td className="px-5 py-3.5 text-gray-500">{fmtDisplay(roe.last_day_paid)}</td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">{ROE_REASON_CODES[roe.reason_code] ?? roe.reason_code}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={clsx('badge text-xs', {
                        'badge-yellow': roe.status === 'draft',
                        'badge-green':  roe.status === 'issued',
                        'badge-blue':   roe.status === 'amended',
                      })}>
                        {roe.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          className="flex items-center gap-1 px-3 py-1.5 border border-green-300 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-50 transition-colors"
                          onClick={() => handleDownload(roe)}
                          title="Download PDF"
                        >
                          ⬇ PDF
                        </button>
                        <button
                          className="flex items-center gap-1 px-3 py-1.5 border border-brand-300 text-brand-600 rounded-lg text-xs font-semibold hover:bg-brand-50 transition-colors"
                          onClick={() => navigate(`/roe/${roe.id}/edit`)}
                        >
                          Edit
                        </button>
                        <button
                          className="p-1.5 border border-red-200 text-red-400 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                          onClick={() => handleDelete(roe.id)}
                          title="Delete"
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
