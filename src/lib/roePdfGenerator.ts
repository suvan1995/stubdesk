/**
 * ROE PDF Generator — layout modelled on CRA's ROE Web form
 * Block numbers and field names match the official ROE (Record of Employment)
 * Colours: CRA red header, black text, bilingual labels
 */
import jsPDF from 'jspdf'
import type { ROE, Company, Employee } from '@/types/database'
import { ROE_REASON_CODES, PAY_PERIOD_TYPE_LABELS } from '@/types/database'

const CRA_RED   = [192, 57, 43]  as [number,number,number]
const BLACK     = [0,   0,  0]   as [number,number,number]
const DARK_GRAY = [60,  60, 60]  as [number,number,number]
const MID_GRAY  = [120,120,120]  as [number,number,number]
const BOX_BG    = [245,245,245]  as [number,number,number]
const WHITE     = [255,255,255]  as [number,number,number]
const BOX_BDR   = [180,180,180]  as [number,number,number]
const LIGHT_BG  = [235,235,235]  as [number,number,number]

function fmtDate(str: string | null | undefined): string {
  if (!str) return '—'
  const [y, m, d] = str.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(m)-1]} ${parseInt(d)}, ${y}`
}
function fmtAmt(n: number | null | undefined): string {
  if (!n || n === 0) return '$0.00'
  return '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtGenDate(): string {
  return new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function generateROEPDF(roe: ROE, company: Company, employee: Employee): Blob {
  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const pageW  = 215.9
  const margin = 12
  const fullW  = pageW - margin * 2
  let y        = margin

  const sf = (style: string, size: number, color: [number,number,number] = BLACK) => {
    doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor(...color)
  }
  const fr = (x: number, yy: number, w: number, h: number, color: [number,number,number]) => {
    doc.setFillColor(...color); doc.rect(x, yy, w, h, 'F')
  }
  const bdr = (x: number, yy: number, w: number, h: number, lw = 0.3) => {
    doc.setDrawColor(...BOX_BDR); doc.setLineWidth(lw); doc.rect(x, yy, w, h)
  }
  const tx = (str: string, x: number, yy: number, opts?: object) =>
    doc.text(str || '', x, yy, opts)
  const ln = (x1: number, y1: number, x2: number, y2: number, color: [number,number,number] = BOX_BDR, lw = 0.3) => {
    doc.setDrawColor(...color); doc.setLineWidth(lw); doc.line(x1, y1, x2, y2)
  }

  // ── Header ────────────────────────────────────────────────────────────────
  fr(0, 0, pageW, 18, CRA_RED)
  sf('bold', 14, WHITE)
  tx('Record of Employment', margin, 9)
  sf('normal', 7, [255,220,220] as [number,number,number])
  tx('Relevé d\'emploi', margin, 14)
  sf('bold', 8, WHITE)
  tx('ROE Web', pageW - margin, 9, { align: 'right' })
  sf('normal', 6.5, [255,220,220] as [number,number,number])
  tx('Service Canada / ESDC', pageW - margin, 14, { align: 'right' })

  // Status badge
  const sc: Record<string, [number,number,number]> = {
    draft: [180,120,0], issued: [20,120,60], amended: [60,60,180]
  }
  const badgeColor = sc[roe.status] ?? sc.draft
  fr(pageW - margin - 22, 1.5, 22, 6, badgeColor)
  sf('bold', 6, WHITE)
  tx(roe.status.toUpperCase(), pageW - margin - 11, 5.5, { align: 'center' })

  y = 22

  // ── Section helper ────────────────────────────────────────────────────────
  function sectionBar(title: string, titleFr: string) {
    fr(margin, y, fullW, 6.5, LIGHT_BG)
    bdr(margin, y, fullW, 6.5)
    sf('bold', 7, DARK_GRAY)
    tx(title, margin + 2, y + 4.5)
    sf('normal', 6, MID_GRAY)
    tx(titleFr, margin + 2 + doc.getTextWidth(title) + 3, y + 4.5)
    y += 6.5
  }

  // ── Field row helper ──────────────────────────────────────────────────────
  function fieldRow(fields: { block?: string; en: string; fr: string; val: string }[], rowH = 11) {
    const w = fullW / fields.length
    fields.forEach((f, i) => {
      const x = margin + i * w
      fr(x, y, w, rowH, BOX_BG)
      bdr(x, y, w, rowH)
      sf('bold', 6, CRA_RED)
      if (f.block) tx(`Block ${f.block}`, x + 1.5, y + 3.5)
      sf('bold', 5.5, MID_GRAY)
      tx(f.en, x + (f.block ? 1.5 : 1.5), y + (f.block ? 6 : 3.5))
      sf('normal', 5, [160,160,160] as [number,number,number])
      tx(f.fr, x + 1.5, y + (f.block ? 8.5 : 6))
      sf('normal', 8, BLACK)
      tx(f.val, x + 1.5, y + rowH - 1.5)
    })
    y += rowH
  }

  // ── Block 1 & 4 — Serial + Payroll ref ───────────────────────────────────
  sectionBar('Employer Information', 'Renseignements sur l\'employeur')
  fieldRow([
    { block:'1', en:'Serial number', fr:'Numéro de série', val: roe.serial_number ?? 'N/A' },
    { block:'4', en:'Employer payroll reference', fr:'Référence de la paie', val: roe.payroll_ref ?? '' },
    { en:'CRA Business Number', fr:'Numéro d\'entreprise ARC', val: company.cra_bn ?? 'Not set' },
  ])
  fieldRow([
    { en:'Employer name', fr:'Nom de l\'employeur', val: company.name },
    { en:'Address', fr:'Adresse', val: `${company.street}, ${company.city}, ${company.province}  ${company.postal}` },
  ])

  // ── Block 2 & 3 — SIN + Employment type ──────────────────────────────────
  sectionBar('Employee Information', 'Renseignements sur l\'employé')
  fieldRow([
    { block:'2', en:'Social insurance number', fr:'Numéro d\'assurance sociale', val: roe.sin ?? '' },
    { en:'Employee name', fr:'Nom de l\'employé', val: employee.name },
    { block:'3', en:'Type of employment', fr:'Type d\'emploi', val: roe.employment_type === 'E' ? 'E — Insurable' : 'C — Casual' },
  ])
  if (employee.address) {
    fieldRow([{ en:'Employee address', fr:'Adresse de l\'employé', val: employee.address }], 9)
  }

  // ── Blocks 5–8 — Pay period & dates ──────────────────────────────────────
  sectionBar('Pay Period & Dates', 'Période de paie et dates')
  fieldRow([
    { block:'5', en:'Pay period type', fr:'Type de période de paie', val: PAY_PERIOD_TYPE_LABELS[roe.pay_period_type] ?? roe.pay_period_type },
    { block:'6', en:'First day worked', fr:'Premier jour de travail', val: fmtDate(roe.first_day_worked) },
    { block:'7', en:'Last day for which paid', fr:'Dernier jour payé', val: fmtDate(roe.last_day_paid) },
    { block:'8', en:'Final pay period ending', fr:'Fin de la dernière période de paie', val: fmtDate(roe.final_pay_period_end) },
  ])

  // ── Block 9 — Reason ─────────────────────────────────────────────────────
  sectionBar('Block 9 — Reason for Issuing ROE', 'Bloc 9 — Raison de l\'émission du RE')
  fieldRow([
    { block:'9', en:'Reason code', fr:'Code de raison', val: ROE_REASON_CODES[roe.reason_code] ?? roe.reason_code },
    { en:'Comments', fr:'Commentaires', val: roe.reason_comments ?? '' },
  ], 13)

  // ── Blocks 10 & 11 — Hours & earnings ────────────────────────────────────
  sectionBar('Insurable Hours & Earnings', 'Heures et gains assurables')
  fieldRow([
    { block:'10', en:'Total insurable hours', fr:'Total des heures assurables', val: `${(roe.total_insurable_hours ?? 0).toFixed(2)} hrs` },
    { block:'11', en:'Total insurable earnings', fr:'Total des gains assurables', val: fmtAmt(roe.total_insurable_earnings) },
  ])

  // ── Blocks 12–14 — Other amounts ─────────────────────────────────────────
  sectionBar('Other Amounts', 'Autres montants')
  fieldRow([
    { block:'12', en:'Vacation pay', fr:'Paie de vacances',
      val: `${fmtAmt(roe.vacation_pay_amount)} (${roe.vacation_pay_type === 'I' ? 'Included / Incluse' : 'Paid on separation / Payée à la cessation'})` },
    { block:'13', en:'Statutory holiday pay', fr:'Indemnité de congé férié', val: fmtAmt(roe.stat_holiday_pay) },
    { block:'14', en:'Other monies', fr:'Autres sommes',
      val: roe.other_monies_amount ? `${fmtAmt(roe.other_monies_amount)}${roe.other_monies_type ? ' — ' + roe.other_monies_type : ''}` : '—' },
  ])

  // ── Block 15 — Insurable earnings by period ───────────────────────────────
  const periods = (roe.insurable_earnings_by_period ?? []) as number[]
  const activePeriods = periods.filter(v => v > 0)
  if (activePeriods.length > 0) {
    sectionBar('Block 15 — Insurable Earnings by Pay Period (most recent first)', 'Bloc 15 — Gains assurables par période de paie')
    const cellsPerRow = 9
    const cellW = fullW / cellsPerRow
    const cellH = 9
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < cellsPerRow; col++) {
        const idx = row * cellsPerRow + col
        const x   = margin + col * cellW
        fr(x, y, cellW, cellH, BOX_BG)
        bdr(x, y, cellW, cellH)
        sf('bold', 6, CRA_RED)
        tx(`P${idx + 1}`, x + 1.5, y + 3.5)
        sf('normal', 7, BLACK)
        const val = periods[idx] ? fmtAmt(periods[idx]) : ''
        tx(val, x + cellW / 2, y + 7.5, { align: 'center' })
      }
      y += cellH
    }
    y += 2
  }

  // ── Block 16 — Contact ────────────────────────────────────────────────────
  sectionBar('Block 16 — Contact Information', 'Bloc 16 — Coordonnées')
  fieldRow([
    { block:'16', en:'Contact name', fr:'Nom du contact', val: roe.contact_name ?? '' },
    { en:'Phone', fr:'Téléphone',
      val: roe.contact_phone ? `${roe.contact_phone}${roe.contact_ext ? ' ext. ' + roe.contact_ext : ''}` : '' },
  ])

  // ── Block 17 — Comments ───────────────────────────────────────────────────
  if (roe.comments) {
    sectionBar('Block 17 — Comments', 'Bloc 17 — Commentaires')
    fr(margin, y, fullW, 14, BOX_BG)
    bdr(margin, y, fullW, 14)
    sf('normal', 7.5, BLACK)
    const lines = doc.splitTextToSize(roe.comments, fullW - 4)
    doc.text(lines, margin + 2, y + 6)
    y += 14
  }

  // ── Issued date ───────────────────────────────────────────────────────────
  if (roe.issued_at) {
    y += 3
    sf('normal', 7, MID_GRAY)
    tx(`Issued: ${fmtDate(roe.issued_at.substring(0, 10))}`, margin, y)
    y += 5
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  ln(margin, y + 2, pageW - margin, y + 2)
  y += 6
  sf('italic', 6.5, MID_GRAY)
  tx('File this ROE electronically via Service Canada My Account (canada.ca/my-account)', margin, y)
  y += 4
  sf('normal', 6, MID_GRAY)
  tx(`Generated by StubDesk · ${fmtGenDate()} · Not an official CRA document · ${company.name} · ${employee.name}`, margin, y)

  return doc.output('blob')
}
