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

export function calcCPP(
  periodGross: number,
  ytdGrossPrior: number,
  periods = 26,
  ytdCPP1Prior = 0,
  ytdCPP2Prior = 0,
) {
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
  const estimatedPriorCPP1Paid = priorContributory * C().CPP1_RATE
  const priorCPP1Paid = ytdCPP1Prior > 0 ? ytdCPP1Prior : estimatedPriorCPP1Paid
  const cpp1 = Math.min(cpp1Raw, Math.max(0, C().CPP1_MAX_EMPLOYEE - priorCPP1Paid))

  // CPP2 — only applies once annual earnings exceed YMPE ($74,600)
  // Use cumulative YTD approach for CPP2 (no per-period exemption for CPP2)
  const cpp2Low  = C().CPP1_MAX_PENSIONABLE
  const cpp2High = C().CPP2_CEILING
  const priorCPP2Contributory = Math.max(0, Math.min(ytdGrossPrior, cpp2High) - cpp2Low)
  const estimatedPriorCPP2Paid = priorCPP2Contributory * C().CPP2_RATE
  const priorCPP2Paid         = ytdCPP2Prior > 0 ? ytdCPP2Prior : estimatedPriorCPP2Paid
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

export function calcEI(periodGross: number, ytdGrossPrior = 0, ytdEIPrior = 0) {
  const remainingInsurable = Math.max(0, C().EI_MAX_INSURABLE - ytdGrossPrior)
  const insurable = Math.min(periodGross, remainingInsurable)
  const remainingEmployeePremium = Math.max(0, C().EI_MAX_EMPLOYEE - ytdEIPrior)
  const employee  = round2(Math.min(insurable * C().EI_EMPLOYEE_RATE, remainingEmployeePremium))
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
    const baseOntarioTax = tax
    tax += Math.max(0, baseOntarioTax - C().ON_SURTAX1_THRESHOLD) * C().ON_SURTAX1_RATE
    tax += Math.max(0, baseOntarioTax - C().ON_SURTAX2_THRESHOLD) * C().ON_SURTAX2_RATE
  }
  return Math.max(0, tax)
}

// ── YTD Estimator ─────────────────────────────────────────────────────────────
// Simulates all prior periods for an employee using their standard pay settings.
// Used when no prior payslips exist in the DB (e.g. switching from another system).

export interface YTDEstimate {
  gross:  number
  vac:    number
  cpp1:   number
  cpp2:   number
  ei:     number
  fed:    number
  prov:   number
  net:    number
  custom: number
  periodsSimulated: number
}

export function estimateYTD(
  priorPeriods: number,          // number of periods already paid (periodNumber - 1)
  province: string,
  empType: 'salaried' | 'hourly',
  annualSalary: number,
  hourlyRate: number,
  stdWeeklyHours: number,
  periods: number,               // pay frequency (52/26/24/12)
  vacType: 'accruing' | 'included',
  vacRate: number,
): YTDEstimate {
  if (priorPeriods <= 0) {
    return { gross: 0, vac: 0, cpp1: 0, cpp2: 0, ei: 0, fed: 0, prov: 0, net: 0, custom: 0, periodsSimulated: 0 }
  }

  let cumGross  = 0
  let cumVac    = 0
  let cumCpp1   = 0
  let cumCpp2   = 0
  let cumEi     = 0
  let cumFed    = 0
  let cumProv   = 0
  let cumNet    = 0

  for (let p = 0; p < priorPeriods; p++) {
    // Build a minimal input for this period using standard pay only
    const inputs: PayslipInputs = {
      province:           province as 'ON' | 'AB' | 'BC',
      empType,
      annualSalary,
      hourlyRate,
      stdWeeklyHours,
      actualHours:        0,
      overtimeHours:      0,
      overtimeMultiplier: 1.5,
      periods:            periods as 52 | 26 | 24 | 12,
      vacType,
      vacRate,
      extraEarnings:      [],
      customDeductions:   [],
      ytdPrev: {
        gross:  cumGross,
        vac:    cumVac,
        cpp1:   cumCpp1,
        cpp2:   cumCpp2,
        ei:     cumEi,
        fed:    cumFed,
        prov:   cumProv,
        custom: 0,
        net:    cumNet,
      },
      periodStart:        '',
      periodEnd:          '',
      payDate:            '',
      effectivePayDate:   '',
      payMethod:          'eft',
      chequeNumber:       '',
      chequeDate:         '',
      empJobTitle:        '',
      empDepartment:      '',
      payslipNotes:       '',
      selectedTemplate:   1,
      logoDataURL:        null,
      displayPeriodNum:   null,
    }

    const r = calculatePayslip(inputs)

    cumGross += r.totalGross
    cumVac   += r.vacPay
    cumCpp1  += r.cpp1
    cumCpp2  += r.cpp2
    cumEi    += r.eiEmployee
    cumFed   += r.fedTax
    cumProv  += r.provTax
    cumNet   += r.netPay
  }

  return {
    gross:  round2(cumGross),
    vac:    round2(cumVac),
    cpp1:   round2(cumCpp1),
    cpp2:   round2(cumCpp2),
    ei:     round2(cumEi),
    fed:    round2(cumFed),
    prov:   round2(cumProv),
    net:    round2(cumNet),
    custom: 0,
    periodsSimulated: priorPeriods,
  }
}

// ── Input validation ──────────────────────────────────────────────────────────

export interface PayslipValidationError {
  field: string
  message: string
}

export function validatePayslipInputs(inputs: PayslipInputs): PayslipValidationError[] {
  const errors: PayslipValidationError[] = []

  if (!inputs.province || !['ON','AB','BC'].includes(inputs.province)) {
    errors.push({ field: 'province', message: 'Province must be ON, AB, or BC' })
  }
  if (!inputs.empType || !['salaried','hourly'].includes(inputs.empType)) {
    errors.push({ field: 'empType', message: 'Employment type must be salaried or hourly' })
  }
  if (inputs.empType === 'salaried' && (isNaN(inputs.annualSalary) || inputs.annualSalary < 0)) {
    errors.push({ field: 'annualSalary', message: 'Annual salary must be a non-negative number' })
  }
  if (inputs.empType === 'hourly' && (isNaN(inputs.hourlyRate) || inputs.hourlyRate < 0)) {
    errors.push({ field: 'hourlyRate', message: 'Hourly rate must be a non-negative number' })
  }
  if (inputs.empType === 'hourly' && inputs.hourlyRate > 0 && inputs.hourlyRate < 10) {
    errors.push({ field: 'hourlyRate', message: 'Hourly rate seems too low — below $10/hr' })
  }
  if (!inputs.periods || ![52,26,24,12].includes(inputs.periods)) {
    errors.push({ field: 'periods', message: 'Pay frequency must be 52, 26, 24, or 12' })
  }
  if (isNaN(inputs.vacRate) || inputs.vacRate < 0 || inputs.vacRate > 25) {
    errors.push({ field: 'vacRate', message: 'Vacation rate must be between 0% and 25%' })
  }
  if (inputs.overtimeHours < 0) {
    errors.push({ field: 'overtimeHours', message: 'Overtime hours cannot be negative' })
  }
  if (inputs.overtimeMultiplier < 1) {
    errors.push({ field: 'overtimeMultiplier', message: 'Overtime multiplier must be at least 1.0' })
  }
  if (!inputs.periodStart || !inputs.periodEnd) {
    errors.push({ field: 'periodDates', message: 'Pay period start and end dates are required' })
  }
  if (inputs.periodStart && inputs.periodEnd && inputs.periodStart > inputs.periodEnd) {
    errors.push({ field: 'periodDates', message: 'Period start must be before period end' })
  }
  for (const e of inputs.extraEarnings) {
    if (isNaN(e.amount) || e.amount < 0) {
      errors.push({ field: 'extraEarnings', message: `Extra earning "${e.label}" has an invalid amount` })
    }
  }
  for (const d of inputs.customDeductions) {
    if (isNaN(d.amount) || d.amount < 0) {
      errors.push({ field: 'customDeductions', message: `Deduction "${d.label}" has an invalid amount` })
    }
  }

  return errors
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
  const cpp = calcCPP(totalGross, ytdGrossPrior, periods, ytdPrev?.cpp1 ?? 0, ytdPrev?.cpp2 ?? 0)
  const ei  = calcEI(totalGross, ytdGrossPrior, ytdPrev?.ei ?? 0)

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
