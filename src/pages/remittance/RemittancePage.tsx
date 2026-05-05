import { useEffect, useState } from 'react'
import { useCompanyStore } from '@/store/companyStore'
import { fmtCAD } from '@/lib/payrollEngine'
import { supabase } from '@/lib/supabase'
import type { Payslip, Company } from '@/types/database'

function getMonthKey(date: string) { return date.substring(0, 7) }
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

interface RemitRow {
  company:     Company
  payslips:    Payslip[]
  empCPP:      number
  empCPP2:     number
  empEI:       number
  empFed:      number
  empProv:     number
  emprCPP:     number
  emprEI:      number
  totalRemit:  number
}

export default function RemittancePage() {
  const { companies, fetchCompanies } = useCompanyStore()
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [loading,  setLoading]  = useState(true)
  const [monthKey, setMonthKey] = useState(() => getMonthKey(new Date().toISOString()))

  useEffect(() => { fetchCompanies() }, [fetchCompanies])
  useEffect(() => { loadPayslips() }, [monthKey])

  async function loadPayslips() {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('payslips') as any)
      .select('*')
      .gte('pay_date', monthKey + '-01')
      .lte('pay_date', monthKey + '-31')
    setPayslips((data ?? []) as Payslip[])
    setLoading(false)
  }

  // Build per-company remittance rows
  const rows: RemitRow[] = companies.map(co => {
    const coSlips = payslips.filter(p => p.company_id === co.id)
    const empCPP  = coSlips.reduce((s, p) => s + p.cpp1, 0)
    const empCPP2 = coSlips.reduce((s, p) => s + p.cpp2, 0)
    const empEI   = coSlips.reduce((s, p) => s + p.ei, 0)
    const empFed  = coSlips.reduce((s, p) => s + p.fed_tax, 0)
    const empProv = coSlips.reduce((s, p) => s + p.prov_tax, 0)
    const emprCPP = (empCPP + empCPP2)   // employer matches CPP 1:1
    const emprEI  = empEI * 1.4
    const totalRemit = empCPP + empCPP2 + empEI + empFed + empProv + emprCPP + emprEI
    return { company: co, payslips: coSlips, empCPP, empCPP2, empEI, empFed, empProv, emprCPP, emprEI, totalRemit }
  }).filter(r => r.payslips.length > 0)

  const grandTotal = rows.reduce((s, r) => s + r.totalRemit, 0)

  // CRA due date: 15th of the following month
  const [y, m] = monthKey.split('-').map(Number)
  const dueDate = new Date(y, m, 15) // month is 0-indexed, so m = next month
  const dueDateStr = dueDate.toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Remittance</h1>
          <p className="text-sm text-gray-400 mt-0.5">CRA payroll remittance summary by company</p>
        </div>
      </div>

      {/* Period nav */}
      <div className="flex items-center gap-3">
        <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
          onClick={() => setMonthKey(prevMonth(monthKey))}>← Previous</button>
        <div className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 min-w-[140px] text-center">
          {monthLabel(monthKey).toUpperCase()}
        </div>
        <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
          onClick={() => setMonthKey(nextMonth(monthKey))}>Next →</button>
      </div>

      {/* Due date banner */}
      {rows.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-blue-800 text-sm">Remittance due date</p>
            <p className="text-blue-600 text-xs mt-0.5">
              For {monthLabel(monthKey)} payroll — due by <strong>{dueDateStr}</strong> (regular remitters)
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-blue-500 uppercase tracking-wide font-semibold">Total to remit</div>
            <div className="text-2xl font-extrabold text-blue-800 font-mono">{fmtCAD(grandTotal)}</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-400">No payroll data for {monthLabel(monthKey)}.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {rows.map(r => (
            <div key={r.company.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Company header */}
              <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center justify-between">
                <div className="font-semibold text-gray-800">{r.company.name}</div>
                <div className="text-xs text-gray-400">{r.payslips.length} payslip{r.payslips.length !== 1 ? 's' : ''} · CRA BN: {r.company.cra_bn || 'Not set'}</div>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Item</th>
                    <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Employee</th>
                    <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Employer</th>
                    <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    { label: 'CPP Contributions',  emp: r.empCPP,  empr: r.emprCPP, total: r.empCPP + r.emprCPP },
                    { label: 'CPP2 Contributions', emp: r.empCPP2, empr: 0,          total: r.empCPP2 },
                    { label: 'EI Premiums',        emp: r.empEI,   empr: r.emprEI,   total: r.empEI + r.emprEI },
                    { label: 'Federal Income Tax',  emp: r.empFed,  empr: 0,          total: r.empFed },
                    { label: 'Provincial Tax',      emp: r.empProv, empr: 0,          total: r.empProv },
                  ].map(row => (
                    <tr key={row.label}>
                      <td className="px-5 py-2.5 text-gray-700">{row.label}</td>
                      <td className="px-5 py-2.5 text-right font-mono text-gray-600">{fmtCAD(row.emp)}</td>
                      <td className="px-5 py-2.5 text-right font-mono text-gray-600">{row.empr > 0 ? fmtCAD(row.empr) : '—'}</td>
                      <td className="px-5 py-2.5 text-right font-mono font-semibold text-gray-800">{fmtCAD(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td className="px-5 py-3 font-bold text-gray-700">Total Remittance</td>
                    <td colSpan={2} />
                    <td className="px-5 py-3 text-right font-mono font-extrabold text-brand-700 text-base">{fmtCAD(r.totalRemit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
