import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useCompanyStore } from '@/store/companyStore'
import { useToast } from '@/components/ui/Toast'
import { Card } from '@/components/ui/Card'
import { fmtCAD } from '@/lib/payrollEngine'
import { generatePayslipPDF } from '@/lib/pdfGenerator'
import type { Payslip, Company, Employee } from '@/types/database'
import type { PayslipResult, ExtraEarning, CustomDeduction } from '@/types/payroll'
import clsx from 'clsx'
import JSZip from 'jszip'
import Skeleton from '@/components/ui/Skeleton'

// ── Types ─────────────────────────────────────────────────────
interface EmployeeGroup {
  employee: Employee
  payslips: Payslip[]
}
interface CompanyGroup {
  company:   Company
  employees: EmployeeGroup[]
  total:     number
}

function fmtDate(str: string) {
  if (!str) return ''
  const [y, m, d] = str.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(m)-1]} ${parseInt(d)}, ${y}`
}

export default function PayslipsPage() {
  const { companies, employees, fetchCompanies, fetchEmployees } = useCompanyStore()
  const { success, error: toastError } = useToast()
  const [payslips,  setPayslips]  = useState<Payslip[]>([])
  const [loading,   setLoading]   = useState(true)
  const [openCos,   setOpenCos]   = useState<Set<string>>(new Set())
  const [openEmps,  setOpenEmps]  = useState<Set<string>>(new Set())
  const [deleting,  setDeleting]  = useState<string | null>(null)
  
  // Bulk selection state
  const [selectedSlips, setSelectedSlips] = useState<Set<string>>(new Set())
  const [zipping, setZipping] = useState(false)

  useEffect(() => {
    fetchCompanies()
    fetchEmployees()
    loadPayslips()
  }, [fetchCompanies, fetchEmployees])

  async function loadPayslips() {
    setLoading(true)
    const { data, error } = await supabase
      .from('payslips')
      .select('*')
      .eq('archived', false)
      .order('pay_date', { ascending: false })
    if (error) {
      console.error('loadPayslips:', error)
      toastError('Failed to load payslips', error.message)
      setLoading(false)
      return
    }
    const slips = (data ?? []) as Payslip[]
    setPayslips(slips)
    // Auto-expand companies and employees that have payslips
    const coIds  = new Set(slips.map(p => p.company_id))
    const empIds = new Set(slips.map(p => p.employee_id))
    setOpenCos(coIds)
    setOpenEmps(empIds)
    setLoading(false)
  }

  async function handleDelete(payslip: Payslip) {
    if (!confirm('Archive this payslip? It will be hidden from view but retained for audit purposes.')) return
    setDeleting(payslip.id)
    // Soft delete — set archived = true instead of hard deleting
    const { error } = await (supabase
      .from('payslips') as any)
      .update({ archived: true, archived_at: new Date().toISOString() })
      .eq('id', payslip.id)
    if (error) {
      console.error('archive payslip:', error)
      toastError('Failed to archive payslip', error.message)
    } else {
      setPayslips(prev => prev.filter(p => p.id !== payslip.id))
      setSelectedSlips(prev => {
        const next = new Set(prev)
        next.delete(payslip.id)
        return next
      })
      success('Payslip archived')
    }
    setDeleting(null)
  }

  // ── CSV Export ────────────────────────────────────────────────
  function exportCSV() {
    if (payslips.length === 0) return
    const headers = ['Employee','Company','Period Start','Period End','Pay Date','Gross Pay','CPP','CPP2','EI','Fed Tax','Prov Tax','Net Pay','Pay Method']
    const rows = payslips.map(p => {
      const emp = employees.find(e => e.id === p.employee_id)
      const co  = companies.find(c => c.id === p.company_id)
      return [
        emp?.name ?? '',
        co?.name ?? '',
        p.period_start,
        p.period_end,
        p.pay_date,
        p.gross_pay.toFixed(2),
        p.cpp1.toFixed(2),
        p.cpp2.toFixed(2),
        p.ei.toFixed(2),
        p.fed_tax.toFixed(2),
        p.prov_tax.toFixed(2),
        p.net_pay.toFixed(2),
        p.pay_method,
      ]
    })
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `payslips_export_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Reconstruct Payslip Result & YTD for PDF Generation ────────
  function buildPDFOptionsForSlip(p: Payslip) {
    const emp = employees.find(e => e.id === p.employee_id)
    const co  = companies.find(c => c.id === p.company_id)
    if (!emp || !co) return null

    // 1. Reconstruct PayslipResult
    const extras = (p.extra_earnings as unknown as ExtraEarning[]) ?? []
    const deductions = (p.custom_deductions as unknown as CustomDeduction[]) ?? []
    const extraTotal = extras.reduce((sum, e) => sum + (e.amount || 0), 0)
    const customDeductTotal = deductions.reduce((sum, d) => sum + (d.amount || 0), 0)
    const baseGross = p.gross_pay - (p.vac_pay || 0)

    const result: PayslipResult = {
      regularPay: Math.max(0, baseGross - extraTotal),
      otPay: 0,
      extraLines: extras,
      extraTotal,
      baseGross,
      vacPay: p.vac_pay || 0,
      totalGross: p.gross_pay,
      cpp1: p.cpp1,
      cpp2: p.cpp2,
      totalCPP: p.cpp1 + p.cpp2,
      eiEmployee: p.ei,
      eiEmployer: parseFloat((p.ei * 1.4).toFixed(2)),
      fedTax: p.fed_tax,
      provTax: p.prov_tax,
      totalDeductions: p.cpp1 + p.cpp2 + p.ei + p.fed_tax + p.prov_tax,
      customDeductLines: deductions,
      customDeductTotal,
      netPay: p.net_pay,
      employerCPP: p.cpp1 + p.cpp2,
      employerEI: parseFloat((p.ei * 1.4).toFixed(2)),
      totalEmployerCost: p.gross_pay + (p.cpp1 + p.cpp2) + parseFloat((p.ei * 1.4).toFixed(2)),
    }

    // 2. Sum YTD Prev (slips strictly prior to p.period_start in the same calendar year)
    const pYear = new Date(p.period_start).getFullYear()
    const priorSlips = payslips.filter(s => {
      const sYear = new Date(s.period_start).getFullYear()
      return s.employee_id === p.employee_id && sYear === pYear && s.period_start < p.period_start
    })

    const ytdPrev = {
      gross: priorSlips.reduce((sum, s) => sum + s.gross_pay, 0),
      vac: priorSlips.reduce((sum, s) => sum + (s.vac_pay || 0), 0),
      cpp1: priorSlips.reduce((sum, s) => sum + s.cpp1, 0),
      cpp2: priorSlips.reduce((sum, s) => sum + s.cpp2, 0),
      ei: priorSlips.reduce((sum, s) => sum + s.ei, 0),
      fed: priorSlips.reduce((sum, s) => sum + s.fed_tax, 0),
      prov: priorSlips.reduce((sum, s) => sum + s.prov_tax, 0),
      custom: priorSlips.reduce((sum, s) => {
        const sDeducts = (s.custom_deductions as unknown as CustomDeduction[]) ?? []
        return sum + sDeducts.reduce((dSum, d) => dSum + (d.amount || 0), 0)
      }, 0),
      net: priorSlips.reduce((sum, s) => sum + s.net_pay, 0),
    }

    // 3. Fallbacks for employee details
    const payFreq = emp.pay_frequency || 26
    const stdWeekly = emp.std_weekly_hours || 40
    const stdPeriodHours = stdWeekly * (52 / payFreq)

    return {
      result,
      company: co,
      employee: emp,
      periodStart: p.period_start,
      periodEnd: p.period_end,
      payDate: p.pay_date,
      payMethod: p.pay_method,
      chequeNumber: p.cheque_number ?? '',
      chequeDate: p.pay_date,
      vacType: (p.vac_pay || 0) > 0 ? 'accruing' as const : 'included' as const,
      vacRate: 4,
      overtimeMult: 1.5,
      notes: p.notes ?? '',
      template: p.template || 1,
      logoDataURL: co.logo_url,
      ytdPrev,
      taxDisplay: 'separate' as const,
      colorMode: 'color' as const,
      regularHours: emp.emp_type === 'hourly' ? stdPeriodHours : stdPeriodHours,
      overtimeHours: 0,
      hourlyRate: emp.emp_type === 'hourly' ? emp.rate : 0,
      annualSalary: emp.emp_type === 'salaried' ? emp.rate : 0,
    }
  }

  // ── Single PDF Download ──────────────────────────────────────
  function downloadSinglePDF(p: Payslip) {
    const opts = buildPDFOptionsForSlip(p)
    if (!opts) {
      toastError('Error', 'Missing company or employee references.')
      return
    }

    try {
      const blob = generatePayslipPDF(opts)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${opts.employee.name.replace(/\s+/g,'_')}_Payslip_${p.period_start}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      success('PDF Generated successfully')
    } catch (err: any) {
      console.error(err)
      toastError('Generation Failed', err.message || 'Error creating PDF')
    }
  }

  // ── Bulk ZIP Download ────────────────────────────────────────
  async function downloadSelectedZIP() {
    if (selectedSlips.size === 0) return
    setZipping(true)

    const zip = new JSZip()
    let count = 0

    try {
      for (const slipId of selectedSlips) {
        const p = payslips.find(s => s.id === slipId)
        if (!p) continue

        const opts = buildPDFOptionsForSlip(p)
        if (!opts) continue

        const blob = generatePayslipPDF(opts)
        
        // Structure: Company Name/Employee Name/PeriodStart_payslip.pdf
        const dirName = `${opts.company.name.replace(/[^a-zA-Z0-9_\- ]/g, '')}/${opts.employee.name.replace(/[^a-zA-Z0-9_\- ]/g, '')}`
        const fileName = `${p.period_start}_payslip.pdf`
        zip.folder(dirName)?.file(fileName, blob)
        count++
      }

      if (count === 0) {
        toastError('ZIP Error', 'No valid PDFs were added.')
        setZipping(false)
        return
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `stubdesk_payslips_${new Date().toISOString().slice(0,10)}.zip`
      a.click()
      URL.revokeObjectURL(url)

      success(`ZIP downloaded!`, `Packaged ${count} payslips successfully.`)
      setSelectedSlips(new Set())
    } catch (err: any) {
      console.error(err)
      toastError('ZIP failed', err.message || 'Error generating archive')
    } finally {
      setZipping(false)
    }
  }

  // Handle individual checkbox change
  function handleSelectChange(id: string) {
    setSelectedSlips(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Select all for a specific employee
  function handleSelectEmployeeAll(slips: Payslip[]) {
    const slipIds = slips.map(s => s.id)
    const allSelected = slipIds.every(id => selectedSlips.has(id))
    
    setSelectedSlips(prev => {
      const next = new Set(prev)
      if (allSelected) {
        slipIds.forEach(id => next.delete(id))
      } else {
        slipIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  // ── Build tree: Company → Employee → Payslips ─────────────────
  const tree: CompanyGroup[] = companies
    .map(co => {
      const coEmps = employees.filter(e => e.company_id === co.id)
      const empGroups: EmployeeGroup[] = coEmps
        .map(emp => ({
          employee: emp,
          payslips: payslips
            .filter(p => p.company_id === co.id && p.employee_id === emp.id)
            .sort((a, b) => b.pay_date.localeCompare(a.pay_date)),
        }))
        .filter(g => g.payslips.length > 0)

      return {
        company:   co,
        employees: empGroups,
        total:     empGroups.reduce((s, g) => s + g.payslips.length, 0),
      }
    })
    .filter(g => g.total > 0)

  const toggleCo  = (id: string) => setOpenCos(s  => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleEmp = (id: string) => setOpenEmps(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1>Payslips</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {payslips.length} payslip{payslips.length !== 1 ? 's' : ''} stored in the cloud
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {selectedSlips.size > 0 && (
            <button 
              className={clsx("btn-secondary text-sm font-semibold py-2 px-4 rounded-lg flex items-center gap-1.5", zipping && "opacity-60")}
              onClick={downloadSelectedZIP}
              disabled={zipping}
            >
              {zipping ? '🗄 Compressing…' : `⬇ Download ZIP (${selectedSlips.size})`}
            </button>
          )}
          {payslips.length > 0 && (
            <button className="btn-ghost text-sm" onClick={exportCSV} title="Export all payslips as CSV">
              ⬇ Export CSV
            </button>
          )}
          <Link to="/payslip/new" className="btn-primary">+ New Payslip</Link>
        </div>
      </div>

      {loading ? (
        <Card className="p-6 space-y-4">
          <Skeleton className="h-6 w-1/4 rounded" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </Card>
      ) : tree.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📄</div>
            <p className="text-gray-500 font-medium mb-1">No payslips yet</p>
            <p className="text-gray-400 text-sm mb-5">
              Generate your first payslip and it will be saved here automatically.
            </p>
            <Link to="/payslip/new" className="btn-primary">Generate First Payslip →</Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {tree.map(({ company, employees: empGroups, total }) => (
            <div key={company.id} className="card overflow-hidden">

              {/* ── Company row ── */}
              <button
                className="w-full flex items-center gap-3 px-5 py-4 bg-brand-600 hover:bg-brand-700 transition-colors text-left"
                onClick={() => toggleCo(company.id)}
              >
                {company.logo_url
                  ? <img src={company.logo_url} alt="" className="w-8 h-8 rounded object-contain bg-white p-0.5 shrink-0" />
                  : <div className="w-8 h-8 rounded bg-white/20 text-white font-bold text-sm flex items-center justify-center shrink-0">
                      {company.name.substring(0,2).toUpperCase()}
                    </div>
                }
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white">{company.name}</div>
                  <div className="text-brand-200 text-xs">
                    {empGroups.length} employee{empGroups.length !== 1 ? 's' : ''} · {total} payslip{total !== 1 ? 's' : ''}
                  </div>
                </div>
                <span className="text-white/60 text-lg">{openCos.has(company.id) ? '▾' : '▸'}</span>
              </button>

              {/* ── Employees under this company ── */}
              {openCos.has(company.id) && (
                <div className="divide-y divide-gray-100">
                  {empGroups.map(({ employee, payslips: slips }) => {
                    const allEmpSelected = slips.map(s => s.id).every(id => selectedSlips.has(id))
                    
                    return (
                      <div key={employee.id}>

                        {/* Employee row */}
                        <div className="w-full flex items-center gap-3 px-5 py-3 bg-gray-50 hover:bg-gray-100/80 transition-colors">
                          <input 
                            type="checkbox"
                            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                            checked={allEmpSelected}
                            onChange={() => handleSelectEmployeeAll(slips)}
                            title="Select all payslips for this employee"
                          />
                          <button
                            className="flex-1 flex items-center gap-3 text-left"
                            onClick={() => toggleEmp(employee.id)}
                          >
                            <div className="w-7 h-7 rounded-full bg-brand-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {employee.name.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-800 text-sm">{employee.name}</div>
                              <div className="text-gray-400 text-xs">
                                {[employee.job_title, employee.department].filter(Boolean).join(' · ') || (employee.emp_type === 'salaried' ? 'Salaried' : 'Hourly')}
                                {' · '}{slips.length} payslip{slips.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                            <span className="text-gray-400 text-sm">{openEmps.has(employee.id) ? '▾' : '▸'}</span>
                          </button>
                        </div>

                        {/* Payslip rows for this employee */}
                        {openEmps.has(employee.id) && (
                          <div className="bg-white">
                            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-0 items-center text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-2 border-b border-gray-100">
                              <span className="w-4"></span>
                              <span className="pl-3">Pay Period</span>
                              <span className="text-right pr-6">Gross</span>
                              <span className="text-right pr-6">Net</span>
                              <span className="text-right pr-6">Pay Date</span>
                              <span className="text-right pr-6">PDF</span>
                              <span></span>
                            </div>
                            {slips.map(p => (
                              <div
                                key={p.id}
                                className={clsx(
                                  'grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-0 items-center px-5 py-3 border-b border-gray-50 hover:bg-gray-50/70 text-sm transition-colors',
                                  deleting === p.id && 'opacity-40'
                                )}
                              >
                                {/* Selection Checkbox */}
                                <input 
                                  type="checkbox"
                                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                                  checked={selectedSlips.has(p.id)}
                                  onChange={() => handleSelectChange(p.id)}
                                />

                                {/* Pay period */}
                                <div className="pl-3">
                                  <div className="font-medium text-gray-800">
                                    {fmtDate(p.period_start)} – {fmtDate(p.period_end)}
                                  </div>
                                  <div className="text-xs text-gray-400 mt-0.5">
                                    {p.pay_method === 'cheque'
                                      ? `Cheque${p.cheque_number ? ' #'+p.cheque_number : ''}`
                                      : 'Direct Deposit'}
                                    {p.notes && <span className="ml-2 italic">"{p.notes.substring(0,30)}{p.notes.length>30?'…':''}"</span>}
                                  </div>
                                </div>

                                {/* Gross */}
                                <div className="text-right pr-6 font-mono text-gray-700">
                                  {fmtCAD(p.gross_pay)}
                                </div>

                                {/* Net */}
                                <div className="text-right pr-6 font-mono font-semibold text-green-700">
                                  {fmtCAD(p.net_pay)}
                                </div>

                                {/* Pay date */}
                                <div className="text-right pr-6 text-gray-500 text-xs">
                                  {fmtDate(p.pay_date)}
                                </div>

                                {/* PDF download */}
                                <div className="text-right pr-6">
                                  <button
                                    onClick={() => downloadSinglePDF(p)}
                                    className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-800 font-semibold text-xs transition-colors"
                                  >
                                    ⬇ PDF
                                  </button>
                                </div>

                                {/* Archive */}
                                <div className="text-right">
                                  <button
                                    className="text-gray-300 hover:text-red-500 transition-colors text-xs px-1"
                                    onClick={() => handleDelete(p)}
                                    disabled={deleting === p.id}
                                    title="Archive payslip (hidden but not deleted)"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
