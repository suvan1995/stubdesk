import jsPDF from 'jspdf'
import type { PayslipResult } from '@/types/payroll'
import type { Company, Employee } from '@/types/database'
import { fmtCAD } from './payrollEngine'

// Template colour palettes — mirrors the HTML app
const TEMPLATES: Record<number, {
  primary: number[]; netBg: number[]; sectionBg: number[]
  rowHL: number[]; border: number[]; headerText: number[]
  subText: number[]; tableHeader: number[]
}> = {
  1: { primary:[26,82,118],   netBg:[30,132,73],   sectionBg:[240,243,247], rowHL:[232,240,248], border:[213,216,220], headerText:[255,255,255], subText:[200,220,240], tableHeader:[26,82,118]  },
  2: { primary:[22,33,62],    netBg:[183,28,28],   sectionBg:[30,30,50],   rowHL:[40,40,65],   border:[60,60,90],   headerText:[255,255,255], subText:[180,190,220], tableHeader:[22,33,62]   },
  3: { primary:[27,94,32],    netBg:[46,125,50],   sectionBg:[241,248,233], rowHL:[220,237,200], border:[197,225,165], headerText:[255,255,255], subText:[200,230,201], tableHeader:[27,94,32]   },
  4: { primary:[55,71,79],    netBg:[69,90,100],   sectionBg:[245,245,245], rowHL:[232,234,237], border:[224,224,224], headerText:[255,255,255], subText:[200,210,215], tableHeader:[55,71,79]   },
  5: { primary:[106,27,77],   netBg:[136,14,79],   sectionBg:[252,228,236], rowHL:[248,187,208], border:[248,187,208], headerText:[255,255,255], subText:[248,187,208], tableHeader:[106,27,77]  },
}

export interface PayslipPDFOptions {
  result:       PayslipResult
  company:      Company
  employee:     Employee
  periodStart:  string
  periodEnd:    string
  payDate:      string
  payMethod:    'eft' | 'cheque'
  chequeNumber: string
  chequeDate:   string
  vacType:      'accruing' | 'included'
  vacRate:      number
  overtimeMult: number
  notes:        string
  template:     number
  logoDataURL:  string | null
}

function fmtDateDisplay(str: string): string {
  if (!str) return ''
  const [y, m, d] = str.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(m)-1]} ${parseInt(d)}, ${y}`
}

function fmtToday(): string {
  const d = new Date()
  return fmtDateDisplay(
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  )
}

export function generatePayslipPDF(opts: PayslipPDFOptions): Blob {
  const { result, company, employee, template: tplNum } = opts
  const T = TEMPLATES[tplNum] ?? TEMPLATES[1]

  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const pageW  = 215.9
  const margin = 15
  const fullW  = pageW - margin * 2
  const colW   = fullW / 2
  const white  = [255,255,255]
  const black  = [44,62,80]
  const gray   = [127,140,141]
  let y        = margin

  // ── helpers ──────────────────────────────────────────────────
  const sf = (style: string, size: number, color: number[] = black) => {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(...(color as [number,number,number]))
  }
  const fr = (x: number, yy: number, w: number, h: number, color: number[]) => {
    doc.setFillColor(...(color as [number,number,number]))
    doc.rect(x, yy, w, h, 'F')
  }
  const tx = (str: string, x: number, yy: number, opts?: object) =>
    doc.text(str || '', x, yy, opts)
  const hr = (yy: number) => {
    doc.setDrawColor(...(T.border as [number,number,number]))
    doc.setLineWidth(0.3)
    doc.line(margin, yy, pageW - margin, yy)
  }

  // ── HEADER ───────────────────────────────────────────────────
  fr(0, 0, pageW, 28, T.primary)
  let logoEndX = margin
  if (opts.logoDataURL) {
    try {
      const ext = opts.logoDataURL.substring(
        opts.logoDataURL.indexOf('/')+1,
        opts.logoDataURL.indexOf(';')
      ).toUpperCase().replace('SVG+XML','PNG')
      doc.addImage(opts.logoDataURL, ext === 'JPG' ? 'JPEG' : ext, margin, 3, 22, 22)
      logoEndX = margin + 26
    } catch { /* skip bad logo */ }
  }
  sf('bold', 15, T.headerText as number[])
  tx(company.name, logoEndX, 11)
  sf('normal', 8, T.subText as number[])
  tx([company.street, `${company.city}, ${company.province}  ${company.postal}`].join('  |  '), logoEndX, 17)
  if (company.cra_bn) tx(`CRA BN: ${company.cra_bn}`, logoEndX, 22)
  y = 33

  // ── EMPLOYEE / PERIOD INFO ────────────────────────────────────
  const payDateLabel = opts.payMethod === 'cheque'
    ? `${fmtDateDisplay(opts.chequeDate)}  (cheque #${opts.chequeNumber})`
    : `${fmtDateDisplay(opts.payDate)}  (EFT deposit)`

  const infoLines: [string, string, string, string][] = [
    ['Employee:',  employee.name,                    'Employee ID:', employee.emp_id ?? 'N/A'],
    ['Province:',  company.province,                 'Pay Date:',    payDateLabel],
    ['Pay Period:', `${fmtDateDisplay(opts.periodStart)} to ${fmtDateDisplay(opts.periodEnd)}`, 'Payment:', opts.payMethod === 'cheque' ? 'Cheque' : 'Direct Deposit (EFT)'],
  ]
  if (employee.job_title || employee.department) {
    infoLines.push(['Title/Dept:', [employee.job_title, employee.department].filter(Boolean).join(' · '), '', ''])
  }

  const infoH = infoLines.length * 6 + 4
  fr(margin, y, fullW, infoH, T.sectionBg)
  doc.setDrawColor(...(T.border as [number,number,number]))
  doc.setLineWidth(0.3)
  doc.rect(margin, y, fullW, infoH)

  infoLines.forEach((row, i) => {
    const iy = y + 6 + i * 6
    sf('bold', 9, black); tx(row[0], margin+3, iy)
    sf('normal', 9, black); tx(row[1], margin+24, iy)
    if (row[2]) { sf('bold', 9, black); tx(row[2], margin+colW+3, iy) }
    if (row[3]) { sf('normal', 9, black); tx(row[3], margin+colW+24, iy) }
  })
  y += infoH + 4

  // ── TABLE ─────────────────────────────────────────────────────
  const labelW = fullW * 0.55
  const amtW   = fullW * 0.225
  const rowH   = 6.5

  const sectionHead = (label: string) => {
    fr(margin, y, fullW, 6, T.sectionBg)
    doc.setDrawColor(...(T.border as [number,number,number])); doc.setLineWidth(0.2)
    doc.rect(margin, y, fullW, 6)
    sf('bold', 7.5, gray as number[])
    tx(label.toUpperCase(), margin+3, y+4.3)
    y += 6
  }

  const tableRow = (label: string, period: number, ytd: number | null, bold: boolean, bg?: number[]) => {
    fr(margin, y, fullW, rowH, bg ?? white)
    sf(bold ? 'bold' : 'normal', 8.5, bold ? T.primary as number[] : black)
    tx(label, margin+3, y+4.5)
    tx(fmtCAD(period), margin+labelW+amtW-3, y+4.5, { align: 'right' })
    if (ytd !== null) {
      sf(bold ? 'bold' : 'normal', 8.5, bold ? T.primary as number[] : [100,100,100])
      tx(fmtCAD(ytd), margin+fullW-3, y+4.5, { align: 'right' })
    } else {
      sf('normal', 8.5, [180,180,180])
      tx('—', margin+fullW-3, y+4.5, { align: 'right' })
    }
    y += rowH
  }

  // Column headers
  fr(margin, y, fullW, 7, T.tableHeader)
  sf('bold', 8, white as number[])
  tx('DESCRIPTION', margin+3, y+5)
  tx('THIS PERIOD', margin+labelW+amtW-3, y+5, { align: 'right' })
  tx('YEAR TO DATE', margin+fullW-3, y+5, { align: 'right' })
  y += 7
  const tableTop = y - 7

  // Earnings
  sectionHead('Earnings')
  tableRow('Regular Pay', result.regularPay, result.regularPay, false)
  if (result.otPay > 0) tableRow(`Overtime Pay (${opts.overtimeMult}×)`, result.otPay, result.otPay, false)
  result.extraLines.forEach(e => tableRow(e.label, e.amount, e.amount, false))
  if (result.vacPay > 0) tableRow(`Vacation Pay (${opts.vacRate}%)`, result.vacPay, result.vacPay, false)
  tableRow('Gross Pay', result.totalGross, result.totalGross, true, T.rowHL)

  // Deductions
  sectionHead('Statutory Deductions')
  tableRow('CPP', result.cpp1, result.cpp1, false)
  if (result.cpp2 > 0) tableRow('CPP2', result.cpp2, result.cpp2, false)
  tableRow('EI', result.eiEmployee, result.eiEmployee, false)
  tableRow('Federal Tax', result.fedTax, result.fedTax, false)
  tableRow(`Provincial Tax (${company.province})`, result.provTax, result.provTax, false)
  tableRow('Total Statutory Deductions', result.totalDeductions, result.totalDeductions, true, T.rowHL)

  if (result.customDeductLines.length > 0) {
    sectionHead('Other Deductions')
    result.customDeductLines.forEach(d => tableRow(d.label, d.amount, d.amount, false))
    tableRow('Total Other Deductions', result.customDeductTotal, result.customDeductTotal, true, T.rowHL)
  }

  // Table border
  doc.setDrawColor(...(T.border as [number,number,number])); doc.setLineWidth(0.4)
  doc.rect(margin, tableTop, fullW, y - tableTop)
  y += 3

  // ── NET PAY ───────────────────────────────────────────────────
  fr(margin, y, fullW, 10, T.netBg)
  sf('bold', 12, white as number[])
  tx('NET PAY', margin+3, y+7)
  tx(fmtCAD(result.netPay), margin+labelW+amtW-3, y+7, { align: 'right' })
  y += 14

  // ── EMPLOYER CONTRIBUTIONS ────────────────────────────────────
  fr(margin, y, fullW, 7, T.sectionBg)
  doc.setDrawColor(...(T.border as [number,number,number]))
  doc.rect(margin, y, fullW, 7)
  sf('bold', 8, gray as number[])
  tx('EMPLOYER CONTRIBUTIONS (not deducted from employee pay)', margin+3, y+5)
  y += 7

  const empRows: [string, string][] = [
    ['Employer CPP', fmtCAD(result.employerCPP)],
    ['Employer EI',  fmtCAD(result.eiEmployer)],
    ['Total Employer Cost This Period', fmtCAD(result.totalEmployerCost)],
  ]
  empRows.forEach(([label, val], i) => {
    const isTot = i === empRows.length - 1
    fr(margin, y, fullW, 6.5, isTot ? T.rowHL : (i%2===0 ? white : [248,249,250]))
    sf(isTot ? 'bold' : 'normal', 8.5, black)
    tx(label, margin+3, y+4.5)
    tx(val, pageW-margin-3, y+4.5, { align: 'right' })
    y += 6.5
  })
  doc.setDrawColor(...(T.border as [number,number,number]))
  doc.rect(margin, y - 6.5*3, fullW, 6.5*3)
  y += 4

  // ── VACATION NOTE ─────────────────────────────────────────────
  if (opts.vacType === 'included') {
    fr(margin, y, fullW, 7, [234,244,253])
    sf('italic', 8, gray as number[])
    tx('Vacation pay is included in the salary/wage rate.', margin+3, y+5)
    y += 10
  } else if (result.vacPay > 0) {
    fr(margin, y, fullW, 7, [234,244,253])
    sf('italic', 8, gray as number[])
    tx(`Vacation pay accrued at ${opts.vacRate}% = ${fmtCAD(result.vacPay)} (included in gross pay above).`, margin+3, y+5)
    y += 10
  }

  // ── NOTES ─────────────────────────────────────────────────────
  if (opts.notes) {
    const noteLines = doc.splitTextToSize(`Note: ${opts.notes}`, fullW - 6)
    const noteH = noteLines.length * 5 + 6
    fr(margin, y, fullW, noteH, [255,251,230])
    doc.setDrawColor(243,156,18); doc.setLineWidth(0.3)
    doc.rect(margin, y, fullW, noteH)
    sf('normal', 8, [100,80,0])
    doc.text(noteLines, margin+3, y+5)
    y += noteH + 4
  }

  // ── FOOTER ────────────────────────────────────────────────────
  hr(y); y += 4
  sf('italic', 7.5, gray as number[])
  doc.text('* This payslip is generated for informational purposes. Consult a payroll professional for complex situations.', margin, y, { maxWidth: fullW })
  y += 5
  sf('normal', 7.5, gray as number[])
  tx(`Generated ${fmtToday()}  |  Province: ${company.province}  |  2026 CRA Rates`, margin, y)

  return doc.output('blob')
}

// ── Build the storage path ────────────────────────────────────
// Format: {userId}/{companyName}/{employeeName}/{periodStart}.pdf
export function buildStoragePath(
  userId:       string,
  companyName:  string,
  employeeName: string,
  periodStart:  string
): string {
  const slug = (s: string) =>
    s.trim().replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_').substring(0, 40)
  return `${userId}/${slug(companyName)}/${slug(employeeName)}/${periodStart}.pdf`
}
