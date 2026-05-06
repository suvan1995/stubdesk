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
  fr(margin, y, fullW, 7, T.tableHeader)
  sf('bold', 8, white as number[])
  tx('DESCRIPTION', margin+3, y+5)
  tx('THIS PERIOD', margin+labelW+amtW-3, y+5, { align: 'right' })
  tx('YEAR TO DATE', margin+fullW-3, y+5, { align: 'right' })
  y += 7
  const tableTop = y - 7

  // Earnings
  sectionHead('Earnings')
  tableRow('Regular Pay', result.regularPay, opts.ytdPrev.gross - opts.ytdPrev.vac, false)
  if (result.otPay > 0) tableRow(`Overtime Pay (${opts.overtimeMult}×)`, result.otPay, 0, false)
  result.extraLines.forEach(e => tableRow(e.label, e.amount, 0, false))
  // Always show vacation pay line, even when included
  if (opts.vacType === 'included') {
    tableRow(`Vacation Pay (${opts.vacRate}% - included in rate)`, 0, 0, false)
  } else if (result.vacPay > 0) {
    tableRow(`Vacation Pay (${opts.vacRate}%)`, result.vacPay, opts.ytdPrev.vac, false)
  }
  tableRow('Gross Pay', result.totalGross, opts.ytdPrev.gross, true, T.rowHL)

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
  tableRow('Total Statutory Deductions', result.totalDeductions, opts.ytdPrev.cpp1 + opts.ytdPrev.cpp2 + opts.ytdPrev.ei + opts.ytdPrev.fed + opts.ytdPrev.prov, true, T.rowHL)

  if (result.customDeductLines.length > 0) {
    sectionHead('Other Deductions')
    result.customDeductLines.forEach(d => tableRow(d.label, d.amount, 0, false))
    tableRow('Total Other Deductions', result.customDeductTotal, opts.ytdPrev.custom, true, T.rowHL)
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
  const black = [30, 30, 30]   as [number,number,number]
  const dgray = [80, 80, 80]   as [number,number,number]
  const mgray = [140,140,140]  as [number,number,number]
  const lgray = [230,230,230]  as [number,number,number]
  const green = [43, 130, 84]  as [number,number,number]
  const white = [255,255,255]  as [number,number,number]
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
  const bdr = (x: number, yy: number, w: number, h: number, c: [number,number,number] = lgray) => {
    doc.setDrawColor(...c); doc.setLineWidth(0.3); doc.rect(x, yy, w, h)
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

  // ── Green accent rule ────────────────────────────────────────────────────
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
  y += 3; rule(y); y += 6

  // ── Two-column earnings / deductions ─────────────────────────────────────
  const col = fw / 2 - 4

  // Column headers
  sf('bold', 7.5, mgray); tx('EARNINGS', mg, y)
  sf('bold', 7.5, mgray); tx('DEDUCTIONS', mg + fw/2 + 4, y)
  y += 4; rule(y, lgray, 0.2); y += 4

  // Build earnings rows
  const earningsRows: [string, number][] = [
    ['Regular Pay', result.regularPay],
    ...(result.otPay > 0 ? [[`Overtime (${opts.overtimeMult}×)`, result.otPay] as [string,number]] : []),
    ...result.extraLines.map(e => [e.label, e.amount] as [string,number]),
    // Always show vacation pay line, even when included
    ...(opts.vacType === 'included' ? [[`Vacation Pay (${opts.vacRate}% - included)`, 0] as [string,number]] : 
        result.vacPay > 0 ? [[`Vacation Pay (${opts.vacRate}%)`, result.vacPay] as [string,number]] : []),
  ]
  // Build deductions rows
  const deductRows: [string, number][] = [
    ['CPP', result.cpp1],
    ...(result.cpp2 > 0 ? [['CPP2', result.cpp2] as [string,number]] : []),
    ['EI', result.eiEmployee],
    ...(opts.taxDisplay === 'separate' ? [
      ['Federal Tax', result.fedTax] as [string,number],
      [`Provincial Tax (${company.province})`, result.provTax] as [string,number],
    ] : [
      ['Income Tax', result.fedTax + result.provTax] as [string,number],
    ]),
    ...result.customDeductLines.map(d => [d.label, d.amount] as [string,number]),
  ]

  const maxRows = Math.max(earningsRows.length, deductRows.length)
  const rowH = 6
  for (let i = 0; i < maxRows; i++) {
    if (i % 2 === 0) {
      fr(mg, y - 1, col, rowH, [248,248,248] as [number,number,number])
      fr(mg + fw/2 + 4, y - 1, col, rowH, [248,248,248] as [number,number,number])
    }
    if (earningsRows[i]) {
      sf('normal', 8, dgray); tx(earningsRows[i][0], mg + 1, y + 3.5)
      sf('normal', 8, black); tx(fmtCAD(earningsRows[i][1]), mg + col - 1, y + 3.5, { align: 'right' })
    }
    if (deductRows[i]) {
      sf('normal', 8, dgray); tx(deductRows[i][0], mg + fw/2 + 5, y + 3.5)
      sf('normal', 8, black); tx(fmtCAD(deductRows[i][1]), mg + fw - 1, y + 3.5, { align: 'right' })
    }
    y += rowH
  }

  y += 2; rule(y, lgray, 0.2); y += 4

  // Subtotals
  sf('bold', 8.5, black); tx('Gross Pay', mg + 1, y)
  tx(fmtCAD(result.totalGross), mg + col - 1, y, { align: 'right' })
  sf('bold', 8.5, black); tx('Total Deductions', mg + fw/2 + 5, y)
  tx(fmtCAD(result.totalDeductions + result.customDeductTotal), mg + fw - 1, y, { align: 'right' })
  y += 8; rule(y); y += 6

  // ── Net pay summary box ───────────────────────────────────────────────────
  const boxW = 80; const boxH2 = 18
  const boxX = pageW - mg - boxW
  bdr(boxX, y, boxW, boxH2, green)
  fr(boxX, y, boxW, 7, green)
  sf('bold', 7.5, white); tx('NET PAY', boxX + boxW/2, y + 5, { align: 'center' })
  sf('bold', 14, green); tx(fmtCAD(result.netPay), boxX + boxW/2, y + 14, { align: 'center' })
  y += boxH2 + 5

  // ── Employer contributions ────────────────────────────────────────────────
  sf('bold', 7.5, mgray); tx('EMPLOYER CONTRIBUTIONS (not deducted from employee pay)', mg, y); y += 4
  sf('normal', 7.5, dgray)
  tx(`Employer CPP: ${fmtCAD(result.employerCPP)}   Employer EI: ${fmtCAD(result.eiEmployer)}   Total Employer Cost: ${fmtCAD(result.totalEmployerCost)}`, mg, y)
  y += 8

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
  const navy  = [15, 40, 80]   as [number,number,number]
  const teal  = [0, 120, 140]  as [number,number,number]
  const black = [20, 20, 20]   as [number,number,number]
  const dgray = [70, 70, 70]   as [number,number,number]
  const mgray = [130,130,130]  as [number,number,number]
  const lgray = [220,225,230]  as [number,number,number]
  const altbg = [242,245,248]  as [number,number,number]
  const white = [255,255,255]  as [number,number,number]
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
  sf('normal', 7.5, [180,200,220] as [number,number,number])
  tx(`${company.street}, ${company.city}, ${company.province}  ${company.postal}`, logoEndX, 18)
  if (company.cra_bn) tx(`CRA BN: ${company.cra_bn}`, logoEndX, 23)

  // Right side: PAY STATEMENT label
  sf('bold', 9, [180,200,220] as [number,number,number]); tx('PAY STATEMENT', pageW - mg, 10, { align: 'right' })
  sf('normal', 7.5, [180,200,220] as [number,number,number])
  tx(`${fmtDateDisplay(opts.periodStart)} – ${fmtDateDisplay(opts.periodEnd)}`, pageW - mg, 16, { align: 'right' })
  tx(`Pay Date: ${fmtDateDisplay(opts.payDate)}`, pageW - mg, 22, { align: 'right' })
  y = 34

  // ── Employee info bar ─────────────────────────────────────────────────────
  fr(mg, y, fw, 18, altbg)
  bdr(mg, y, fw, 18)
  const q = fw / 4
  const infoItems = [
    { label: 'Employee', val: employee.name },
    { label: 'ID', val: employee.emp_id ?? 'N/A' },
    { label: 'Title / Dept', val: [employee.job_title, employee.department].filter(Boolean).join(' · ') || '—' },
    { label: 'Payment', val: opts.payMethod === 'cheque' ? `Cheque #${opts.chequeNumber}` : 'Direct Deposit' },
  ]
  infoItems.forEach((item, i) => {
    const x = mg + i * q
    sf('bold', 6, mgray); tx(item.label.toUpperCase(), x + 3, y + 5)
    sf('normal', 8, black); tx(item.val, x + 3, y + 12)
    if (i < 3) { doc.setDrawColor(...lgray); doc.setLineWidth(0.2); doc.line(x + q, y, x + q, y + 18) }
  })
  y += 22

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
    const bg = bold ? [232,238,245] as [number,number,number] : (rowIdx % 2 === 0 ? white : altbg)
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
    fr(mg, y, fw, 5.5, [235,240,248] as [number,number,number])
    sf('bold', 6.5, teal); tx(label.toUpperCase(), mg + 3, y + 4)
    y += 5.5
  }

  // Earnings
  sectionHead('Earnings')
  tableRow('Regular Pay', result.regularPay, opts.ytdPrev.gross - opts.ytdPrev.vac)
  if (result.otPay > 0) tableRow(`Overtime Pay (${opts.overtimeMult}×)`, result.otPay, 0)
  result.extraLines.forEach(e => tableRow(e.label, e.amount, 0))
  // Always show vacation pay line, even when included
  if (opts.vacType === 'included') {
    tableRow(`Vacation Pay (${opts.vacRate}% - included in rate)`, 0, 0)
  } else if (result.vacPay > 0) {
    tableRow(`Vacation Pay (${opts.vacRate}%)`, result.vacPay, opts.ytdPrev.vac)
  }
  tableRow('Gross Pay', result.totalGross, opts.ytdPrev.gross, true)

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
    result.customDeductLines.forEach(d => tableRow(d.label, d.amount, 0))
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

  // ── Employer contributions block ──────────────────────────────────────────
  bdr(mg, y, fw, 16, lgray)
  fr(mg, y, fw, 6.5, altbg)
  sf('bold', 7, mgray); tx('EMPLOYER CONTRIBUTIONS (not deducted from employee pay)', mg + 3, y + 4.5)
  y += 6.5
  const empCols = fw / 3
  const empData = [
    ['Employer CPP', fmtCAD(result.employerCPP)],
    ['Employer EI',  fmtCAD(result.eiEmployer)],
    ['Total Employer Cost', fmtCAD(result.totalEmployerCost)],
  ]
  empData.forEach(([label, val], i) => {
    const x = mg + i * empCols
    sf('bold', 6.5, mgray); tx(label, x + 3, y + 4)
    sf('normal', 8.5, black); tx(val, x + 3, y + 8.5)
    if (i < 2) { doc.setDrawColor(...lgray); doc.setLineWidth(0.2); doc.line(x + empCols, y, x + empCols, y + 9.5) }
  })
  y += 12

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

  return doc.output('blob')
}
