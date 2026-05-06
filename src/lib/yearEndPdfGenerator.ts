/**
 * Year-End PDF Generators — T4A and T5
 * Layouts modelled on CRA's official forms (t4a-fill-25e.pdf, t5-fill-25e.pdf)
 *
 * T4A: two copies per page (recipient + payer), red header, bilingual labels
 * T5:  two copies per page (recipient + payer), red header, bilingual labels
 */
import jsPDF from 'jspdf'
import type { T4ASlip, T5Slip, Company } from '@/types/database'

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

// ── Shared slip drawing helpers ───────────────────────────────────────────────
function makeHelpers(doc: jsPDF, ox: number, oy: number) {
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
    doc.text(str || '', ox+x, oy+y, opts)
  const ln = (x1: number, y1: number, x2: number, y2: number, lw = 0.25) => {
    doc.setDrawColor(...BOX_BDR); doc.setLineWidth(lw)
    doc.line(ox+x1, oy+y1, ox+x2, oy+y2)
  }
  return { sf, fr, bdr, tx, ln }
}

function drawSlipHeader(
  doc: jsPDF, ox: number, oy: number, sw: number,
  formCode: string, titleEn: string, titleFr: string,
  taxYear: number, copyLabel: string, status: string
) {
  const { sf, fr, tx } = makeHelpers(doc, ox, oy)
  fr(0, 0, sw, 9, CRA_RED)
  sf('bold', 11, WHITE)
  tx(formCode, 3, 6.5)
  sf('bold', 6.5, WHITE)
  tx(titleEn, 14, 4.5)
  sf('normal', 5.5, [255,220,220] as [number,number,number])
  tx(titleFr, 14, 8)
  sf('bold', 7, WHITE)
  tx(String(taxYear), sw - 3, 6.5, { align: 'right' })
  sf('italic', 5.5, [255,220,220] as [number,number,number])
  tx(copyLabel, sw - 3, 8.5, { align: 'right' })

  // Status badge
  const sc: Record<string, [number,number,number]> = {
    draft: [180,120,0], final: [20,120,60], filed: [60,60,180]
  }
  const badgeColor = sc[status] ?? sc.draft
  doc.setFillColor(...badgeColor)
  doc.rect(ox + 3, oy + 1, 10, 4, 'F')
  sf('bold', 5.5, WHITE)
  tx(status.toUpperCase(), 8, 4, { align: 'center' })
}

function drawPayerRecipientBlock(
  doc: jsPDF, ox: number, oy: number, sw: number,
  payerName: string, payerAddr: string, payerBN: string,
  recipientName: string, recipientAddr: string | null, recipientSIN: string | null
): number {
  const { sf, fr, bdr, tx, ln } = makeHelpers(doc, ox, oy)
  let y = 9

  // Payer
  fr(0, y, sw, 5, [235,235,235] as [number,number,number])
  ln(0, y, sw, y)
  sf('bold', 5.5, MID_GRAY)
  tx("Payer's name and address — Nom et adresse du payeur", 2, y + 3.5)
  y += 5
  bdr(0, y, sw, 11)
  sf('normal', 8, BLACK)
  tx(payerName, 2, y + 5)
  sf('normal', 6.5, DARK_GRAY)
  tx(payerAddr, 2, y + 9)
  if (payerBN) { sf('normal', 6, MID_GRAY); tx(`BN: ${payerBN}`, sw - 2, y + 5, { align: 'right' }) }
  y += 11

  // Recipient
  fr(0, y, sw, 5, [235,235,235] as [number,number,number])
  ln(0, y, sw, y)
  sf('bold', 5.5, MID_GRAY)
  tx("Recipient's name — Nom du bénéficiaire", 2, y + 3.5)
  y += 5

  const col2 = sw / 2
  bdr(0, y, col2, 9); bdr(col2, y, col2, 9)
  sf('bold', 5.5, MID_GRAY)
  tx('Name — Nom', 2, y + 3.5)
  tx('SIN — NAS', col2 + 2, y + 3.5)
  sf('normal', 8, BLACK)
  tx(recipientName, 2, y + 7.5)
  tx(recipientSIN ?? '', col2 + 2, y + 7.5)
  y += 9

  if (recipientAddr) {
    bdr(0, y, sw, 7)
    sf('bold', 5.5, MID_GRAY)
    tx('Address — Adresse', 2, y + 3.5)
    sf('normal', 7, BLACK)
    tx(recipientAddr, 2, y + 6.5)
    y += 7
  }

  return y + 2
}

function drawBoxGrid(
  doc: jsPDF, ox: number, oy: number, sw: number, startY: number,
  boxes: { n: string; en: string; fr: string; v: string }[],
  cols: number
): number {
  const { sf, fr, bdr, tx } = makeHelpers(doc, ox, oy)
  const boxH = 11
  const boxW = sw / cols
  let y = startY

  for (let i = 0; i < boxes.length; i += cols) {
    for (let c = 0; c < cols; c++) {
      const b = boxes[i + c]
      if (!b) continue
      const bx = c * boxW
      fr(bx, y, boxW, boxH, BOX_BG)
      bdr(bx, y, boxW, boxH)
      sf('bold', 7, CRA_RED)
      tx(b.n, bx + 1.5, y + 4.5)
      sf('normal', 5.5, MID_GRAY)
      tx(b.en, bx + 9, y + 3.5)
      sf('normal', 5, [160,160,160] as [number,number,number])
      tx(b.fr, bx + 9, y + 6.5)
      sf('bold', 9, BLACK)
      tx(b.v, bx + boxW - 1.5, y + boxH - 2, { align: 'right' })
    }
    y += boxH
  }
  return y
}

// ── T4A ───────────────────────────────────────────────────────────────────────
function drawT4ASlip(
  doc: jsPDF, slip: T4ASlip, co: Company,
  ox: number, oy: number, sw: number, sh: number, copyLabel: string
) {
  const { sf, tx, ln } = makeHelpers(doc, ox, oy)

  doc.setDrawColor(...BOX_BDR); doc.setLineWidth(0.4)
  doc.rect(ox, oy, sw, sh)

  drawSlipHeader(doc, ox, oy, sw,
    'T4A',
    'Statement of Pension, Retirement, Annuity, and Other Income',
    'État du revenu de pension, de retraite, de rente ou d\'autres sources',
    slip.tax_year, copyLabel, slip.status
  )

  let y = drawPayerRecipientBlock(
    doc, ox, oy, sw,
    co.name,
    `${co.street}, ${co.city}, ${co.province}  ${co.postal}`,
    co.cra_bn ?? '',
    slip.recipient_name,
    slip.recipient_address,
    slip.recipient_sin
  )

  // All T4A boxes — only render non-zero
  const allBoxes = [
    { n:'016', en:'Pension or superannuation',          fr:'Pension ou retraite',                    v: fmtAmt(slip.box_16_pension) },
    { n:'018', en:'Lump-sum payments',                  fr:'Paiements forfaitaires',                 v: fmtAmt(slip.box_18_lump_sum) },
    { n:'020', en:'Self-employed commissions',          fr:'Commissions d\'un travail indépendant',  v: fmtAmt(slip.box_20_self_employed) },
    { n:'022', en:'Income tax deducted',                fr:'Impôt sur le revenu retenu',             v: fmtAmt(slip.box_22_income_tax) },
    { n:'024', en:'Annuities',                          fr:'Rentes',                                 v: fmtAmt(slip.box_24_annuities) },
    { n:'028', en:'Other income',                       fr:'Autres revenus',                         v: fmtAmt(slip.box_28_other_income) },
    { n:'048', en:'Fees for services',                  fr:'Honoraires ou autres sommes',            v: fmtAmt(slip.box_48_fees_services) },
    { n:'030', en:'Patronage allocations',              fr:'Ristournes',                             v: fmtAmt(slip.box_30_patronage) },
    { n:'032', en:'RPP contributions',                  fr:'Cotisations à un RPA',                   v: fmtAmt(slip.box_32_rpp) },
    { n:'034', en:'Pension adjustment',                 fr:'Facteur d\'équivalence',                 v: fmtAmt(slip.box_34_pension_adj) },
    { n:'040', en:'Research grants',                    fr:'Subventions de recherche',               v: fmtAmt(slip.box_40_research) },
    { n:'042', en:'Reimbursements / awards',            fr:'Remboursements / prix',                  v: fmtAmt(slip.box_42_reimbursements) },
    { n:'046', en:'Charitable donations',               fr:'Dons de bienfaisance',                   v: fmtAmt(slip.box_46_charitable) },
  ].filter(b => b.v !== '')

  y = drawBoxGrid(doc, ox, oy, sw, y, allBoxes, 3)

  if (slip.notes) {
    const { bdr } = makeHelpers(doc, ox, oy)
    bdr(0, y, sw, 8)
    sf('bold', 5.5, MID_GRAY)
    tx('Notes', 1.5, y + 3.5)
    sf('normal', 7, BLACK)
    const lines = doc.splitTextToSize(slip.notes, sw - 3)
    doc.text(lines, ox + 1.5, oy + y + 6.5)
    y += 8
  }

  y = sh - 5
  ln(0, y, sw, y)
  sf('italic', 5, MID_GRAY)
  tx(`Generated by StubDesk · ${fmtDate()} · Not an official CRA document`, sw / 2, y + 3, { align: 'center' })
}

export function generateT4APDF(slip: T4ASlip, co: Company): Blob {
  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const pageW  = 215.9
  const pageH  = 279.4
  const margin = 8
  const slipW  = pageW - margin * 2
  const slipH  = (pageH - margin * 3) / 2

  drawT4ASlip(doc, slip, co, margin, margin, slipW, slipH, "Recipient's copy — Copie du bénéficiaire")

  doc.setDrawColor(150,150,150); doc.setLineWidth(0.3)
  doc.setLineDashPattern([2,2], 0)
  doc.line(margin, margin + slipH + margin/2, pageW - margin, margin + slipH + margin/2)
  doc.setLineDashPattern([], 0)

  drawT4ASlip(doc, slip, co, margin, margin + slipH + margin, slipW, slipH, "Payer's copy — Copie du payeur")

  return doc.output('blob')
}

// ── T5 ────────────────────────────────────────────────────────────────────────
function drawT5Slip(
  doc: jsPDF, slip: T5Slip, co: Company,
  ox: number, oy: number, sw: number, sh: number, copyLabel: string
) {
  const { sf, tx, ln } = makeHelpers(doc, ox, oy)

  doc.setDrawColor(...BOX_BDR); doc.setLineWidth(0.4)
  doc.rect(ox, oy, sw, sh)

  drawSlipHeader(doc, ox, oy, sw,
    'T5',
    'Statement of Investment Income',
    'État des revenus de placements',
    slip.tax_year, copyLabel, slip.status
  )

  let y = drawPayerRecipientBlock(
    doc, ox, oy, sw,
    co.name,
    `${co.street}, ${co.city}, ${co.province}  ${co.postal}`,
    co.cra_bn ?? '',
    slip.recipient_name,
    slip.recipient_address,
    slip.recipient_sin
  )

  // T5 boxes — CRA layout groups dividends together
  const allBoxes = [
    // Eligible dividends group
    { n:'10', en:'Actual amount of eligible dividends',   fr:'Montant réel des dividendes déterminés',    v: fmtAmt(slip.box_10_eligible_dividends) },
    { n:'11', en:'Taxable amount of eligible dividends',  fr:'Montant imposable des dividendes déterminés', v: fmtAmt(slip.box_11_taxable_eligible) },
    { n:'12', en:'Dividend tax credit for eligible div.', fr:'Crédit d\'impôt pour dividendes déterminés', v: fmtAmt(slip.box_12_dividend_tax_credit) },
    // Ineligible dividends group
    { n:'24', en:'Actual amount of ineligible dividends', fr:'Montant réel des dividendes non déterminés', v: fmtAmt(slip.box_24_ineligible_dividends) },
    { n:'25', en:'Taxable amount of ineligible dividends',fr:'Montant imposable des dividendes non déterminés', v: fmtAmt(slip.box_25_taxable_ineligible) },
    { n:'26', en:'Dividend tax credit for ineligible div.',fr:'Crédit d\'impôt pour dividendes non déterminés', v: fmtAmt(slip.box_26_ineligible_tax_credit) },
    // Other income
    { n:'13', en:'Interest from Canadian sources',        fr:'Intérêts de sources canadiennes',           v: fmtAmt(slip.box_13_interest) },
    { n:'14', en:'Other income from Canadian sources',    fr:'Autres revenus de sources canadiennes',     v: fmtAmt(slip.box_14_other_income) },
    { n:'15', en:'Foreign income',                        fr:'Revenus étrangers',                         v: fmtAmt(slip.box_15_foreign_income) },
    { n:'16', en:'Foreign tax paid',                      fr:'Impôt étranger payé',                       v: fmtAmt(slip.box_16_foreign_tax) },
    { n:'17', en:'Royalties from Canadian sources',       fr:'Redevances de sources canadiennes',         v: fmtAmt(slip.box_17_royalties) },
    { n:'18', en:'Capital gains dividends',               fr:'Dividendes sur gains en capital',           v: fmtAmt(slip.box_18_capital_gains_dividends) },
    { n:'21', en:'Report code',                           fr:'Code du feuillet',                          v: fmtAmt(slip.box_21_acb_adjustment) },
  ].filter(b => b.v !== '')

  y = drawBoxGrid(doc, ox, oy, sw, y, allBoxes, 3)

  if (slip.notes) {
    const { bdr } = makeHelpers(doc, ox, oy)
    bdr(0, y, sw, 8)
    sf('bold', 5.5, MID_GRAY)
    tx('Notes', 1.5, y + 3.5)
    sf('normal', 7, BLACK)
    const lines = doc.splitTextToSize(slip.notes, sw - 3)
    doc.text(lines, ox + 1.5, oy + y + 6.5)
    y += 8
  }

  y = sh - 5
  ln(0, y, sw, y)
  sf('italic', 5, MID_GRAY)
  tx(`Generated by StubDesk · ${fmtDate()} · Not an official CRA document`, sw / 2, y + 3, { align: 'center' })
}

export function generateT5PDF(slip: T5Slip, co: Company): Blob {
  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const pageW  = 215.9
  const pageH  = 279.4
  const margin = 8
  const slipW  = pageW - margin * 2
  const slipH  = (pageH - margin * 3) / 2

  drawT5Slip(doc, slip, co, margin, margin, slipW, slipH, "Recipient's copy — Copie du bénéficiaire")

  doc.setDrawColor(150,150,150); doc.setLineWidth(0.3)
  doc.setLineDashPattern([2,2], 0)
  doc.line(margin, margin + slipH + margin/2, pageW - margin, margin + slipH + margin/2)
  doc.setLineDashPattern([], 0)

  drawT5Slip(doc, slip, co, margin, margin + slipH + margin, slipW, slipH, "Payer's copy — Copie du payeur")

  return doc.output('blob')
}
