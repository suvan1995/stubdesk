// Payroll calculation types — mirrors the logic from payslip.html

export interface TaxConstants {
  CPP1_RATE: number
  CPP1_BASIC_EXEMPTION: number
  CPP1_MAX_PENSIONABLE: number
  CPP1_MAX_EMPLOYEE: number
  CPP2_RATE: number
  CPP2_CEILING: number
  CPP2_MAX_EMPLOYEE: number
  EI_EMPLOYEE_RATE: number
  EI_EMPLOYER_MULT: number
  EI_MAX_INSURABLE: number
  EI_MAX_EMPLOYEE: number
  FED_BASIC_PERSONAL: number
  FED_CREDIT_RATE: number
  FED_BRACKETS: TaxBracket[]
  ON_BASIC_PERSONAL: number
  ON_CREDIT_RATE: number
  ON_SURTAX1_THRESHOLD: number
  ON_SURTAX1_RATE: number
  ON_SURTAX2_THRESHOLD: number
  ON_SURTAX2_RATE: number
  ON_BRACKETS: TaxBracket[]
  AB_BASIC_PERSONAL: number
  AB_CREDIT_RATE: number
  AB_BRACKETS: TaxBracket[]
  BC_BASIC_PERSONAL: number
  BC_CREDIT_RATE: number
  BC_BRACKETS: TaxBracket[]
}

export interface TaxBracket {
  min: number
  max: number
  rate: number
}

export type Province = 'ON' | 'AB' | 'BC'
export type EmpType  = 'salaried' | 'hourly'
export type PayFreq  = 52 | 26 | 24 | 12
export type PayMethod = 'eft' | 'cheque'
export type VacType  = 'accruing' | 'included'

export interface ExtraEarning {
  label: string
  amount: number
}

export interface CustomDeduction {
  label: string
  amount: number
}

export interface YTDPrior {
  gross:  number
  vac:    number
  cpp1:   number
  cpp2:   number
  ei:     number
  fed:    number
  prov:   number
  custom: number
  net:    number
}

export interface PayslipInputs {
  province:    Province
  empType:     EmpType
  annualSalary: number
  hourlyRate:  number
  stdWeeklyHours: number
  actualHours: number
  overtimeHours: number
  overtimeMultiplier: number
  periods:     PayFreq
  vacType:     VacType
  vacRate:     number
  extraEarnings: ExtraEarning[]
  customDeductions: CustomDeduction[]
  ytdPrev:     YTDPrior
  periodStart: string
  periodEnd:   string
  payDate:     string
  effectivePayDate: string
  payMethod:   PayMethod
  chequeNumber: string
  chequeDate:  string
  empJobTitle: string
  empDepartment: string
  payslipNotes: string
  selectedTemplate: number
  logoDataURL: string | null
  displayPeriodNum: { num: number; basis: 'year' | 'employment' } | null
}

export interface PayslipResult {
  regularPay:       number
  otPay:            number
  extraLines:       ExtraEarning[]
  extraTotal:       number
  baseGross:        number
  vacPay:           number
  totalGross:       number
  cpp1:             number
  cpp2:             number
  totalCPP:         number
  eiEmployee:       number
  eiEmployer:       number
  fedTax:           number
  provTax:          number
  totalDeductions:  number
  customDeductLines: CustomDeduction[]
  customDeductTotal: number
  netPay:           number
  employerCPP:      number
  employerEI:       number
  totalEmployerCost: number
}
