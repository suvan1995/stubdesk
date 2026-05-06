import { TAX_CONSTANTS_2026 } from './taxConstants'
import type { PayslipInputs, PayslipResult, TaxBracket, TaxConstants } from '@/types/payroll'

// Live constants — updated from DB via taxStore, falls back to hardcoded 2026
let _liveConstants: TaxConstants = TAX_CONSTANTS_2026

export function setLiveTaxConstants(c: TaxConstants) {
  _liveConstants = c
}

// Always read through this getter so the engine uses whatever is current
function C(): TaxConstants { return _liveConstants }

// ── Helpers ──────────────────────────────────────────────────────────────────

// Round to 2 decimal places to avoid floating-point precision issues
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function calcBracketTax(income: number, brackets: TaxBracket[]): number {
  let tax = 0
  for (const b of brackets) {
    if (income <= b.min) break
    tax += (Math.min(income, b.max) - b.min) * b.rate
  }
  return Math.max(0, tax)
}

export function calcCPP(periodGross: number, ytdGrossPrior: number, periods = 26) {
  // CRA T4127 method: prorate the $3,500 annual basic exemption per pay period.
  // This ensures CPP is collected every period rather than being zero until
  // cumulative earnings exceed $3,500.
  //
  // Per-period exemption = $3,500 / number of pay periods
  // Contributory earnings this period = periodGross - periodExemption
  // Capped at the per-period YMPE ceiling.

  const annualExemption = C().CPP1_BASIC_EXEMPTION   // $3,500
  const periodExemption = annualExemption / periods  // e.g. $134.62 for bi-weekly

  // CPP1 — contributory earnings this period (prorated exemption method)
  const cpp1PeriodContributory = Math.max(0, periodGross - periodExemption)
  // Cap at per-period YMPE ceiling
  const cpp1PeriodCeiling = (C().CPP1_MAX_PENSIONABLE - annualExemption) / periods
  const cpp1Contributory  = Math.min(cpp1PeriodContributory, cpp1PeriodCeiling)
  const cpp1Raw           = cpp1Contributory * C().CPP1_RATE

  // Annual cap check — don't exceed CPP1_MAX_EMPLOYEE across all periods
  // Use ytdGrossPrior to estimate how much CPP1 has already been paid
  const priorContributory = Math.max(0,
    Math.min(ytdGrossPrior, C().CPP1_MAX_PENSIONABLE) - annualExemption
  )
  const priorCPP1Paid = priorContributory * C().CPP1_RATE
  const cpp1 = Math.min(cpp1Raw, Math.max(0, C().CPP1_MAX_EMPLOYEE - priorCPP1Paid))

  // CPP2 — only applies once annual earnings exceed YMPE ($74,600)
  // Use cumulative YTD approach for CPP2 (no per-period exemption for CPP2)
  const cpp2Low  = C().CPP1_MAX_PENSIONABLE
  const cpp2High = C().CPP2_CEILING
  const priorCPP2Contributory = Math.max(0, Math.min(ytdGrossPrior, cpp2High) - cpp2Low)
  const priorCPP2Paid         = priorCPP2Contributory * C().CPP2_RATE
  const thisCPP2Contributory  = Math.max(0,
    Math.min(ytdGrossPrior + periodGross, cpp2High) - Math.max(ytdGrossPrior, cpp2Low)
  )
  const cpp2 = Math.min(thisCPP2Contributory * C().CPP2_RATE, C().CPP2_MAX_EMPLOYEE - priorCPP2Paid)

  return {
    cpp1: Math.max(0, round2(cpp1)),
    cpp2: Math.max(0, round2(cpp2)),
    total: Math.max(0, round2(cpp1)) + Math.max(0, round2(cpp2)),
  }
}

export function calcEI(periodGross: number, periods: number) {
  const maxPeriod = C().EI_MAX_EMPLOYEE / periods
  const insurable = Math.min(periodGross, C().EI_MAX_INSURABLE / periods)
  const employee  = round2(Math.min(insurable * C().EI_EMPLOYEE_RATE, maxPeriod))
  return { employee, employer: round2(employee * C().EI_EMPLOYER_MULT) }
}

export function calcFederalTax(annualGross: number, annualCPP: number, annualEI: number): number {
  const credits  = (C().FED_BASIC_PERSONAL + annualCPP + annualEI) * C().FED_CREDIT_RATE
  return Math.max(0, calcBracketTax(annualGross, C().FED_BRACKETS) - credits)
}

export function calcProvincialTax(
  annualGross: number,
  annualCPP: number,
  annualEI: number,
  province: string
): number {
  let brackets, basicPersonal, creditRate
  if (province === 'ON') {
    brackets = C().ON_BRACKETS; basicPersonal = C().ON_BASIC_PERSONAL; creditRate = C().ON_CREDIT_RATE
  } else if (province === 'AB') {
    brackets = C().AB_BRACKETS; basicPersonal = C().AB_BASIC_PERSONAL; creditRate = C().AB_CREDIT_RATE
  } else {
    brackets = C().BC_BRACKETS; basicPersonal = C().BC_BASIC_PERSONAL; creditRate = C().BC_CREDIT_RATE
  }
  const credits = (basicPersonal + annualCPP + annualEI) * creditRate
  let tax = Math.max(0, calcBracketTax(annualGross, brackets) - credits)
  if (province === 'ON') {
    if (tax > C().ON_SURTAX1_THRESHOLD) tax += (tax - C().ON_SURTAX1_THRESHOLD) * C().ON_SURTAX1_RATE
    if (tax > C().ON_SURTAX2_THRESHOLD) tax += (tax - C().ON_SURTAX2_THRESHOLD) * C().ON_SURTAX2_RATE
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
    regularPay = round2(annualSalary / periods)
  } else {
    const stdHoursPerPeriod = stdWeeklyHours * (52 / periods)
    const regHours = actualHours > 0
      ? Math.max(0, actualHours - (overtimeHours || 0))
      : stdHoursPerPeriod
    regularPay = round2(regHours * hourlyRate)
    otPay      = round2((overtimeHours || 0) * hourlyRate * (overtimeMultiplier || 1.5))
  }

  const extraLines = extraEarnings.filter(e => e.amount > 0)
  const extraTotal = round2(extraLines.reduce((s, e) => s + e.amount, 0))
  const baseGross  = round2(regularPay + otPay + extraTotal)
  const vacPay     = vacType === 'accruing' ? round2(baseGross * (vacRate / 100)) : 0
  const totalGross = round2(baseGross + vacPay)

  const ytdGrossPrior = ytdPrev?.gross ?? 0
  const cpp = calcCPP(totalGross, ytdGrossPrior, periods)
  const ei  = calcEI(totalGross, periods)

  const annualGross  = totalGross * periods
  const annualCPP    = cpp.total  * periods
  const annualEI     = ei.employee * periods

  const periodFedTax  = round2(calcFederalTax(annualGross, annualCPP, annualEI) / periods)
  const periodProvTax = round2(calcProvincialTax(annualGross, annualCPP, annualEI, province) / periods)

  const totalDeductions = round2(cpp.cpp1 + cpp.cpp2 + ei.employee + periodFedTax + periodProvTax)

  const customDeductLines = customDeductions.filter(d => d.amount > 0)
  const customDeductTotal = round2(customDeductLines.reduce((s, d) => s + d.amount, 0))

  const netPay         = round2(totalGross - totalDeductions - customDeductTotal)
  const employerCPP    = round2(cpp.cpp1 + cpp.cpp2)
  const employerEI     = round2(ei.employer)
  const totalEmployerCost = round2(totalGross + employerCPP + employerEI)

  return {
    regularPay, otPay, extraLines, extraTotal,
    baseGross, vacPay, totalGross,
    cpp1: round2(cpp.cpp1), cpp2: round2(cpp.cpp2), totalCPP: round2(cpp.total),
    eiEmployee: round2(ei.employee), eiEmployer: employerEI,
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
