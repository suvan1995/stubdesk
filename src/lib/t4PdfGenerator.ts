/**
 * T4 PDF Generator — layout modelled on the CRA T4 slip (t4-fill-25e.pdf)
 *
 * The official T4 prints two copies per page (employee copy + employer copy).
 * Box layout follows CRA's published box numbering and approximate positions.
 * Colours: CRA red (#c0392b) header, black text, light gray box backgrounds.
 */
import jsPDF from 'jspdf'
import type { T4Slip, Company, Employee } from '@/types/database'

const CRA_RED   = [192, 57, 43]  as [number,number,number]
const BLACK     = [0,   0,  0]   as [number,number,number]
const DARK_GRAY = [60,  60, 60]  as [number,number,number]
const MID_GRAY  = [120,120,120]  as [number,number,number]
const BOX_BG    = [245,245,245]  as [number,number,number]
const WHITE     = [255,255,255]  as [number,number,number]
const BOX_BDR   = [180,180,180]  as [number,number,number]

function fmtAmt(n: number | null | undefined): string {
  if (!n || n === 0) return ''
  return n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(): string {
  return new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
}

/**
 * Draw one T4 slip copy within a bounding rectangle.
 * @param doc   jsPDF instance
 * @param slip  T4 data
 * @param co    Company
 * @param emp   Employee
 * @param ox    X origin of the slip rectangle
 * @param oy    Y origin of the slip rectangle
 * @param sw    Slip width  (mm)
 * @param sh    Slip height (mm)
 * @param copyLabel  e.g. "Employee's copy" / "Employer's copy"
 */
function drawT4Slip(
  doc: jsPDF,
  slip: T4Slip,
  co: Company,
  emp: Employee,
  ox: number, oy: number,
  sw: number, sh: number,
  copyLabel: string
) {
  // ── helpers scoped to this slip ──────────────────────────────────────────
  const sf = (style: string, size: number, color: [number,number,number] = BLACK) => {
    doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor(...color)
  }
  const fr = (x: number, y: number, w: number, h: number, color: [number,number,number]) => {
    doc.setFillColor(...color); doc.rect(ox+x, oy+y, w, h, 'F')
  }
  const bdr = (x: number, y: number, w: number, h: number, lw = 0.25) => {
    doc.setDrawColor(...BOX_BDR); doc.setLineWidth(lw); doc.rect(ox+x, oy+y, w, h)
  }
  const tx = (str: string, x: number, y: number, opts?: object) =>
    doc.text(str, ox+x, oy+y, opts)
  const ln = (x1: number, y1: number, x2: number, y2: number, color: [number,number,number] = BOX_BDR, lw = 0.25) => {
    doc.setDrawColor(...color); doc.setLineWidth(lw)
    doc.line(ox+x1, oy+y1, ox+x2, oy+y2)
  }

  // Outer border
  doc.setDrawColor(...BOX_BDR); doc.setLineWidth(0.4)
  doc.rect(ox, oy, sw, sh)

  // ── Red header bar ────────────────────────────────────────────────────────
  fr(0, 0, sw, 9, CRA_RED)
  sf('bold', 11, WHITE)
  tx('T4', 3, 6.5)
  sf('bold', 7, WHITE)
  tx('Statement of Remuneration Paid', 12, 4.5)
  sf('normal', 6, [255,220,220] as [number,number,number])
  tx('Déclaration de la rémunération payée', 12, 8)
  sf('bold', 7, WHITE)
  tx(`${slip.tax_year}`, sw - 3, 6.5, { align: 'right' })

  // Copy label
  sf('italic', 6, [255,220,220] as [number,number,number])
  tx(copyLabel, sw - 3, 8.5, { align: 'right' })

  let y = 11

  // ── Employer section ──────────────────────────────────────────────────────
  fr(0, y, sw, 5.5, [235,235,235] as [number,number,number])
  ln(0, y, sw, y, BOX_BDR)
  sf('bold', 6, MID_GRAY)
  tx("Employer's name and address — Nom et adresse de l'employeur", 2, y + 3.8)
  y += 5.5

  bdr(0, y, sw, 12)
  sf('normal', 8, BLACK)
  tx(co.name, 2, y + 5)
  sf('normal', 7, DARK_GRAY)
  tx(`${co.street}, ${co.city}, ${co.province}  ${co.postal}`, 2, y + 9.5)
  if (co.cra_bn) {
    sf('normal', 6.5, MID_GRAY)
    tx(`CRA BN: ${co.cra_bn}`, sw - 2, y + 5, { align: 'right' })
  }
  y += 12

  // ── Employee section ──────────────────────────────────────────────────────
  fr(0, y, sw, 5.5, [235,235,235] as [number,number,number])
  ln(0, y, sw, y, BOX_BDR)
  sf('bold', 6, MID_GRAY)
  tx("Employee's name — Nom de l'employé", 2, y + 3.8)
  y += 5.5

  const empRowH = 10
  bdr(0, y, sw * 0.55, empRowH)
  bdr(sw * 0.55, y, sw * 0.25, empRowH)
  bdr(sw * 0.80, y, sw * 0.20, empRowH)

  sf('bold', 6, MID_GRAY)
  tx('Last name — Nom de famille', 2, y + 3.5)
  tx('First name — Prénom', sw * 0.55 + 1.5, y + 3.5)
  tx('Initials — Initiales', sw * 0.80 + 1.5, y + 3.5)

  const nameParts = emp.name.trim().split(/\s+/)
  const lastName  = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0]
  const firstName = nameParts[0]

  sf('normal', 8.5, BLACK)
  tx(lastName.toUpperCase(), 2, y + 8)
  tx(firstName, sw * 0.55 + 1.5, y + 8)
  y += empRowH

  // SIN + Province + Employee number row
  const sinW = sw * 0.30
  const provW = sw * 0.35
  const empNumW = sw - sinW - provW
  bdr(0, y, sinW, empRowH)
  bdr(sinW, y, provW, empRowH)
  bdr(sinW + provW, y, empNumW, empRowH)

  sf('bold', 6, MID_GRAY)
  tx('Social insurance number — Numéro d\'assurance sociale', 1.5, y + 3.5)
  tx('Province of employment — Province d\'emploi', sinW + 1.5, y + 3.5)
  tx('Employee\'s number — Numéro d\'employé', sinW + provW + 1.5, y + 3.5)

  sf('normal', 8.5, BLACK)
  const sinDisplay = slip.box_54_sin ?? (emp.sin_last3 ? `*** *** ${emp.sin_last3}` : '')
  tx(sinDisplay, 1.5, y + 8)
  tx(slip.province_of_employment, sinW + 1.5, y + 8)
  tx(emp.emp_id ?? '', sinW + provW + 1.5, y + 8)
  y += empRowH

  // Employee address
  if (emp.address) {
    bdr(0, y, sw, 7)
    sf('bold', 6, MID_GRAY)
    tx('Address — Adresse', 1.5, y + 3.5)
    sf('normal', 7.5, BLACK)
    tx(emp.address, 1.5, y + 6)
    y += 7
  }

  y += 2

  // ── Income & deduction boxes grid ─────────────────────────────────────────
  // CRA layout: boxes arranged in a grid, each with a box number label
  // We use 3 columns for the main boxes
  const boxH  = 11
  const col3  = sw / 3
  const col2  = sw / 2

  function drawBox(
    bx: number, by: number, bw: number, bh: number,
    boxNum: string, labelEn: string, labelFr: string, value: string
  ) {
    fr(bx, by, bw, bh, BOX_BG)
    bdr(bx, by, bw, bh)
    // Box number — top left, red
    sf('bold', 7, CRA_RED)
    tx(boxNum, bx + 1.5, by + 4.5)
    // English label
    sf('normal', 5.5, MID_GRAY)
    tx(labelEn, bx + 8, by + 3.5)
    // French label
    sf('normal', 5, [160,160,160] as [number,number,number])
    tx(labelFr, bx + 8, by + 6.5)
    // Value — large, right-aligned
    sf('bold', 9, BLACK)
    tx(value, bx + bw - 1.5, by + bh - 2, { align: 'right' })
  }

  // Row 1: Box 14, 22, 16
  drawBox(0,    y, col3, boxH, '14', 'Employment income', 'Revenus d\'emploi',           fmtAmt(slip.box_14_employment_income))
  drawBox(col3, y, col3, boxH, '22', 'Income tax deducted', 'Impôt sur le revenu retenu', fmtAmt(slip.box_22_income_tax))
  drawBox(col3*2, y, col3, boxH, '16', 'Employee\'s CPP contributions', 'Cotisations de l\'employé au RPC', fmtAmt(slip.box_16_cpp_employee))
  y += boxH

  // Row 2: Box 17, 18, 24
  drawBox(0,    y, col3, boxH, '17', 'Employee\'s CPP2 contributions', 'Cotisations de l\'employé au RPC2', fmtAmt(slip.box_17_cpp2_employee))
  drawBox(col3, y, col3, boxH, '18', 'Employee\'s EI premiums', 'Cotisations de l\'employé à l\'AE', fmtAmt(slip.box_18_ei_premiums))
  drawBox(col3*2, y, col3, boxH, '24', 'EI insurable earnings', 'Gains assurables aux fins de l\'AE', fmtAmt(slip.box_24_ei_insurable))
  y += boxH

  // Row 3: Box 26, 27, 19
  drawBox(0,    y, col3, boxH, '26', 'CPP/QPP pensionable earnings', 'Gains ouvrant droit à pension', fmtAmt(slip.box_26_cpp_pensionable))
  drawBox(col3, y, col3, boxH, '27', 'Employer\'s CPP contributions', 'Cotisations de l\'employeur au RPC', fmtAmt(slip.box_27_cpp_employer))
  drawBox(col3*2, y, col3, boxH, '19', 'Employer\'s EI premiums', 'Cotisations de l\'employeur à l\'AE', fmtAmt(slip.box_19_ei_employer))
  y += boxH

  // Optional boxes — only render if non-zero, 2-column layout
  const optBoxes = [
    { n:'20', en:'RPP contributions',       fr:'Cotisations à un RPA',          v: slip.box_20_rpp_contributions },
    { n:'40', en:'Other taxable allowances',fr:'Autres allocations imposables',  v: slip.box_40_other_taxable },
    { n:'44', en:'Union dues',              fr:'Cotisations syndicales',          v: slip.box_44_union_dues },
    { n:'46', en:'Charitable donations',    fr:'Dons de bienfaisance',            v: slip.box_46_charitable_donations },
    { n:'52', en:'Pension adjustment',      fr:'Facteur d\'équivalence',          v: slip.box_52_pension_adjustment },
    { n:'55', en:'Employee\'s EI rate',     fr:'Taux de cotisation de l\'employé à l\'AE', v: slip.box_55_ei_rate },
  ].filter(b => b.v && b.v > 0)

  for (let i = 0; i < optBoxes.length; i += 2) {
    const left  = optBoxes[i]
    const right = optBoxes[i + 1]
    drawBox(0,    y, col2, boxH, left.n, left.en, left.fr, fmtAmt(left.v as number))
    if (right) drawBox(col2, y, col2, boxH, right.n, right.en, right.fr, fmtAmt(right.v as number))
    y += boxH
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
  if (slip.notes) {
    y += 1
    bdr(0, y, sw, 8)
    sf('bold', 6, MID_GRAY)
    tx('Notes / Remarques', 1.5, y + 3.5)
    sf('normal', 7, BLACK)
    const lines = doc.splitTextToSize(slip.notes, sw - 3)
    doc.text(lines, ox + 1.5, oy + y + 6.5)
    y += 8
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  y = sh - 5
  ln(0, y, sw, y)
  sf('italic', 5.5, MID_GRAY)
  tx(`Generated by StubDesk · ${fmtDate()} · This is not an official CRA document`, sw / 2, y + 3, { align: 'center' })
}

export function generateT4PDF(slip: T4Slip, company: Company, employee: Employee): Blob {
  const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const pageW = 215.9
  const pageH = 279.4
  const margin = 8
  const slipW  = pageW - margin * 2
  const slipH  = (pageH - margin * 3) / 2   // two slips per page

  // Employee copy (top)
  drawT4Slip(doc, slip, company, employee, margin, margin, slipW, slipH, "Employee's copy — Copie de l'employé")

  // Dashed cut line
  doc.setDrawColor(150,150,150); doc.setLineWidth(0.3)
  doc.setLineDashPattern([2,2], 0)
  doc.line(margin, margin + slipH + margin/2, pageW - margin, margin + slipH + margin/2)
  doc.setLineDashPattern([], 0)

  // Employer copy (bottom)
  drawT4Slip(doc, slip, company, employee, margin, margin + slipH + margin, slipW, slipH, "Employer's copy — Copie de l'employeur")

  return doc.output('blob')
}
