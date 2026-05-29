import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useLimitsStore } from '@/store/limitsStore'
import { useCompanyStore } from '@/store/companyStore'
import { aggregateT4FromPayslips, generateT4XML } from '@/lib/t4Engine'
import { generateT4PDF } from '@/lib/t4PdfGenerator'
import { Card } from '@/components/ui/Card'
import clsx from 'clsx'
import type { T4Slip, Payslip, Company } from '@/types/database'
import Skeleton from '@/components/ui/Skeleton'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i)

export default function T4ListPage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const { limits } = useLimitsStore()
  const { companies, employees, fetchCompanies, fetchEmployees } = useCompanyStore()

  const [taxYear,    setTaxYear]    = useState(CURRENT_YEAR - 1)
  const [filterCo,   setFilterCo]   = useState('')
  const [t4s,        setT4s]        = useState<T4Slip[]>([])
  const [payslips,   setPayslips]   = useState<Payslip[]>([])
  const [loading,    setLoading]    = useState(true)
  const [generating, setGenerating] = useState(false)
  const [xmlModal,   setXmlModal]   = useState<{ company: Company; slips: T4Slip[] } | null>(null)
  const [transmitter, setTransmitter] = useState({
    transmitterNumber: 'MM555555',
    transmitterName:   '',
    contactName:       profile?.full_name ?? '',
    contactPhone:      '',
    contactEmail:      profile?.email ?? '',
  })

  useEffect(() => {
    fetchCompanies()
    fetchEmployees()
    loadData()
  }, [taxYear, fetchCompanies, fetchEmployees])

  async function loadData() {
    setLoading(true)
    const [t4Res, psRes] = await Promise.all([
      supabase.from('t4_slips').select('*').eq('tax_year', taxYear).order('created_at', { ascending: false }),
      supabase.from('payslips').select('*'),
    ])
    setT4s((t4Res.data ?? []) as T4Slip[])
    setPayslips((psRes.data ?? []) as Payslip[])
    setLoading(false)
  }

  async function autoGenerateAll() {
    if (!limits?.can_generate_t4) return
    setGenerating(true)
    const targetCos = filterCo ? companies.filter(c => c.id === filterCo) : companies
    let created = 0

    for (const co of targetCos) {
      const coEmployees = employees.filter(e => e.company_id === co.id)
      for (const emp of coEmployees) {
        const existing = t4s.find(t => t.employee_id === emp.id && t.tax_year === taxYear)
        if (existing) continue // skip already generated

        const coPayslips = payslips.filter(p => p.company_id === co.id)
        const data = aggregateT4FromPayslips(coPayslips, emp, co, taxYear)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('t4_slips') as any).insert({ ...data, user_id: profile!.id })
        created++
      }
    }
    await loadData()
    setGenerating(false)
    if (created === 0) alert('All T4s already generated for this year.')
    else alert(`Generated ${created} T4 slip(s).`)
  }

  async function deleteT4(id: string) {
    if (!confirm('Delete this T4 slip?')) return
    await supabase.from('t4_slips').delete().eq('id', id)
    setT4s(prev => prev.filter(t => t.id !== id))
  }

  async function markFinal(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('t4_slips') as any).update({ status: 'final' }).eq('id', id)
    setT4s(prev => prev.map(t => t.id === id ? { ...t, status: 'final' as const } : t))
  }

  function openXmlExport(co: Company) {
    const coSlips = filtered.filter(t => t.company_id === co.id && t.status !== 'draft')
    if (coSlips.length === 0) { alert('No finalized T4s for this company. Mark slips as Final first.'); return }
    setTransmitter(prev => ({ ...prev, transmitterName: co.name, contactName: profile?.full_name ?? '', contactEmail: profile?.email ?? '' }))
    setXmlModal({ company: co, slips: coSlips })
  }

  function downloadXML() {
    if (!xmlModal) return
    const xml = generateT4XML(xmlModal.slips, employees, xmlModal.company, taxYear, transmitter)
    const blob = new Blob([xml], { type: 'application/xml' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `T4_${xmlModal.company.name.replace(/\s+/g,'_')}_${taxYear}.xml`
    a.click()
    URL.revokeObjectURL(url)
    setXmlModal(null)
  }

  const filtered = t4s.filter(t => !filterCo || t.company_id === filterCo)
  const canT4    = limits?.can_generate_t4 ?? false
  const canXML   = limits?.can_export_t4_xml ?? false

  if (!canT4) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="text-center py-12">
          <div className="text-4xl mb-4">📋</div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">T4 Generation</h2>
          <p className="text-gray-500 mb-6">T4 slip generation is available on Starter and Pro plans.</p>
          <button className="btn-primary" onClick={() => navigate('/billing')}>Upgrade Plan</button>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1>T4 Slips</h1>
          <p className="text-sm text-gray-500 mt-0.5">Year-end employment income slips for CRA filing</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <select className="input w-28 text-sm" value={taxYear} onChange={e => setTaxYear(+e.target.value)}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="input w-44 text-sm" value={filterCo} onChange={e => setFilterCo(e.target.value)}>
            <option value="">All companies</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="btn-primary" onClick={autoGenerateAll} disabled={generating}>
            {generating ? 'Generating…' : '⚡ Auto-Generate All'}
          </button>
          <button className="btn-secondary" onClick={() => navigate('/t4/new')}>+ Manual T4</button>
        </div>
      </div>

      {/* XML export per company */}
      {canXML && companies.filter(c => !filterCo || c.id === filterCo).map(co => {
        const coSlips = filtered.filter(t => t.company_id === co.id)
        if (coSlips.length === 0) return null
        return (
          <div key={co.id} className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <span className="text-sm font-medium text-blue-800">{co.name} — {coSlips.length} T4(s) for {taxYear}</span>
            <button className="btn-secondary text-xs py-1.5" onClick={() => openXmlExport(co)}>
              ⬇ Export CRA XML
            </button>
          </div>
        )
      })}

      {/* T4 list */}
      {loading ? (
        <Card className="p-6 space-y-4">
          <Skeleton className="h-6 w-1/4 rounded" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <p className="text-center text-gray-400 py-8">
            No T4 slips for {taxYear}.{' '}
            <button className="text-brand-600 font-semibold hover:underline" onClick={autoGenerateAll}>
              Auto-generate from payslip history →
            </button>
          </p>
        </Card>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Employee</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Company</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Box 14 Income</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Box 22 Tax</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t4 => {
                const emp = employees.find(e => e.id === t4.employee_id)
                const co  = companies.find(c => c.id === t4.company_id)
                return (
                  <tr key={t4.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{emp?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{co?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-mono">${t4.box_14_employment_income.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono">${t4.box_22_income_tax.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('badge', {
                        'badge-yellow': t4.status === 'draft',
                        'badge-green':  t4.status === 'final',
                        'badge-blue':   t4.status === 'filed',
                      })}>
                        {t4.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button
                          className="flex items-center gap-1 px-3 py-1.5 border border-green-300 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-50 transition-colors"
                          onClick={() => {
                            const emp = employees.find(e => e.id === t4.employee_id)
                            const co  = companies.find(c => c.id === t4.company_id)
                            if (!emp || !co) return
                            const blob = generateT4PDF(t4, co, emp)
                            const url  = URL.createObjectURL(blob)
                            const a    = document.createElement('a')
                            a.href     = url
                            a.download = `T4_${emp.name.replace(/\s+/g,'_')}_${t4.tax_year}.pdf`
                            a.click()
                            URL.revokeObjectURL(url)
                          }}
                        >
                          ⬇ PDF
                        </button>
                        <button className="text-brand-600 hover:underline text-xs font-medium"
                          onClick={() => navigate(`/t4/${t4.id}/edit`)}>
                          Edit
                        </button>
                        {t4.status === 'draft' && (
                          <button className="text-green-600 hover:underline text-xs font-medium"
                            onClick={() => markFinal(t4.id)}>
                            Finalize
                          </button>
                        )}
                        <button className="text-red-400 hover:underline text-xs font-medium"
                          onClick={() => deleteT4(t4.id)}>
                          Delete
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

      {/* XML export modal */}
      {xmlModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h3 className="font-bold text-lg">Export CRA XML — {xmlModal.company.name}</h3>
            <p className="text-sm text-gray-500">
              {xmlModal.slips.length} finalized T4(s) will be included. Fill in transmitter details below.
            </p>
            <div className="space-y-3">
              {[
                { label: 'Transmitter Number', key: 'transmitterNumber', placeholder: 'MM555555' },
                { label: 'Transmitter Name',   key: 'transmitterName',   placeholder: 'Your company name' },
                { label: 'Contact Name',        key: 'contactName',       placeholder: 'Jane Smith' },
                { label: 'Contact Phone',       key: 'contactPhone',      placeholder: '4165551234' },
                { label: 'Contact Email',       key: 'contactEmail',      placeholder: 'you@company.com' },
              ].map(f => (
                <div key={f.key}>
                  <label className="label">{f.label}</label>
                  <input className="input" placeholder={f.placeholder}
                    value={transmitter[f.key as keyof typeof transmitter]}
                    onChange={e => setTransmitter(prev => ({ ...prev, [f.key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
              ⚠ Upload the generated XML file to the{' '}
              <a href="https://www.canada.ca/en/revenue-agency/services/e-services/filing-information-returns-electronically-t4-t5-other-types-returns.html"
                target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                CRA Internet File Transfer portal
              </a>. Required for 6+ employees; optional for fewer.
            </div>
            <div className="flex gap-3">
              <button className="btn-primary" onClick={downloadXML}>⬇ Download XML</button>
              <button className="btn-ghost" onClick={() => setXmlModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
