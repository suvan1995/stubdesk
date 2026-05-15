import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useCompanyStore } from '@/store/companyStore'
import { useToast } from '@/components/ui/Toast'
import { fmtCAD } from '@/lib/payrollEngine'
import { fmtDisplay } from '@/lib/dateUtils'
import clsx from 'clsx'
import type { Payslip, Company, Employee } from '@/types/database'

// ── Helpers ───────────────────────────────────────────────────────────────────
function getMonthKey(date: string) {
  return date.substring(0, 7) // YYYY-MM
}
function monthLabel(key: string) {
  const [y, m] = key.split('-')
  return new Date(parseInt(y), parseInt(m) - 1, 1)
    .toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })
}
function prevMonth(key: string) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function nextMonth(key: string) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Employee colour bar — deterministic from name
const COLOURS = ['#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6']
function empColour(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return COLOURS[Math.abs(h) % COLOURS.length]
}

export default function PayrollSummaryPage() {
  const navigate = useNavigate()
  const { companies, employees, fetchCompanies, fetchEmployees } = useCompanyStore()
  const { success, error: toastError } = useToast()

  const [payslips,   setPayslips]   = useState<Payslip[]>([])
  const [loading,    setLoading]    = useState(true)
  const [monthKey,   setMonthKey]   = useState(() => getMonthKey(new Date().toISOString()))
  const [filterCo,   setFilterCo]   = useState('')
  const [deleting,   setDeleting]   = useState<string | null>(null)

  useEffect(() => {
    fetchCompanies()
    fetchEmployees()
  }, [fetchCompanies, fetchEmployees])

  useEffect(() => { loadPayslips() }, [monthKey, filterCo])

  async function loadPayslips() {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase.from('payslips') as any)
      .select('*')
      .gte('pay_date', monthKey + '-01')
      .lte('pay_date', monthKey + '-31')
      .eq('archived', false)
      .order('pay_date', { ascending: true })
    if (filterCo) q = q.eq('company_id', filterCo)
    const { data, error } = await q
    if (error) {
      console.error('loadPayslips payroll:', error)
      toastError('Failed to load payroll data', error.message)
    }
    setPayslips((data ?? []) as Payslip[])
    setLoading(false)
  }

  async function handleDelete(p: Payslip) {
    if (!confirm('Archive this payslip? It will be hidden but retained for audit purposes.')) return
    setDeleting(p.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('payslips') as any)
      .update({ archived: true, archived_at: new Date().toISOString() })
      .eq('id', p.id)
    if (error) {
      console.error('archive payslip:', error)
      toastError('Failed to archive payslip', error.message)
    } else {
      setPayslips(prev => prev.filter(x => x.id !== p.id))
      success('Payslip archived')
    }
    setDeleting(null)
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  const totals = payslips.reduce((acc, p) => ({
    net:        acc.net        + p.net_pay,
    gross:      acc.gross      + p.gross_pay,
    deductions: acc.deductions + (p.cpp1 + p.cpp2 + p.ei + p.fed_tax + p.prov_tax),
  }), { net: 0, gross: 0, deductions: 0 })

  // Group by pay date for display
  const byDate: Record<string, Payslip[]> = {}
  payslips.forEach(p => {
    if (!byDate[p.pay_date]) byDate[p.pay_date] = []
    byDate[p.pay_date].push(p)
  })

  const empMap  = new Map<string, Employee>(employees.map(e => [e.id, e]))
  const coMap   = new Map<string, Company>(companies.map(c => [c.id, c]))
  const uniqueEmps = new Set(payslips.map(p => p.employee_id)).size

  return (
    <div className="max-w-5xl mx-auto space-y-0">

      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        {filterCo && coMap.get(filterCo) && (
          <>
            <span className="text-brand-600 font-medium">{coMap.get(filterCo)!.name}</span>
            <span>›</span>
          </>
        )}
        <span className="text-gray-600 font-medium">Payroll</span>
      </div>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Payroll Summary</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Monthly Payroll &amp; Remittance Summary
          </p>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          <select className="input w-48 text-sm" value={filterCo}
            onChange={e => setFilterCo(e.target.value)}>
            <option value="">All companies</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Link to="/payslip/new" className="btn-primary flex items-center gap-2">
            Run Payroll →
          </Link>
        </div>
      </div>

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Employees',      value: String(uniqueEmps),    mono: false },
          { label: 'Net Pay',        value: fmtCAD(totals.net),    mono: true  },
          { label: 'Gross Wages',    value: fmtCAD(totals.gross),  mono: true  },
          { label: 'Tax Deductions', value: fmtCAD(totals.deductions), mono: true, action: true },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-5 py-4">
            <div className="text-xs text-gray-400 font-medium mb-1">{s.label}</div>
            <div className={clsx('text-xl font-bold text-gray-800', s.mono && 'font-mono')}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Period navigation ── */}
      <div className="flex items-center gap-3 mb-5">
        <button
          className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          onClick={() => setMonthKey(prevMonth(monthKey))}
        >
          ← Previous
        </button>
        <div className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 min-w-[140px] text-center">
          {monthLabel(monthKey).toUpperCase()}
        </div>
        <button
          className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          onClick={() => setMonthKey(nextMonth(monthKey))}
        >
          Next →
        </button>
      </div>

      {/* ── Payroll table ── */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400">
          Loading…
        </div>
      ) : payslips.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-3xl mb-3">📋</div>
          <p className="text-gray-500 font-medium mb-1">No payslips for {monthLabel(monthKey)}</p>
          <p className="text-gray-400 text-sm mb-5">Run payroll to generate pay stubs for your employees.</p>
          <Link to="/payslip/new" className="btn-primary">Run Payroll →</Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Pay Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Employee</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Stub</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Download</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Net Pay</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Income</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Deductions</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {payslips.map(p => {
                const emp = empMap.get(p.employee_id)
                const deductions = p.cpp1 + p.cpp2 + p.ei + p.fed_tax + p.prov_tax
                const freqLabel = { 52:'Weekly', 26:'Bi-weekly', 24:'Semi-monthly', 12:'Monthly' }[emp?.pay_frequency ?? 26] ?? ''
                const typeLabel = emp?.emp_type === 'salaried' ? 'Salary' : 'Hourly'
                return (
                  <tr key={p.id}
                    className={clsx('border-b border-gray-50 hover:bg-gray-50/60 transition-colors', deleting === p.id && 'opacity-40')}
                  >
                    {/* Pay date */}
                    <td className="px-5 py-3.5 text-gray-500 text-sm whitespace-nowrap">
                      {fmtDisplay(p.pay_date)}
                    </td>

                    {/* Employee */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-1 h-8 rounded-full shrink-0" style={{ background: empColour(emp?.name ?? '') }} />
                        <div>
                          <div className="font-semibold text-gray-800">{emp?.name ?? '—'}</div>
                          <div className="text-xs text-gray-400">{typeLabel} · {freqLabel}</div>
                        </div>
                      </div>
                    </td>

                    {/* Stub icon */}
                    <td className="px-3 py-3.5 text-center">
                      <button
                        title="View payslip details"
                        className="text-gray-400 hover:text-brand-600 transition-colors"
                        onClick={() => navigate('/payslips')}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="12" y2="15"/>
                        </svg>
                      </button>
                    </td>

                    {/* Download */}
                    <td className="px-3 py-3.5 text-center">
                      {p.pdf_url ? (
                        <a href={p.pdf_url} target="_blank" rel="noopener noreferrer"
                          className="text-gray-400 hover:text-brand-600 transition-colors inline-block"
                          title="Download PDF">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                        </a>
                      ) : (
                        <span className="text-gray-200">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                        </span>
                      )}
                    </td>

                    {/* Net pay */}
                    <td className="px-5 py-3.5 text-right font-mono font-semibold text-gray-800">
                      {fmtCAD(p.net_pay)}
                    </td>

                    {/* Gross */}
                    <td className="px-5 py-3.5 text-right font-mono text-gray-600">
                      {fmtCAD(p.gross_pay)}
                    </td>

                    {/* Deductions */}
                    <td className="px-5 py-3.5 text-right font-mono text-gray-600">
                      {fmtCAD(deductions)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Link
                          to="/payslip/new"
                          className="flex items-center gap-1 px-3 py-1.5 border border-brand-300 text-brand-600 rounded-lg text-xs font-semibold hover:bg-brand-50 transition-colors"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(p)}
                          disabled={deleting === p.id}
                          className="p-1.5 border border-red-200 text-red-400 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
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

            {/* Totals row */}
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td colSpan={4} className="px-5 py-3.5 text-sm font-bold text-gray-600">TOTALS:</td>
                <td className="px-5 py-3.5 text-right font-mono font-bold text-gray-800">{fmtCAD(totals.net)}</td>
                <td className="px-5 py-3.5 text-right font-mono font-bold text-gray-800">{fmtCAD(totals.gross)}</td>
                <td className="px-5 py-3.5 text-right font-mono font-bold text-gray-800">{fmtCAD(totals.deductions)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
