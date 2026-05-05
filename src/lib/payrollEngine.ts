import { TAX_CONSTANTS_2026 } from './taxConstants'
import type { PayslipInputs, PayslipResult, TaxBracket } from '@/types/payroll'

const C = TAX_CONSTANTS_2026

// ── Helpers ──────────────────────────────────────────────────────────────────

function calcBracketTax(income: number, brackets: TaxBracket[]): number {
  let tax = 0
  for (const b of brackets) {
    if (income <= b.min) break
    tax += (Math.min(income, b.max) - b.min) * b.rate
  }
  return Math.max(0, tax)
}

export function calcCPP(periodGross: number, ytdGrossPrior: number) {
  const cpp1Low  = C.CPP1_BASIC_EXEMPTION
  const cpp1High = C.CPP1_MAX_PENSIONABLE

  const priorCPP1Contributory = Math.max(0, Math.min(ytdGrossPrior, cpp1High) - cpp1Low)
  const priorCPP1Paid         = priorCPP1Contributory * C.CPP1_RATE
  const thisCPP1Contributory  = Math.max(0,
    Math.min(ytdGrossPrior + periodGross, cpp1High) - Math.max(ytdGrossPrior, cpp1Low)
  )
  const cpp1 = Math.min(thisCPP1Contributory * C.CPP1_RATE, C.CPP1_MAX_EMPLOYEE - priorCPP1Paid)

  const cpp2Low  = C.CPP1_MAX_PENSIONABLE
  const cpp2High = C.CPP2_CEILING
  const priorCPP2Contributory = Math.max(0, Math.min(ytdGrossPrior, cpp2High) - cpp2Low)
  const priorCPP2Paid         = priorCPP2Contributory * C.CPP2_RATE
  const thisCPP2Contributory  = Math.max(0,
    Math.min(ytdGrossPrior + periodGross, cpp2High) - Math.max(ytdGrossPrior, cpp2Low)
  )
  const cpp2 = Math.min(thisCPP2Contributory * C.CPP2_RATE, C.CPP2_MAX_EMPLOYEE - priorCPP2Paid)

  return {
    cpp1: Math.max(0, cpp1),
    cpp2: Math.max(0, cpp2),
    total: Math.max(0, cpp1) + Math.max(0, cpp2),
  }
}

export function calcEI(periodGross: number, periods: number) {
  const maxPeriod = C.EI_MAX_EMPLOYEE / periods
  const insurable = Math.min(periodGross, C.EI_MAX_INSURABLE / periods)
  const employee  = Math.min(insurable * C.EI_EMPLOYEE_RATE, maxPeriod)
  return { employee, employer: employee * C.EI_EMPLOYER_MULT }
}

export function calcFederalTax(annualGross: number, annualCPP: number, annualEI: number): number {
  const credits  = (C.FED_BASIC_PERSONAL + annualCPP + annualEI) * C.FED_CREDIT_RATE
  return Math.max(0, calcBracketTax(annualGross, C.FED_BRACKETS) - credits)
}

export function calcProvincialTax(
  annualGross: number,
  annualCPP: number,
  annualEI: number,
  province: string
): number {
  let brackets, basicPersonal, creditRate
  if (province === 'ON') {
    brackets = C.ON_BRACKETS; basicPersonal = C.ON_BASIC_PERSONAL; creditRate = C.ON_CREDIT_RATE
  } else if (province === 'AB') {
    brackets = C.AB_BRACKETS; basicPersonal = C.AB_BASIC_PERSONAL; creditRate = C.AB_CREDIT_RATE
  } else {
    brackets = C.BC_BRACKETS; basicPersonal = C.BC_BASIC_PERSONAL; creditRate = C.BC_CREDIT_RATE
  }
  const credits = (basicPersonal + annualCPP + annualEI) * creditRate
  let tax = Math.max(0, calcBracketTax(annualGross, brackets) - credits)
  if (province === 'ON') {
    if (tax > C.ON_SURTAX1_THRESHOLD) tax += (tax - C.ON_SURTAX1_THRESHOLD) * C.ON_SURTAX1_RATE
    if (tax > C.ON_SURTAX2_THRESHOLD) tax += (tax - C.ON_SURTAX2_THRESHOLD) * C.ON_SURTAX2_RATE
  }
  return Math.max(0, tax)
}

// ── Master calculation ────────────────────────────────────────────────────────

export function calculatePayslip(inputs: PayslipInputs): PayslipResult {
  const {
    province, empType, annualSalary, hourlyRate, stdWeeklyHours,
    actualHours, overtimeHours, overtimeMultiplier, periods,
    vacType, vacRate, extraEarnings, customDeductions, ytdPrev,
  } = inputs

  let regularPay = 0, otPay = 0

  if (empType === 'salaried') {
    regularPay = annualSalary / periods
  } else {
    const stdHoursPerPeriod = stdWeeklyHours * (52 / periods)
    const regHours = actualHours > 0
      ? Math.max(0, actualHours - (overtimeHours || 0))
      : stdHoursPerPeriod
    regularPay = regHours * hourlyRate
    otPay      = (overtimeHours || 0) * hourlyRate * (overtimeMultiplier || 1.5)
  }

  const extraLines = extraEarnings.filter(e => e.amount > 0)
  const extraTotal = extraLines.reduce((s, e) => s + e.amount, 0)
  const baseGross  = regularPay + otPay + extraTotal
  const vacPay     = vacType === 'accruing' ? baseGross * (vacRate / 100) : 0
  const totalGross = baseGross + vacPay

  const ytdGrossPrior = ytdPrev?.gross ?? 0
  const cpp = calcCPP(totalGross, ytdGrossPrior)
  const ei  = calcEI(totalGross, periods)

  const annualGross  = totalGross * periods
  const annualCPP    = cpp.total  * periods
  const annualEI     = ei.employee * periods

  const periodFedTax  = calcFederalTax(annualGross, annualCPP, annualEI) / periods
  const periodProvTax = calcProvincialTax(annualGross, annualCPP, annualEI, province) / periods

  const totalDeductions = cpp.cpp1 + cpp.cpp2 + ei.employee + periodFedTax + periodProvTax

  const customDeductLines = customDeductions.filter(d => d.amount > 0)
  const customDeductTotal = customDeductLines.reduce((s, d) => s + d.amount, 0)

  const netPay         = totalGross - totalDeductions - customDeductTotal
  const employerCPP    = cpp.cpp1 + cpp.cpp2
  const employerEI     = ei.employer
  const totalEmployerCost = totalGross + employerCPP + employerEI

  return {
    regularPay, otPay, extraLines, extraTotal,
    baseGross, vacPay, totalGross,
    cpp1: cpp.cpp1, cpp2: cpp.cpp2, totalCPP: cpp.total,
    eiEmployee: ei.employee, eiEmployer: ei.employer,
    fedTax: periodFedTax, provTax: periodProvTax,
    totalDeductions, customDeductLines, customDeductTotal, netPay,
    employerCPP, employerEI, totalEmployerCost,
  }
}

export function fmtCAD(n: number): string {
  return '$' + Math.abs(n).toLocaleString('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
