import jsPDF from 'jspdf'
import type { T4ASlip, T5Slip, Company } from '@/types/database'

function fmtMoney(n: number | null | undefined): string {
  if (!n) return '$0.00'
  return '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(): string {
  return new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
}

// ── Shared PDF helpers ────────────────────────────────────────────────────────
function createDoc() {
  return new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
}

function drawSlipHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  company: Company,
  recipientName: string,
  recipientAddress: string | null,
  recipientSIN: string | null,
  taxYear: number,
  status: string,
  accentColor: [number, number, number]
) {
  const pageW  = 215.9
  const margin = 14
  const white  = [255,255,255] as [number,number,number]
  const gray   = [100,100,100] as [number,number,number]
  const black  = [30,30,30]   as [number,number,number]
  const lgray  = [240,242,245] as [number,number,number]
  const bdr    = [200,205,210] as [number,number,number]

  const sf = (style: string, size: number, color: [number,number,number] = black) => {
    doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor(...color)
  }
  const fr = (x: number, y: number, w: number, h: number, color: [number,number,number]) => {
    doc.setFillColor(...color); doc.rect(x, y, w, h, 'F')
  }
  const tx = (str: string, x: number, y: number, opts?: object) => doc.text(str || '', x, y, opts)
  const bx = (x: number, y: number, w: number, h: number) => {
    doc.setDrawColor(...bdr); doc.setLineWidth(0.3); doc.rect(x, y, w, h)
  }

  // Header bar
  fr(0, 0, pageW, 22, accentColor)
  sf('bold', 16, white)
  tx(title, margin, 10)
  sf('normal', 8, [220,230,245] as [number,number,number])
  tx(subtitle, margin, 16)
  sf('bold', 10, white)
  tx(`${taxYear} Tax Year`, pageW - margin, 10, { align: 'right' })
  sf('normal', 7, [220,230,245] as [number,number,number])
  tx('Canada Revenue Agency', pageW - margin, 16, { align: 'right' })

  // Status badge
  const sc: Record<string, [number,number,number]> = {
    draft: [245,158,11], final: [16,185,129], filed: [99,102,241]
  }
  fr(pageW - margin - 24, 1, 24, 7, sc[status] ?? sc.draft)
  sf('bold', 7, white)
  tx(status.toUpperCase(), pageW - margin - 12, 6, { align: 'center' })

  let y = 27

  // Payer / Recipient boxes
  fr(margin, y, pageW - margin * 2, 7, lgray)
  bx(margin, y, pageW - margin * 2, 7)
  sf('bold', 7.5, gray)
  tx('PAYER (EMPLOYER)', margin + 3, y + 5)
  y += 7

  const halfW = (pageW - margin * 2) / 2
  bx(margin, y, halfW, 10)
  bx(margin + halfW, y, halfW, 10)
  sf('bold', 6.5, gray)
  tx('Company Name', margin + 2.5, y + 4)
  tx('CRA Business Number', margin + halfW + 2.5, y + 4)
  sf('normal', 8.5, black)
  tx(company.name, margin + 2.5, y + 8.5)
  tx(company.cra_bn ?? 'Not set', margin + halfW + 2.5, y + 8.5)
  y += 10

  bx(margin, y, pageW - margin * 2, 7)
  sf('normal', 7.5, gray)
  tx(`${company.street}, ${company.city}, ${company.province}  ${company.postal}`, margin + 2.5, y + 5)
  y += 7

  fr(margin, y, pageW - margin * 2, 7, lgray)
  bx(margin, y, pageW - margin * 2, 7)
  sf('bold', 7.5, gray)
  tx('RECIPIENT', margin + 3, y + 5)
  y += 7

  bx(margin, y, halfW, 10)
  bx(margin + halfW, y, halfW, 10)
  sf('bold', 6.5, gray)
  tx('Recipient Name', margin + 2.5, y + 4)
  tx('SIN', margin + halfW + 2.5, y + 4)
  sf('normal', 8.5, black)
  tx(recipientName, margin + 2.5, y + 8.5)
  tx(recipientSIN ?? 'Not provided', margin + halfW + 2.5, y + 8.5)
  y += 10

  if (recipientAddress) {
    bx(margin, y, pageW - margin * 2, 7)
    sf('normal', 7.5, gray)
    tx(recipientAddress, margin + 2.5, y + 5)
    y += 7
  }

  return { y: y + 3, sf, fr, tx, bx, pageW, margin, black, gray, lgray, bdr, white }
}

// ── T4A PDF ───────────────────────────────────────────────────────────────────
export function generateT4APDF(slip: T4ASlip, company: Company): Blob {
  const doc = createDoc()
  const purple: [number,number,number] = [88, 28, 135]

  const ctx = drawSlipHeader(
    doc, 'T4A', 'Statement of Pension, Retirement, Annuity & Other Income',
    company, slip.recipient_name, slip.recipient_address,
    slip.recipient_sin, slip.tax_year, slip.status, purple
  )

  let { y } = ctx
  const { sf, fr, tx, bx, pageW, margin, black, gray, lgray } = ctx
  const fullW = pageW - margin * 2
  const colW  = fullW / 2

  // Section header
  fr(margin, y, fullW, 7, lgray)
  bx(margin, y, fullW, 7)
  sf('bold', 7.5, gray)
  tx('INCOME BOXES', margin + 3, y + 5)
  y += 7

  const boxes = [
    { box:'048', label:'Fees for Services',          val: slip.box_48_fees_services },
    { box:'020', label:'Self-Employment Commissions', val: slip.box_20_self_employed },
    { box:'022', label:'Income Tax Deducted',         val: slip.box_22_income_tax },
    { box:'016', label:'Pension or Superannuation',   val: slip.box_16_pension },
    { box:'018', label:'Lump-Sum Payments',           val: slip.box_18_lump_sum },
    { box:'024', label:'Annuities',                   val: slip.box_24_annuities },
    { box:'028', label:'Other Income',                val: slip.box_28_other_income },
    { box:'030', label:'Patronage Allocations',       val: slip.box_30_patronage },
    { box:'032', label:'RPP Contributions',           val: slip.box_32_rpp },
    { box:'034', label:'Pension Adjustment',          val: slip.box_34_pension_adj },
    { box:'040', label:'Research Grants',             val: slip.box_40_research },
    { box:'042', label:'Reimbursements / Awards',     val: slip.box_42_reimbursements },
    { box:'046', label:'Charitable Donations',        val: slip.box_46_charitable },
  ].filter(b => b.val && b.val > 0)

  for (let i = 0; i < boxes.length; i += 2) {
    const left  = boxes[i]
    const right = boxes[i + 1]
    bx(margin, y, colW, 10)
    sf('bold', 6.5, gray)
    tx(`Box ${left.box}  ${left.label}`, margin + 2.5, y + 4)
    sf('normal', 9, black)
    tx(fmtMoney(left.val as number), margin + 2.5, y + 8.5)
    if (right) {
      bx(margin + colW, y, colW, 10)
      sf('bold', 6.5, gray)
      tx(`Box ${right.box}  ${right.label}`, margin + colW + 2.5, y + 4)
      sf('normal', 9, black)
      tx(fmtMoney(right.val as number), margin + colW + 2.5, y + 8.5)
    }
    y += 10
  }

  if (slip.notes) {
    y += 3
    bx(margin, y, fullW, 12)
    sf('bold', 6.5, gray)
    tx('Notes', margin + 2.5, y + 4)
    sf('normal', 8, black)
    const lines = doc.splitTextToSize(slip.notes, fullW - 5)
    doc.text(lines, margin + 2.5, y + 8.5)
    y += 12
  }

  y += 5
  doc.setDrawColor(200, 205, 210); doc.setLineWidth(0.3)
  doc.line(margin, y, pageW - margin, y)
  y += 4
  sf('italic', 7.5, gray)
  tx(`Generated by StubDesk on ${fmtDate()}  |  ${company.name}  |  ${slip.tax_year} T4A`, margin, y)

  return doc.output('blob')
}

// ── T5 PDF ────────────────────────────────────────────────────────────────────
export function generateT5PDF(slip: T5Slip, company: Company): Blob {
  const doc = createDoc()
  const green: [number,number,number] = [20, 83, 45]

  const ctx = drawSlipHeader(
    doc, 'T5', 'Statement of Investment Income',
    company, slip.recipient_name, slip.recipient_address,
    slip.recipient_sin, slip.tax_year, slip.status, green
  )

  let { y } = ctx
  const { sf, fr, tx, bx, pageW, margin, black, gray, lgray } = ctx
  const fullW = pageW - margin * 2
  const colW  = fullW / 3

  const sections = [
    {
      title: 'Eligible Dividends',
      boxes: [
        { box:'10', label:'Actual Eligible Dividends',    val: slip.box_10_eligible_dividends },
        { box:'11', label:'Taxable Amount',               val: slip.box_11_taxable_eligible },
        { box:'12', label:'Dividend Tax Credit',          val: slip.box_12_dividend_tax_credit },
      ],
    },
    {
      title: 'Ineligible Dividends',
      boxes: [
        { box:'24', label:'Actual Ineligible Dividends',  val: slip.box_24_ineligible_dividends },
        { box:'25', label:'Taxable Amount',               val: slip.box_25_taxable_ineligible },
        { box:'26', label:'Dividend Tax Credit',          val: slip.box_26_ineligible_tax_credit },
      ],
    },
    {
      title: 'Other Investment Income',
      boxes: [
        { box:'13', label:'Interest',                     val: slip.box_13_interest },
        { box:'14', label:'Other Income',                 val: slip.box_14_other_income },
        { box:'15', label:'Foreign Income',               val: slip.box_15_foreign_income },
        { box:'16', label:'Foreign Tax Paid',             val: slip.box_16_foreign_tax },
        { box:'17', label:'Royalties',                    val: slip.box_17_royalties },
        { box:'18', label:'Capital Gains Dividends',      val: slip.box_18_capital_gains_dividends },
      ].filter(b => b.val && b.val > 0),
    },
  ]

  for (const section of sections) {
    if (section.boxes.length === 0) continue
    y += 2
    fr(margin, y, fullW, 7, lgray)
    bx(margin, y, fullW, 7)
    sf('bold', 7.5, gray)
    tx(section.title.toUpperCase(), margin + 3, y + 5)
    y += 7

    // 3-column layout for dividend sections, 2-column for others
    const cols = section.boxes.length === 3 ? 3 : 2
    const cw   = fullW / cols
    for (let i = 0; i < section.boxes.length; i += cols) {
      for (let j = 0; j < cols; j++) {
        const b = section.boxes[i + j]
        if (!b) continue
        bx(margin + j * cw, y, cw, 10)
        sf('bold', 6.5, gray)
        tx(`Box ${b.box}  ${b.label}`, margin + j * cw + 2.5, y + 4)
        sf('normal', 9, black)
        tx(fmtMoney(b.val), margin + j * cw + 2.5, y + 8.5)
      }
      y += 10
    }
  }

  if (slip.notes) {
    y += 3
    bx(margin, y, fullW, 12)
    sf('bold', 6.5, gray)
    tx('Notes', margin + 2.5, y + 4)
    sf('normal', 8, black)
    const lines = doc.splitTextToSize(slip.notes, fullW - 5)
    doc.text(lines, margin + 2.5, y + 8.5)
    y += 12
  }

  y += 5
  doc.setDrawColor(200, 205, 210); doc.setLineWidth(0.3)
  doc.line(margin, y, pageW - margin, y)
  y += 4
  sf('italic', 7.5, gray)
  tx(`Generated by StubDesk on ${fmtDate()}  |  ${company.name}  |  ${slip.tax_year} T5`, margin, y)

  // suppress unused warning
  void colW

  return doc.output('blob')
}
