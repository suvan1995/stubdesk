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
  ytdPrev:      { gross: number; vac: number; cpp1: number; cpp2: number; ei: number; fed: number; prov: number; custom: number; net: number }
  taxDisplay:   'separate' | 'combined'
  colorMode:    'color' | 'bw'
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
  // Route to specialised generators for templates 6 & 7
  if (opts.template === 6) return generateQuickBooksStyle(opts)
  if (opts.template === 7) return generateDayforceStyle(opts)

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

  // Apply black & white mode if selected
  const primary = opts.colorMode === 'bw' ? [0,0,0] as number[] : T.primary
  const netBg = opts.colorMode === 'bw' ? [0,0,0] as number[] : T.netBg
  const sectionBg = opts.colorMode === 'bw' ? [245,245,245] as number[] : T.sectionBg
  const rowHL = opts.colorMode === 'bw' ? [235,235,235] as number[] : T.rowHL
  const border = opts.colorMode === 'bw' ? [180,180,180] as number[] : T.border
  const headerText = T.headerText
  const subText = opts.colorMode === 'bw' ? [150,150,150] as number[] : T.subText
  const tableHeader = opts.colorMode === 'bw' ? [0,0,0] as number[] : T.tableHeader

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
    doc.setDrawColor(...(border as [number,number,number]))
    doc.setLineWidth(0.3)
    doc.line(margin, yy, pageW - margin, yy)
  }

  // ── HEADER ───────────────────────────────────────────────────
  fr(0, 0, pageW, 28, primary)
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
  sf('bold', 15, headerText as number[])
  tx(company.name, logoEndX, 11)
  sf('normal', 8, subText as number[])
  tx([company.street, `${company.city}, ${company.province}  ${company.postal}`].join('  |  '), logoEndX, 17)
  if (company.cra_bn) tx(`CRA BN: ${company.cra_bn}`, logoEndX, 22)
  y = 33

  // ── EMPLOYEE / PERIOD INFO ────────────────────────────────────
  const paymentInfo = opts.payMethod === 'cheque'
    ? `Cheque #${opts.chequeNumber || 'N/A'}`
    : employee.bank_account_last4 
      ? `EFT - Account ****${employee.bank_account_last4}`
      : 'Direct Deposit (EFT)'

  const infoLines: [string, string, string, string][] = [
    ['Employee:',  employee.name,                    'Employee ID:', employee.emp_id || 'N/A'],
    ['Address:',   employee.address || 'N/A',        'Pay Date:',    fmtDateDisplay(opts.payDate)],
    ['Pay Period:', `${fmtDateDisplay(opts.periodStart)} to ${fmtDateDisplay(opts.periodEnd)}`, 'Payment:', paymentInfo],
  ]
  if (employee.job_title || employee.department) {
    infoLines.push(['Title/Dept:', [employee.job_title, employee.department].filter(Boolean).join(' · ') || 'N/A', '', ''])
  }

  const infoH = infoLines.length * 6 + 4
  fr(margin, y, fullW, infoH, sectionBg)
  doc.setDrawColor(...(border as [number,number,number]))
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
    fr(margin, y, fullW, 6, sectionBg)
    doc.setDrawColor(...(border as [number,number,number])); doc.setLineWidth(0.2)
    doc.rect(margin, y, fullW, 6)
    sf('bold', 7.5, gray as number[])
    tx(label.toUpperCase(), margin+3, y+4.3)
    y += 6
  }

  const tableRow = (label: string, period: number, ytd: number | null, bold: boolean, bg?: number[]) => {
    fr(margin, y, fullW, rowH, bg ?? white)
    sf(bold ? 'bold' : 'normal', 8.5, bold ? primary as number[] : black)
    tx(label, margin+3, y+4.5)
    tx(fmtCAD(period), margin+labelW+amtW-3, y+4.5, { align: 'right' })
    if (ytd !== null) {
      sf(bold ? 'bold' : 'normal', 8.5, bold ? primary as number[] : [100,100,100])
      // YTD includes current period + prior periods
      const ytdTotal = ytd + period
      tx(fmtCAD(ytdTotal), margin+fullW-3, y+4.5, { align: 'right' })
    } else {
      sf('normal', 8.5, [180,180,180])
      tx('—', margin+fullW-3, y+4.5, { align: 'right' })
    }
    y += rowH
  }

  // Column headers
  fr(margin, y, fullW, 7, tableHeader)
  sf('bold', 8, white as number[])
  tx('DESCRIPTION', margin+3, y+5)
  tx('THIS PERIOD', margin+labelW+amtW-3, y+5, { align: 'right' })
  tx('YEAR TO DATE', margin+fullW-3, y+5, { align: 'right' })
  y += 7
  const tableTop = y - 7

  // Earnings
  sectionHead('Earnings')
  tableRow('Regular Pay', result.regularPay, opts.ytdPrev.gross, false)
  if (result.otPay > 0) tableRow(`Overtime Pay (${opts.overtimeMult}×)`, result.otPay, null, false)
  result.extraLines.forEach(e => tableRow(e.label, e.amount, null, false))
  // Always show vacation pay line, even when included
  if (opts.vacType === 'included') {
    tableRow(`Vacation Pay (${opts.vacRate}% - included in rate)`, 0, 0, false)
  } else if (result.vacPay > 0) {
    tableRow(`Vacation Pay (${opts.vacRate}%)`, result.vacPay, opts.ytdPrev.vac, false)
  }
  tableRow('Gross Pay', result.totalGross, opts.ytdPrev.gross + opts.ytdPrev.vac, true, rowHL)

  // Deductions
  sectionHead('Statutory Deductions')
  tableRow('CPP', result.cpp1, opts.ytdPrev.cpp1, false)
  if (result.cpp2 > 0) tableRow('CPP2', result.cpp2, opts.ytdPrev.cpp2, false)
  tableRow('EI', result.eiEmployee, opts.ytdPrev.ei, false)
  if (opts.taxDisplay === 'separate') {
    tableRow('Federal Tax', result.fedTax, opts.ytdPrev.fed, false)
    tableRow(`Provincial Tax (${company.province})`, result.provTax, opts.ytdPrev.prov, false)
  } else {
    tableRow('Income Tax', result.fedTax + result.provTax, opts.ytdPrev.fed + opts.ytdPrev.prov, false)
  }
  tableRow('Total Statutory Deductions', result.totalDeductions, opts.ytdPrev.cpp1 + opts.ytdPrev.cpp2 + opts.ytdPrev.ei + opts.ytdPrev.fed + opts.ytdPrev.prov, true, rowHL)

  if (result.customDeductLines.length > 0) {
    sectionHead('Other Deductions')
    result.customDeductLines.forEach(d => tableRow(d.label, d.amount, null, false))
    tableRow('Total Other Deductions', result.customDeductTotal, opts.ytdPrev.custom, true, rowHL)
  }

  // Table border
  doc.setDrawColor(...(border as [number,number,number])); doc.setLineWidth(0.4)
  doc.rect(margin, tableTop, fullW, y - tableTop)
  y += 3

  // ── NET PAY ───────────────────────────────────────────────────
  fr(margin, y, fullW, 10, netBg)
  sf('bold', 12, white as number[])
  tx('NET PAY', margin+3, y+7)
  tx(fmtCAD(result.netPay), margin+labelW+amtW-3, y+7, { align: 'right' })
  y += 14

  // ── VACATION NOTE ─────────────────────────────────────────────
  if (opts.vacType === 'included') {
    fr(margin, y, fullW, 7, [234,244,253])
    sf('italic', 8, gray as number[])
    tx(`Vacation pay at ${opts.vacRate}% is included in the salary/wage rate (not shown separately in gross pay).`, margin+3, y+5)
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

  // ── PAGE 2: Employer Cost Summary ────────────────────────────
  addEmployerPage(doc, opts, opts.colorMode, T.primary)

  return doc.output('blob')
}

// ── Employer Cost Page (Page 2 of all templates) ─────────────────────────────
// Adds a second page to the document with a full employer cost breakdown,
// remittance summary, and CRA due date. Called by all 7 templates.
function addEmployerPage(
  doc: jsPDF,
  opts: PayslipPDFOptions,
  colorMode: 'color' | 'bw',
  primaryColor: number[],
): void {
  const { result, company, employee } = opts
  doc.addPage()

  const pageW  = 215.9
  const mg     = 15
  const fw     = pageW - mg * 2
  const white  = [255, 255, 255] as [number,number,number]
  const black  = [30,  30,  30]  as [number,number,number]
  const dgray  = [80,  80,  80]  as [number,number,number]
  const mgray  = [130, 130, 130] as [number,number,number]
  const lgray  = [210, 215, 220] as [number,number,number]
  const altbg  = [245, 247, 250] as [number,number,number]
  const primary = (colorMode === 'bw' ? [0, 0, 0] : primaryColor) as [number,number,number]
  const green   = (colorMode === 'bw' ? [0, 0, 0] : [30, 132, 73]) as [number,number,number]

  const sf = (style: string, size: number, c: [number,number,number] = black) => {
    doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor(...c)
  }
  const tx = (s: string, x: number, yy: number, o?: object) => doc.text(s || '', x, yy, o)
  const fr = (x: number, yy: number, w: number, h: number, c: [number,number,number]) => {
    doc.setFillColor(...c); doc.rect(x, yy, w, h, 'F')
  }
  const bdr = (x: number, yy: number, w: number, h: number, c: [number,number,number] = lgray, lw = 0.3) => {
    doc.setDrawColor(...c); doc.setLineWidth(lw); doc.rect(x, yy, w, h)
  }
  const rule = (yy: number) => {
    doc.setDrawColor(...lgray); doc.setLineWidth(0.3); doc.line(mg, yy, pageW - mg, yy)
  }

  let y = 0

  // ── Header bar ───────────────────────────────────────────────────────────
  fr(0, 0, pageW, 26, primary)
  sf('bold', 14, white); tx(company.name, mg, 11)
  sf('normal', 8, white); tx('EMPLOYER COST SUMMARY — CONFIDENTIAL', mg, 18)
  sf('normal', 8, white)
  tx(`${fmtDateDisplay(opts.periodStart)} – ${fmtDateDisplay(opts.periodEnd)}  |  Pay Date: ${fmtDateDisplay(opts.payDate)}`, pageW - mg, 18, { align: 'right' })
  y = 32

  // ── Employee reference ────────────────────────────────────────────────────
  fr(mg, y, fw, 12, altbg)
  bdr(mg, y, fw, 12)
  sf('bold', 8, mgray); tx('EMPLOYEE', mg + 3, y + 5)
  sf('normal', 9, black); tx(employee.name, mg + 3, y + 10)
  sf('bold', 8, mgray); tx('EMPLOYEE ID', mg + fw / 3, y + 5)
  sf('normal', 9, black); tx(employee.emp_id || 'N/A', mg + fw / 3, y + 10)
  sf('bold', 8, mgray); tx('PROVINCE', mg + fw * 2 / 3, y + 5)
  sf('normal', 9, black); tx(company.province, mg + fw * 2 / 3, y + 10)
  y += 18

  // ── Section: Employee Gross Pay ───────────────────────────────────────────
  fr(mg, y, fw, 7, primary)
  sf('bold', 8, white); tx('EMPLOYEE GROSS PAY', mg + 3, y + 5)
  y += 7

  const rowH = 7
  const col1 = fw * 0.55
  const col2 = fw * 0.45

  const dataRow = (label: string, val: string, bold = false, bg: [number,number,number] = white) => {
    fr(mg, y, fw, rowH, bg)
    doc.setDrawColor(...lgray); doc.setLineWidth(0.15); doc.line(mg, y + rowH, mg + fw, y + rowH)
    sf(bold ? 'bold' : 'normal', 8.5, bold ? black : dgray)
    tx(label, mg + 3, y + 5)
    sf(bold ? 'bold' : 'normal', 8.5, black)
    tx(val, mg + col1 + col2 - 3, y + 5, { align: 'right' })
    y += rowH
  }

  dataRow('Regular Pay',          fmtCAD(result.regularPay))
  if (result.otPay > 0)
    dataRow(`Overtime Pay (${opts.overtimeMult}×)`, fmtCAD(result.otPay))
  result.extraLines.forEach(e => dataRow(e.label, fmtCAD(e.amount)))
  if (result.vacPay > 0)
    dataRow(`Vacation Pay (${opts.vacRate}%)`, fmtCAD(result.vacPay))
  dataRow('Total Gross Pay', fmtCAD(result.totalGross), true, altbg)
  bdr(mg, y - rowH * (result.extraLines.length + (result.otPay > 0 ? 1 : 0) + (result.vacPay > 0 ? 1 : 0) + 2), fw,
      rowH * (result.extraLines.length + (result.otPay > 0 ? 1 : 0) + (result.vacPay > 0 ? 1 : 0) + 2), lgray, 0.3)
  y += 6

  // ── Section: Employer Contributions ──────────────────────────────────────
  fr(mg, y, fw, 7, primary)
  sf('bold', 8, white); tx('EMPLOYER CONTRIBUTIONS', mg + 3, y + 5)
  y += 7

  dataRow('Employer CPP (matches employee CPP1 + CPP2)', fmtCAD(result.employerCPP))
  dataRow('Employer EI (employee EI × 1.4)',             fmtCAD(result.eiEmployer))
  dataRow('Total Employer Contributions',                fmtCAD(result.employerCPP + result.eiEmployer), true, altbg)
  bdr(mg, y - rowH * 3, fw, rowH * 3, lgray, 0.3)
  y += 6

  // ── Section: Total Cost to Employer ──────────────────────────────────────
  fr(mg, y, fw, 7, primary)
  sf('bold', 8, white); tx('TOTAL COST TO EMPLOYER THIS PERIOD', mg + 3, y + 5)
  y += 7

  dataRow('Employee Gross Pay',          fmtCAD(result.totalGross))
  dataRow('+ Employer CPP',              fmtCAD(result.employerCPP))
  dataRow('+ Employer EI',               fmtCAD(result.eiEmployer))
  fr(mg, y, fw, rowH + 1, green)
  sf('bold', 10, white)
  tx('TOTAL EMPLOYER COST', mg + 3, y + 6)
  tx(fmtCAD(result.totalEmployerCost), mg + fw - 3, y + 6, { align: 'right' })
  y += rowH + 1 + 8

  // ── Section: CRA Remittance Summary ──────────────────────────────────────
  fr(mg, y, fw, 7, primary)
  sf('bold', 8, white); tx('CRA REMITTANCE SUMMARY', mg + 3, y + 5)
  y += 7

  // Column headers
  fr(mg, y, fw, 6, altbg)
  bdr(mg, y, fw, 6)
  sf('bold', 7, mgray)
  tx('ITEM',     mg + 3,          y + 4)
  tx('EMPLOYEE', mg + fw * 0.45,  y + 4, { align: 'right' })
  tx('EMPLOYER', mg + fw * 0.65,  y + 4, { align: 'right' })
  tx('TOTAL',    mg + fw - 3,     y + 4, { align: 'right' })
  y += 6

  const remitRow = (label: string, emp: number, empr: number, bold = false) => {
    const total = emp + empr
    fr(mg, y, fw, rowH, bold ? altbg : white)
    doc.setDrawColor(...lgray); doc.setLineWidth(0.15); doc.line(mg, y + rowH, mg + fw, y + rowH)
    sf(bold ? 'bold' : 'normal', 8, bold ? black : dgray)
    tx(label, mg + 3, y + 5)
    sf(bold ? 'bold' : 'normal', 8, black)
    tx(fmtCAD(emp),   mg + fw * 0.45, y + 5, { align: 'right' })
    tx(empr > 0 ? fmtCAD(empr) : '—', mg + fw * 0.65, y + 5, { align: 'right' })
    tx(fmtCAD(total), mg + fw - 3,    y + 5, { align: 'right' })
    y += rowH
  }

  remitRow('CPP / CPP2',    result.cpp1 + result.cpp2, result.employerCPP)
  remitRow('EI Premiums',   result.eiEmployee,          result.eiEmployer)
  if (opts.taxDisplay === 'separate') {
    remitRow('Federal Income Tax',       result.fedTax,  0)
    remitRow(`Provincial Tax (${company.province})`, result.provTax, 0)
  } else {
    remitRow('Income Tax', result.fedTax + result.provTax, 0)
  }
  remitRow(
    'TOTAL REMITTANCE',
    result.totalDeductions,
    result.employerCPP + result.eiEmployer,
    true
  )
  bdr(mg, y - rowH * (opts.taxDisplay === 'separate' ? 5 : 4), fw,
      rowH * (opts.taxDisplay === 'separate' ? 5 : 4), lgray, 0.3)
  y += 6

  // ── CRA due date note ─────────────────────────────────────────────────────
  const payDateObj = opts.payDate ? new Date(opts.payDate + 'T12:00:00') : new Date()
  const dueMonth   = new Date(payDateObj.getFullYear(), payDateObj.getMonth() + 1, 15)
  const dueDateStr = dueMonth.toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })

  fr(mg, y, fw, 10, colorMode === 'bw' ? [240,240,240] as [number,number,number] : [232,244,253] as [number,number,number])
  bdr(mg, y, fw, 10, colorMode === 'bw' ? lgray : [180,210,240] as [number,number,number])
  sf('bold', 8, colorMode === 'bw' ? black : [20,80,140] as [number,number,number])
  tx(`Remittance due: ${dueDateStr}`, mg + 3, y + 4.5)
  sf('normal', 7, colorMode === 'bw' ? mgray : [60,100,160] as [number,number,number])
  tx('Regular remitters: due by the 15th of the month following the pay date.', mg + 3, y + 8.5)
  y += 16

  // ── Footer ────────────────────────────────────────────────────────────────
  rule(y); y += 4
  sf('italic', 7, mgray)
  tx('This page is for employer records only and should not be distributed to employees.', mg, y)
  y += 4
  sf('normal', 7, mgray)
  tx(`Generated ${fmtToday()}  |  ${company.name}  |  CRA BN: ${company.cra_bn || 'Not set'}`, mg, y)
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

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 6 — QuickBooks-inspired: clean, minimal, black & white with a
// single green accent rule, two-column earnings/deductions, summary box.
// ─────────────────────────────────────────────────────────────────────────────
function generateQuickBooksStyle(opts: PayslipPDFOptions): Blob {
  const { result, company, employee } = opts
  const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const pageW = 215.9
  const mg    = 18          // margin
  const fw    = pageW - mg * 2
  
  // Color mode support
  const black = opts.colorMode === 'bw' ? [0, 0, 0] as [number,number,number] : [30, 30, 30] as [number,number,number]
  const dgray = [80, 80, 80]   as [number,number,number]
  const mgray = [140,140,140]  as [number,number,number]
  const lgray = opts.colorMode === 'bw' ? [200,200,200] as [number,number,number] : [230,230,230] as [number,number,number]
  const green = opts.colorMode === 'bw' ? [0, 0, 0] as [number,number,number] : [43, 130, 84] as [number,number,number]
  const white = [255,255,255]  as [number,number,number]
  const altbg = opts.colorMode === 'bw' ? [250,250,250] as [number,number,number] : [248,248,248] as [number,number,number]
  let y = mg

  const sf = (style: string, size: number, c: [number,number,number] = black) => {
    doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor(...c)
  }
  const tx = (s: string, x: number, yy: number, o?: object) => doc.text(s||'', x, yy, o)
  const fr = (x: number, yy: number, w: number, h: number, c: [number,number,number]) => {
    doc.setFillColor(...c); doc.rect(x, yy, w, h, 'F')
  }
  const rule = (yy: number, c: [number,number,number] = lgray, lw = 0.3) => {
    doc.setDrawColor(...c); doc.setLineWidth(lw); doc.line(mg, yy, pageW-mg, yy)
  }
  const bdr = (x: number, yy: number, w: number, h: number, c: [number,number,number] = lgray, lw = 0.3) => {
    doc.setDrawColor(...c); doc.setLineWidth(lw); doc.rect(x, yy, w, h)
  }

  // ── Logo + company name ──────────────────────────────────────────────────
  if (opts.logoDataURL) {
    try {
      const ext = opts.logoDataURL.substring(opts.logoDataURL.indexOf('/')+1, opts.logoDataURL.indexOf(';')).toUpperCase()
      doc.addImage(opts.logoDataURL, ext === 'JPG' ? 'JPEG' : (ext === 'SVG+XML' ? 'PNG' : ext), mg, y, 18, 18)
      sf('bold', 14, black); tx(company.name, mg + 22, y + 8)
      sf('normal', 7.5, mgray); tx(`${company.street}, ${company.city}, ${company.province}  ${company.postal}`, mg + 22, y + 13)
    } catch {
      sf('bold', 16, black); tx(company.name, mg, y + 8)
      sf('normal', 7.5, mgray); tx(`${company.street}, ${company.city}, ${company.province}  ${company.postal}`, mg, y + 13)
    }
  } else {
    sf('bold', 16, black); tx(company.name, mg, y + 8)
    sf('normal', 7.5, mgray); tx(`${company.street}, ${company.city}, ${company.province}  ${company.postal}`, mg, y + 13)
  }
  if (company.cra_bn) { sf('normal', 7, mgray); tx(`BN: ${company.cra_bn}`, pageW - mg, y + 8, { align: 'right' }) }
  y += 22

  // ── Accent rule ────────────────────────────────────────────────────────
  fr(mg, y, fw, 1.5, green); y += 5

  // ── PAY STATEMENT title + period ─────────────────────────────────────────
  sf('bold', 10, black); tx('PAY STATEMENT', mg, y)
  sf('normal', 8, mgray)
  tx(`Period: ${fmtDateDisplay(opts.periodStart)} – ${fmtDateDisplay(opts.periodEnd)}`, pageW - mg, y, { align: 'right' })
  y += 5
  sf('normal', 8, mgray)
  tx(`Pay Date: ${fmtDateDisplay(opts.payDate)}  |  ${opts.payMethod === 'cheque' ? `Cheque #${opts.chequeNumber}` : 'Direct Deposit (EFT)'}`, mg, y)
  y += 8; rule(y); y += 5

  // ── Employee info ─────────────────────────────────────────────────────────
  const halfW = fw / 2
  sf('bold', 8, mgray); tx('EMPLOYEE', mg, y)
  sf('bold', 8, mgray); tx('EMPLOYMENT', mg + halfW, y)
  y += 4
  sf('bold', 9, black); tx(employee.name, mg, y)
  sf('normal', 8, dgray)
  tx(employee.emp_type === 'salaried' ? 'Salaried' : 'Hourly', mg + halfW, y)
  y += 4
  if (employee.emp_id) { sf('normal', 7.5, mgray); tx(`ID: ${employee.emp_id}`, mg, y) }
  sf('normal', 7.5, mgray)
  tx(`${employee.pay_frequency === 52 ? 'Weekly' : employee.pay_frequency === 26 ? 'Bi-Weekly' : employee.pay_frequency === 24 ? 'Semi-Monthly' : 'Monthly'}`, mg + halfW, y)
  y += 4
  if (employee.address) { sf('normal', 7.5, mgray); tx(employee.address, mg, y); y += 4 }
  if (employee.job_title || employee.department) {
    sf('normal', 7.5, mgray)
    tx([employee.job_title, employee.department].filter(Boolean).join(' · '), mg, y); y += 4
  }
  
  // Payment method info
  const paymentInfo = opts.payMethod === 'cheque'
    ? `Cheque #${opts.chequeNumber || 'N/A'}`
    : employee.bank_account_last4
      ? `EFT - Account ****${employee.bank_account_last4}`
      : 'Direct Deposit (EFT)'
  sf('normal', 7.5, mgray)
  tx(`Payment: ${paymentInfo}`, mg + halfW, y); y += 4
  
  y += 3; rule(y); y += 6

  // ── Earnings & Deductions Table with YTD ─────────────────────────────────
  const labelW = 70
  const amtW = 30
  const ytdW = 30
  const rowH = 6

  const tableRow = (label: string, period: number, ytd: number | null, bold: boolean) => {
    fr(mg, y, fw, rowH, bold ? lgray : (y % 12 < 6 ? white : altbg))
    sf(bold ? 'bold' : 'normal', 8, bold ? black : dgray)
    tx(label, mg + 2, y + 4)
    sf(bold ? 'bold' : 'normal', 8, black)
    tx(fmtCAD(period), mg + labelW + amtW - 2, y + 4, { align: 'right' })
    if (ytd !== null) {
      sf(bold ? 'bold' : 'normal', 8, mgray)
      const ytdTotal = ytd + period
      tx(fmtCAD(ytdTotal), mg + labelW + amtW + ytdW - 2, y + 4, { align: 'right' })
    } else {
      sf('normal', 8, [200,200,200] as [number,number,number])
      tx('—', mg + labelW + amtW + ytdW - 2, y + 4, { align: 'right' })
    }
    y += rowH
  }

  const sectionHead = (label: string) => {
    fr(mg, y, fw, 6, opts.colorMode === 'bw' ? lgray : [235,240,245] as [number,number,number])
    sf('bold', 7, opts.colorMode === 'bw' ? black : green)
    tx(label.toUpperCase(), mg + 2, y + 4)
    y += 6
  }

  // Column headers
  fr(mg, y, fw, 7, green)
  sf('bold', 7.5, white)
  tx('DESCRIPTION', mg + 2, y + 5)
  tx('THIS PERIOD', mg + labelW + amtW - 2, y + 5, { align: 'right' })
  tx('YEAR TO DATE', mg + labelW + amtW + ytdW - 2, y + 5, { align: 'right' })
  y += 7

  // Earnings
  sectionHead('Earnings')
  tableRow('Regular Pay', result.regularPay, opts.ytdPrev.gross, false)
  if (result.otPay > 0) tableRow(`Overtime Pay (${opts.overtimeMult}×)`, result.otPay, null, false)
  result.extraLines.forEach(e => tableRow(e.label, e.amount, null, false))
  if (opts.vacType === 'included') {
    tableRow(`Vacation Pay (${opts.vacRate}% - included in rate)`, 0, 0, false)
  } else if (result.vacPay > 0) {
    tableRow(`Vacation Pay (${opts.vacRate}%)`, result.vacPay, opts.ytdPrev.vac, false)
  }
  tableRow('Gross Pay', result.totalGross, opts.ytdPrev.gross + opts.ytdPrev.vac, true)

  // Deductions
  sectionHead('Statutory Deductions')
  tableRow('CPP', result.cpp1, opts.ytdPrev.cpp1, false)
  if (result.cpp2 > 0) tableRow('CPP2', result.cpp2, opts.ytdPrev.cpp2, false)
  tableRow('EI', result.eiEmployee, opts.ytdPrev.ei, false)
  if (opts.taxDisplay === 'separate') {
    tableRow('Federal Tax', result.fedTax, opts.ytdPrev.fed, false)
    tableRow(`Provincial Tax (${company.province})`, result.provTax, opts.ytdPrev.prov, false)
  } else {
    tableRow('Income Tax', result.fedTax + result.provTax, opts.ytdPrev.fed + opts.ytdPrev.prov, false)
  }
  tableRow('Total Statutory Deductions', result.totalDeductions, opts.ytdPrev.cpp1 + opts.ytdPrev.cpp2 + opts.ytdPrev.ei + opts.ytdPrev.fed + opts.ytdPrev.prov, true)

  if (result.customDeductLines.length > 0) {
    sectionHead('Other Deductions')
    result.customDeductLines.forEach(d => tableRow(d.label, d.amount, null, false))
    tableRow('Total Other Deductions', result.customDeductTotal, opts.ytdPrev.custom, true)
  }

  // Table border
  bdr(mg, 63, fw, y - 63, lgray, 0.4)
  y += 4

  // ── Net pay summary box ───────────────────────────────────────────────────
  const boxW = 80; const boxH2 = 18
  const boxX = pageW - mg - boxW
  bdr(boxX, y, boxW, boxH2, green)
  fr(boxX, y, boxW, 7, green)
  sf('bold', 7.5, white); tx('NET PAY', boxX + boxW/2, y + 5, { align: 'center' })
  sf('bold', 14, green); tx(fmtCAD(result.netPay), boxX + boxW/2, y + 14, { align: 'center' })
  y += boxH2 + 5

  // ── Notes ─────────────────────────────────────────────────────────────────
  if (opts.notes) {
    rule(y, lgray, 0.2); y += 4
    sf('bold', 7.5, mgray); tx('NOTES', mg, y); y += 4
    sf('normal', 7.5, dgray)
    const lines = doc.splitTextToSize(opts.notes, fw)
    doc.text(lines, mg, y); y += lines.length * 4 + 2
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  rule(y, lgray); y += 4
  sf('italic', 6.5, mgray)
  tx(`Generated ${fmtToday()}  |  Province: ${company.province}  |  2026 CRA Rates`, mg, y)

  // ── PAGE 2: Employer Cost Summary ─────────────────────────────────────────
  addEmployerPage(doc, opts, opts.colorMode, [43, 130, 84])

  return doc.output('blob')
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 7 — Dayforce/Ceridian-inspired: structured corporate layout,
// dark navy header, tabular rows with alternating shading, YTD column,
// employer section in a separate bordered block at the bottom.
// ─────────────────────────────────────────────────────────────────────────────
function generateDayforceStyle(opts: PayslipPDFOptions): Blob {
  const { result, company, employee } = opts
  const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const pageW = 215.9
  const mg    = 14
  const fw    = pageW - mg * 2
  
  // Color mode support
  const navy  = opts.colorMode === 'bw' ? [0, 0, 0] as [number,number,number] : [15, 40, 80] as [number,number,number]
  const teal  = opts.colorMode === 'bw' ? [0, 0, 0] as [number,number,number] : [0, 120, 140] as [number,number,number]
  const black = [20, 20, 20]   as [number,number,number]
  const dgray = [70, 70, 70]   as [number,number,number]
  const mgray = [130,130,130]  as [number,number,number]
  const lgray = opts.colorMode === 'bw' ? [200,200,200] as [number,number,number] : [220,225,230] as [number,number,number]
  const altbg = opts.colorMode === 'bw' ? [250,250,250] as [number,number,number] : [242,245,248] as [number,number,number]
  const white = [255,255,255]  as [number,number,number]
  const headerSubText = opts.colorMode === 'bw' ? [150,150,150] as [number,number,number] : [180,200,220] as [number,number,number]
  let y = 0

  const sf = (style: string, size: number, c: [number,number,number] = black) => {
    doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor(...c)
  }
  const tx = (s: string, x: number, yy: number, o?: object) => doc.text(s||'', x, yy, o)
  const fr = (x: number, yy: number, w: number, h: number, c: [number,number,number]) => {
    doc.setFillColor(...c); doc.rect(x, yy, w, h, 'F')
  }
  const bdr = (x: number, yy: number, w: number, h: number, c: [number,number,number] = lgray, lw = 0.3) => {
    doc.setDrawColor(...c); doc.setLineWidth(lw); doc.rect(x, yy, w, h)
  }

  // ── Full-width navy header ────────────────────────────────────────────────
  fr(0, 0, pageW, 30, navy)

  // Logo
  let logoEndX = mg
  if (opts.logoDataURL) {
    try {
      const ext = opts.logoDataURL.substring(opts.logoDataURL.indexOf('/')+1, opts.logoDataURL.indexOf(';')).toUpperCase()
      doc.addImage(opts.logoDataURL, ext === 'JPG' ? 'JPEG' : (ext === 'SVG+XML' ? 'PNG' : ext), mg, 4, 20, 20)
      logoEndX = mg + 24
    } catch { logoEndX = mg }
  }

  sf('bold', 15, white); tx(company.name, logoEndX, 12)
  sf('normal', 7.5, headerSubText)
  tx(`${company.street}, ${company.city}, ${company.province}  ${company.postal}`, logoEndX, 18)
  if (company.cra_bn) tx(`CRA BN: ${company.cra_bn}`, logoEndX, 23)

  // Right side: PAY STATEMENT label
  sf('bold', 9, headerSubText); tx('PAY STATEMENT', pageW - mg, 10, { align: 'right' })
  sf('normal', 7.5, headerSubText)
  tx(`${fmtDateDisplay(opts.periodStart)} – ${fmtDateDisplay(opts.periodEnd)}`, pageW - mg, 16, { align: 'right' })
  tx(`Pay Date: ${fmtDateDisplay(opts.payDate)}`, pageW - mg, 22, { align: 'right' })
  y = 34

  // ── Employee info bar ─────────────────────────────────────────────────────
  fr(mg, y, fw, 18, altbg)
  bdr(mg, y, fw, 18)
  const q = fw / 4
  const paymentInfo = opts.payMethod === 'cheque'
    ? `Cheque #${opts.chequeNumber || 'N/A'}`
    : employee.bank_account_last4
      ? `EFT ****${employee.bank_account_last4}`
      : 'Direct Deposit'
  const infoItems = [
    { label: 'Employee', val: employee.name },
    { label: 'ID', val: employee.emp_id || 'N/A' },
    { label: 'Title / Dept', val: [employee.job_title, employee.department].filter(Boolean).join(' · ') || '—' },
    { label: 'Payment', val: paymentInfo },
  ]
  infoItems.forEach((item, i) => {
    const x = mg + i * q
    sf('bold', 6, mgray); tx(item.label.toUpperCase(), x + 3, y + 5)
    sf('normal', 8, black); tx(item.val, x + 3, y + 12)
    if (i < 3) { doc.setDrawColor(...lgray); doc.setLineWidth(0.2); doc.line(x + q, y, x + q, y + 18) }
  })
  y += 18
  
  // Employee address if provided
  if (employee.address) {
    fr(mg, y, fw, 6, white)
    bdr(mg, y, fw, 6)
    sf('normal', 7, dgray); tx(`Address: ${employee.address}`, mg + 3, y + 4)
    y += 6
  }
  y += 4

  // ── Table header ─────────────────────────────────────────────────────────
  const descW = fw * 0.50
  const perW  = fw * 0.25
  const rowH  = 6.5

  fr(mg, y, fw, 7, teal)
  sf('bold', 7.5, white)
  tx('DESCRIPTION', mg + 3, y + 5)
  tx('THIS PERIOD', mg + descW + perW - 3, y + 5, { align: 'right' })
  tx('YEAR TO DATE', mg + fw - 3, y + 5, { align: 'right' })
  y += 7

  // ── Table rows helper ─────────────────────────────────────────────────────
  let rowIdx = 0
  function tableRow(label: string, period: number, ytd: number | null, bold = false) {
    const bg = bold ? (opts.colorMode === 'bw' ? [235,235,235] as [number,number,number] : [232,238,245] as [number,number,number]) : (rowIdx % 2 === 0 ? white : altbg)
    fr(mg, y, fw, rowH, bg)
    doc.setDrawColor(...lgray); doc.setLineWidth(0.15)
    doc.line(mg, y + rowH, mg + fw, y + rowH)
    sf(bold ? 'bold' : 'normal', 8, bold ? navy : dgray)
    tx(label, mg + 3, y + 4.5)
    sf(bold ? 'bold' : 'normal', 8, bold ? navy : black)
    tx(fmtCAD(period), mg + descW + perW - 3, y + 4.5, { align: 'right' })
    if (ytd !== null) {
      sf(bold ? 'bold' : 'normal', 8, bold ? navy : mgray)
      // YTD includes current period + prior periods
      const ytdTotal = ytd + period
      tx(fmtCAD(ytdTotal), mg + fw - 3, y + 4.5, { align: 'right' })
    } else {
      sf('normal', 8, [200,200,200] as [number,number,number])
      tx('—', mg + fw - 3, y + 4.5, { align: 'right' })
    }
    y += rowH; rowIdx++
  }
  function sectionHead(label: string) {
    fr(mg, y, fw, 5.5, opts.colorMode === 'bw' ? [240,240,240] as [number,number,number] : [235,240,248] as [number,number,number])
    sf('bold', 6.5, teal); tx(label.toUpperCase(), mg + 3, y + 4)
    y += 5.5
  }

  // Earnings
  sectionHead('Earnings')
  tableRow('Regular Pay', result.regularPay, opts.ytdPrev.gross)
  if (result.otPay > 0) tableRow(`Overtime Pay (${opts.overtimeMult}×)`, result.otPay, null)
  result.extraLines.forEach(e => tableRow(e.label, e.amount, null))
  // Always show vacation pay line, even when included
  if (opts.vacType === 'included') {
    tableRow(`Vacation Pay (${opts.vacRate}% - included in rate)`, 0, 0)
  } else if (result.vacPay > 0) {
    tableRow(`Vacation Pay (${opts.vacRate}%)`, result.vacPay, opts.ytdPrev.vac)
  }
  tableRow('Gross Pay', result.totalGross, opts.ytdPrev.gross + opts.ytdPrev.vac, true)

  // Deductions
  sectionHead('Statutory Deductions')
  tableRow('CPP', result.cpp1, opts.ytdPrev.cpp1)
  if (result.cpp2 > 0) tableRow('CPP2', result.cpp2, opts.ytdPrev.cpp2)
  tableRow('EI', result.eiEmployee, opts.ytdPrev.ei)
  if (opts.taxDisplay === 'separate') {
    tableRow('Federal Tax', result.fedTax, opts.ytdPrev.fed)
    tableRow(`Provincial Tax (${company.province})`, result.provTax, opts.ytdPrev.prov)
  } else {
    tableRow('Income Tax', result.fedTax + result.provTax, opts.ytdPrev.fed + opts.ytdPrev.prov)
  }
  tableRow('Total Statutory Deductions', result.totalDeductions, opts.ytdPrev.cpp1 + opts.ytdPrev.cpp2 + opts.ytdPrev.ei + opts.ytdPrev.fed + opts.ytdPrev.prov, true)

  if (result.customDeductLines.length > 0) {
    sectionHead('Other Deductions')
    result.customDeductLines.forEach(d => tableRow(d.label, d.amount, null))
    tableRow('Total Other Deductions', result.customDeductTotal, opts.ytdPrev.custom, true)
  }

  // Outer table border
  bdr(mg, 63, fw, y - 63, lgray, 0.4)

  y += 4

  // ── Net pay bar ───────────────────────────────────────────────────────────
  fr(mg, y, fw, 12, navy)
  sf('bold', 11, white); tx('NET PAY', mg + 4, y + 8.5)
  sf('bold', 13, white); tx(fmtCAD(result.netPay), pageW - mg - 4, y + 8.5, { align: 'right' })
  y += 16

  // ── Notes ─────────────────────────────────────────────────────────────────
  if (opts.notes) {
    y += 3
    sf('bold', 7, mgray); tx('NOTES', mg, y); y += 4
    sf('normal', 7.5, dgray)
    const lines = doc.splitTextToSize(opts.notes, fw)
    doc.text(lines, mg, y); y += lines.length * 4 + 2
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  y += 3
  doc.setDrawColor(...lgray); doc.setLineWidth(0.3); doc.line(mg, y, pageW - mg, y); y += 4
  sf('italic', 6.5, mgray)
  tx(`Generated ${fmtToday()}  |  Province: ${company.province}  |  2026 CRA Rates`, mg, y)

  // ── PAGE 2: Employer Cost Summary ─────────────────────────────────────────
  addEmployerPage(doc, opts, opts.colorMode, [15, 40, 80])

  return doc.output('blob')
}
