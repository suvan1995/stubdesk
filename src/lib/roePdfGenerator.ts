import jsPDF from 'jspdf'
import type { ROE } from '@/types/database'
import type { Company, Employee } from '@/types/database'
import { ROE_REASON_CODES, PAY_PERIOD_TYPE_LABELS } from '@/types/database'

function fmtDate(str: string | null | undefined): string {
  if (!str) return '—'
  const [y, m, d] = str.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(m)-1]} ${parseInt(d)}, ${y}`
}

function fmtMoney(n: number | null | undefined): string {
  if (!n) return '$0.00'
  return '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function generateROEPDF(roe: ROE, company: Company, employee: Employee): Blob {
  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const pageW  = 215.9
  const margin = 14
  let y        = margin

  const blue  = [26, 82, 118]  as [number,number,number]
  const white = [255,255,255]  as [number,number,number]
  const black = [30, 30, 30]   as [number,number,number]
  const gray  = [100,100,100]  as [number,number,number]
  const lgray = [240,242,245]  as [number,number,number]
  const bdr   = [200,205,210]  as [number,number,number]

  // ── helpers ──────────────────────────────────────────────────────────────
  const sf = (style: string, size: number, color: [number,number,number] = black) => {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(...color)
  }
  const fr = (x: number, yy: number, w: number, h: number, color: [number,number,number]) => {
    doc.setFillColor(...color); doc.rect(x, yy, w, h, 'F')
  }
  const tx = (str: string, x: number, yy: number, opts?: object) =>
    doc.text(str || '', x, yy, opts)
  const ln = (x1: number, y1: number, x2: number, y2: number, color: [number,number,number] = bdr, lw = 0.3) => {
    doc.setDrawColor(...color); doc.setLineWidth(lw); doc.line(x1, y1, x2, y2)
  }
  const box = (x: number, yy: number, w: number, h: number) => {
    doc.setDrawColor(...bdr); doc.setLineWidth(0.3); doc.rect(x, yy, w, h)
  }

  // ── HEADER ───────────────────────────────────────────────────────────────
  fr(0, 0, pageW, 22, blue)
  sf('bold', 16, white)
  tx('Record of Employment', margin, 10)
  sf('normal', 8, [200,215,235] as [number,number,number])
  tx('ROE — Employment Insurance', margin, 16)
  sf('bold', 10, white)
  tx('Canada', pageW - margin, 10, { align: 'right' })
  sf('normal', 7, [200,215,235] as [number,number,number])
  tx('Service Canada / CRA', pageW - margin, 16, { align: 'right' })
  y = 27

  // Status badge
  const statusColors: Record<string, [number,number,number]> = {
    draft:   [245,158,11],
    issued:  [16,185,129],
    amended: [99,102,241],
  }
  const sc = statusColors[roe.status] ?? statusColors.draft
  fr(pageW - margin - 28, y - 1, 28, 7, sc)
  sf('bold', 7, white)
  tx(roe.status.toUpperCase(), pageW - margin - 14, y + 4.5, { align: 'center' })

  // ── SECTION HELPER ────────────────────────────────────────────────────────
  function sectionHeader(title: string) {
    fr(margin, y, pageW - margin * 2, 7, lgray)
    box(margin, y, pageW - margin * 2, 7)
    sf('bold', 8, gray)
    tx(title.toUpperCase(), margin + 3, y + 5)
    y += 7
  }

  function fieldRow(
    fields: { block?: string; label: string; value: string }[],
    rowH = 10
  ) {
    const w = (pageW - margin * 2) / fields.length
    fields.forEach((f, i) => {
      const x = margin + i * w
      box(x, y, w, rowH)
      sf('bold', 6.5, gray)
      tx((f.block ? `Block ${f.block}  ` : '') + f.label, x + 2.5, y + 4)
      sf('normal', 8.5, black)
      tx(f.value, x + 2.5, y + 8.5)
    })
    y += rowH
  }

  // ── BLOCK 1 — Serial number ───────────────────────────────────────────────
  y += 2
  sectionHeader('Employer Information')
  fieldRow([
    { block:'1', label:'Serial Number',          value: roe.serial_number ?? 'N/A' },
    { block:'4', label:'Employer Payroll Ref.',   value: roe.payroll_ref ?? 'N/A' },
    { label:'CRA Business Number',                value: company.cra_bn ?? 'Not set' },
  ])
  fieldRow([
    { label:'Employer Name',   value: company.name },
    { label:'Address',         value: `${company.street}, ${company.city}, ${company.province}  ${company.postal}` },
  ])

  // ── EMPLOYEE ──────────────────────────────────────────────────────────────
  y += 2
  sectionHeader('Employee Information')
  fieldRow([
    { block:'2', label:'Employee SIN',    value: roe.sin ?? 'See employee file' },
    { label:'Employee Name',              value: employee.name },
    { block:'3', label:'Employment Type', value: roe.employment_type === 'E' ? 'E — Insurable' : 'C — Casual' },
  ])
  fieldRow([
    { label:'Address',         value: employee.address ?? 'Not on file' },
    { label:'Job Title',       value: [employee.job_title, employee.department].filter(Boolean).join(' · ') || 'Not specified' },
  ])

  // ── DATES ─────────────────────────────────────────────────────────────────
  y += 2
  sectionHeader('Pay Period & Dates')
  fieldRow([
    { block:'5', label:'Pay Period Type',         value: PAY_PERIOD_TYPE_LABELS[roe.pay_period_type] ?? roe.pay_period_type },
    { block:'6', label:'First Day Worked',         value: fmtDate(roe.first_day_worked) },
    { block:'7', label:'Last Day for Which Paid',  value: fmtDate(roe.last_day_paid) },
    { block:'8', label:'Final Pay Period End',      value: fmtDate(roe.final_pay_period_end) },
  ])

  // ── REASON ────────────────────────────────────────────────────────────────
  y += 2
  sectionHeader('Reason for Issuing ROE')
  fieldRow([
    { block:'9', label:'Reason Code', value: ROE_REASON_CODES[roe.reason_code] ?? roe.reason_code },
    { label:'Comments',               value: roe.reason_comments ?? '—' },
  ])

  // ── INSURABLE HOURS & EARNINGS ────────────────────────────────────────────
  y += 2
  sectionHeader('Insurable Hours & Earnings')
  fieldRow([
    { block:'10', label:'Total Insurable Hours',    value: (roe.total_insurable_hours ?? 0).toFixed(2) + ' hrs' },
    { block:'11', label:'Total Insurable Earnings', value: fmtMoney(roe.total_insurable_earnings) },
  ])

  // ── OTHER AMOUNTS ─────────────────────────────────────────────────────────
  y += 2
  sectionHeader('Other Amounts')
  fieldRow([
    { block:'12', label:'Vacation Pay',
      value: `${fmtMoney(roe.vacation_pay_amount)} (${roe.vacation_pay_type === 'I' ? 'Included in each pay' : 'Paid on separation'})` },
    { block:'13', label:'Statutory Holiday Pay', value: fmtMoney(roe.stat_holiday_pay) },
    { block:'14', label:'Other Monies',
      value: roe.other_monies_amount ? `${fmtMoney(roe.other_monies_amount)}${roe.other_monies_type ? ' — ' + roe.other_monies_type : ''}` : '—' },
  ])

  // ── BLOCK 15 — Insurable earnings by period ───────────────────────────────
  const periods = (roe.insurable_earnings_by_period ?? []) as number[]
  const activePeriods = periods.filter(v => v > 0)
  if (activePeriods.length > 0) {
    y += 2
    sectionHeader('Block 15 — Insurable Earnings by Pay Period (most recent first)')
    const cellW = (pageW - margin * 2) / 9
    const cellH = 9
    // Up to 27 periods in 3 rows of 9
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 9; col++) {
        const idx = row * 9 + col
        const x   = margin + col * cellW
        box(x, y, cellW, cellH)
        sf('bold', 6, gray)
        tx(`P${idx + 1}`, x + 1.5, y + 3.5)
        sf('normal', 7.5, black)
        tx(periods[idx] ? fmtMoney(periods[idx]) : '—', x + cellW / 2, y + 7.5, { align: 'center' })
      }
      y += cellH
    }
  }

  // ── CONTACT & COMMENTS ────────────────────────────────────────────────────
  y += 2
  sectionHeader('Contact & Comments')
  fieldRow([
    { block:'16', label:'Contact Name',  value: roe.contact_name ?? '—' },
    { label:'Phone',                     value: roe.contact_phone ? `${roe.contact_phone}${roe.contact_ext ? ' ext. ' + roe.contact_ext : ''}` : '—' },
  ])
  if (roe.comments) {
    fr(margin, y, pageW - margin * 2, 12, [255,255,255] as [number,number,number])
    box(margin, y, pageW - margin * 2, 12)
    sf('bold', 6.5, gray)
    tx('Block 17  Comments', margin + 2.5, y + 4)
    sf('normal', 8, black)
    const lines = doc.splitTextToSize(roe.comments, pageW - margin * 2 - 5)
    doc.text(lines, margin + 2.5, y + 8.5)
    y += 12
  }

  // ── ISSUED DATE ───────────────────────────────────────────────────────────
  if (roe.issued_at) {
    y += 2
    sf('italic', 7.5, gray)
    tx(`Issued: ${fmtDate(roe.issued_at.substring(0, 10))}`, margin, y)
    y += 5
  }

  // ── FOOTER ────────────────────────────────────────────────────────────────
  ln(margin, y + 2, pageW - margin, y + 2)
  y += 5
  sf('italic', 7, gray)
  tx('This ROE was generated by StubDesk. File electronically via Service Canada My Account (canada.ca).', margin, y)
  y += 4
  sf('normal', 7, gray)
  tx(`Generated ${new Date().toLocaleDateString('en-CA', { year:'numeric', month:'long', day:'numeric' })}  |  ${company.name}  |  ${employee.name}`, margin, y)

  return doc.output('blob')
}
