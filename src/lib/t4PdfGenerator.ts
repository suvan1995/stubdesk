import jsPDF from 'jspdf'
import type { T4Slip, Company, Employee } from '@/types/database'

function fmtMoney(n: number | null | undefined): string {
  if (!n || n === 0) return '$0.00'
  return '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(): string {
  return new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function generateT4PDF(slip: T4Slip, company: Company, employee: Employee): Blob {
  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const pageW  = 215.9
  const margin = 14
  const fullW  = pageW - margin * 2
  const colW   = fullW / 2
  let y        = margin

  const blue  = [26, 82, 118]  as [number,number,number]
  const white = [255,255,255]  as [number,number,number]
  const black = [30, 30, 30]   as [number,number,number]
  const gray  = [100,100,100]  as [number,number,number]
  const lgray = [240,242,245]  as [number,number,number]
  const bdr   = [200,205,210]  as [number,number,number]

  const sf = (style: string, size: number, color: [number,number,number] = black) => {
    doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor(...color)
  }
  const fr = (x: number, yy: number, w: number, h: number, color: [number,number,number]) => {
    doc.setFillColor(...color); doc.rect(x, yy, w, h, 'F')
  }
  const tx = (str: string, x: number, yy: number, opts?: object) => doc.text(str || '', x, yy, opts)
  const bx = (x: number, yy: number, w: number, h: number) => {
    doc.setDrawColor(...bdr); doc.setLineWidth(0.3); doc.rect(x, yy, w, h)
  }

  // ── Header ────────────────────────────────────────────────────────────────
  fr(0, 0, pageW, 22, blue)
  sf('bold', 16, white)
  tx('T4', margin, 10)
  sf('normal', 8, [200,215,235] as [number,number,number])
  tx('Statement of Remuneration Paid', margin, 16)
  sf('bold', 10, white)
  tx(`${slip.tax_year} Tax Year`, pageW - margin, 10, { align: 'right' })
  sf('normal', 7, [200,215,235] as [number,number,number])
  tx('Canada Revenue Agency', pageW - margin, 16, { align: 'right' })

  // Status badge
  const sc: Record<string, [number,number,number]> = {
    draft: [245,158,11], final: [16,185,129], filed: [99,102,241]
  }
  fr(pageW - margin - 24, 1, 24, 7, sc[slip.status] ?? sc.draft)
  sf('bold', 7, white)
  tx(slip.status.toUpperCase(), pageW - margin - 12, 6, { align: 'center' })

  y = 27

  // ── Employer ──────────────────────────────────────────────────────────────
  fr(margin, y, fullW, 7, lgray)
  bx(margin, y, fullW, 7)
  sf('bold', 7.5, gray)
  tx('EMPLOYER', margin + 3, y + 5)
  y += 7

  bx(margin, y, colW, 10); bx(margin + colW, y, colW, 10)
  sf('bold', 6.5, gray)
  tx('Employer Name', margin + 2.5, y + 4)
  tx('CRA Business Number', margin + colW + 2.5, y + 4)
  sf('normal', 8.5, black)
  tx(company.name, margin + 2.5, y + 8.5)
  tx(company.cra_bn ?? 'Not set', margin + colW + 2.5, y + 8.5)
  y += 10

  bx(margin, y, fullW, 7)
  sf('normal', 7.5, gray)
  tx(`${company.street}, ${company.city}, ${company.province}  ${company.postal}`, margin + 2.5, y + 5)
  y += 7

  // ── Employee ──────────────────────────────────────────────────────────────
  fr(margin, y, fullW, 7, lgray)
  bx(margin, y, fullW, 7)
  sf('bold', 7.5, gray)
  tx('EMPLOYEE', margin + 3, y + 5)
  y += 7

  bx(margin, y, colW, 10); bx(margin + colW, y, colW, 10)
  sf('bold', 6.5, gray)
  tx('Employee Name', margin + 2.5, y + 4)
  tx('SIN (Box 12)', margin + colW + 2.5, y + 4)
  sf('normal', 8.5, black)
  tx(employee.name, margin + 2.5, y + 8.5)
  tx(slip.box_54_sin ?? (employee.sin_last3 ? `***-***-${employee.sin_last3}` : 'Not provided'), margin + colW + 2.5, y + 8.5)
  y += 10

  bx(margin, y, colW, 10); bx(margin + colW, y, colW, 10)
  sf('bold', 6.5, gray)
  tx('Province of Employment', margin + 2.5, y + 4)
  tx('Employee ID', margin + colW + 2.5, y + 4)
  sf('normal', 8.5, black)
  tx(slip.province_of_employment, margin + 2.5, y + 8.5)
  tx(employee.emp_id ?? 'N/A', margin + colW + 2.5, y + 8.5)
  y += 10

  if (employee.address) {
    bx(margin, y, fullW, 7)
    sf('normal', 7.5, gray)
    tx(employee.address, margin + 2.5, y + 5)
    y += 7
  }

  y += 3

  // ── Core income & deduction boxes ─────────────────────────────────────────
  fr(margin, y, fullW, 7, lgray)
  bx(margin, y, fullW, 7)
  sf('bold', 7.5, gray)
  tx('INCOME & DEDUCTIONS', margin + 3, y + 5)
  y += 7

  const coreBoxes = [
    { box:'14', label:'Employment Income',          val: slip.box_14_employment_income },
    { box:'22', label:'Income Tax Deducted',        val: slip.box_22_income_tax },
    { box:'16', label:'Employee CPP Contributions', val: slip.box_16_cpp_employee },
    { box:'17', label:'Employee CPP2 Contributions',val: slip.box_17_cpp2_employee },
    { box:'18', label:'Employee EI Premiums',       val: slip.box_18_ei_premiums },
    { box:'24', label:'EI Insurable Earnings',      val: slip.box_24_ei_insurable },
    { box:'26', label:'CPP Pensionable Earnings',   val: slip.box_26_cpp_pensionable },
    { box:'27', label:'Employer CPP Contributions', val: slip.box_27_cpp_employer },
    { box:'19', label:'Employer EI Premiums',       val: slip.box_19_ei_employer },
  ]

  for (let i = 0; i < coreBoxes.length; i += 2) {
    const left  = coreBoxes[i]
    const right = coreBoxes[i + 1]
    bx(margin, y, colW, 10)
    sf('bold', 6.5, gray)
    tx(`Box ${left.box}  ${left.label}`, margin + 2.5, y + 4)
    sf('normal', 9, black)
    tx(fmtMoney(left.val), margin + 2.5, y + 8.5)
    if (right) {
      bx(margin + colW, y, colW, 10)
      sf('bold', 6.5, gray)
      tx(`Box ${right.box}  ${right.label}`, margin + colW + 2.5, y + 4)
      sf('normal', 9, black)
      tx(fmtMoney(right.val), margin + colW + 2.5, y + 8.5)
    }
    y += 10
  }

  // ── Optional boxes (only if non-zero) ─────────────────────────────────────
  const optBoxes = [
    { box:'20', label:'RPP Contributions',       val: slip.box_20_rpp_contributions },
    { box:'40', label:'Other Taxable Allowances',val: slip.box_40_other_taxable },
    { box:'44', label:'Union Dues',              val: slip.box_44_union_dues },
    { box:'46', label:'Charitable Donations',    val: slip.box_46_charitable_donations },
    { box:'52', label:'Pension Adjustment',      val: slip.box_52_pension_adjustment },
  ].filter(b => b.val && b.val > 0)

  if (optBoxes.length > 0) {
    y += 2
    fr(margin, y, fullW, 7, lgray)
    bx(margin, y, fullW, 7)
    sf('bold', 7.5, gray)
    tx('ADDITIONAL BOXES', margin + 3, y + 5)
    y += 7

    for (let i = 0; i < optBoxes.length; i += 2) {
      const left  = optBoxes[i]
      const right = optBoxes[i + 1]
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
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
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

  // ── Footer ────────────────────────────────────────────────────────────────
  y += 5
  doc.setDrawColor(...bdr); doc.setLineWidth(0.3)
  doc.line(margin, y, pageW - margin, y)
  y += 4
  sf('italic', 7.5, gray)
  tx(`Generated by StubDesk on ${fmtDate()}  |  ${company.name}  |  ${employee.name}  |  ${slip.tax_year} T4`, margin, y)

  return doc.output('blob')
}
