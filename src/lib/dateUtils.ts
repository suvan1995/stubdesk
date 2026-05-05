// ── Statutory holidays for ON / AB / BC (2025–2027) ─────────────────────────

function nthWeekday(year: number, month: number, weekday: number, n: number): string {
  const d = new Date(year, month - 1, 1)
  let count = 0
  while (true) {
    if (d.getDay() === weekday) { count++; if (count === n) return fmt(d) }
    d.setDate(d.getDate() + 1)
  }
}

function lastWeekdayBefore(year: number, month: number, day: number, weekday: number): string {
  const d = new Date(year, month - 1, day)
  while (d.getDay() !== weekday) d.setDate(d.getDate() - 1)
  return fmt(d)
}

function easter(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day   = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function goodFriday(year: number): string {
  const e = easter(year)
  e.setDate(e.getDate() - 2)
  return fmt(e)
}

export function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function fmtDisplay(str: string): string {
  if (!str) return ''
  const [y, m, d] = str.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(m)-1]} ${parseInt(d)}, ${y}`
}

export function getStatHolidays(province: string): Record<string, boolean> {
  const holidays: Record<string, boolean> = {}
  const add = (d: string) => { holidays[d] = true }

  for (const year of [2025, 2026, 2027]) {
    add(`${year}-01-01`)                              // New Year's Day
    add(goodFriday(year))                             // Good Friday
    add(`${year}-07-01`)                              // Canada Day
    add(nthWeekday(year, 9, 1, 1))                    // Labour Day (1st Mon Sep)
    add(`${year}-12-25`)                              // Christmas Day

    if (province === 'ON') {
      add(nthWeekday(year, 2, 1, 3))                  // Family Day (3rd Mon Feb)
      add(lastWeekdayBefore(year, 5, 25, 1))          // Victoria Day
      add(nthWeekday(year, 10, 1, 2))                 // Thanksgiving (2nd Mon Oct)
      add(`${year}-12-26`)                            // Boxing Day
    }
    if (province === 'AB') {
      add(nthWeekday(year, 2, 1, 3))                  // Family Day
      add(lastWeekdayBefore(year, 5, 25, 1))          // Victoria Day
      add(nthWeekday(year, 10, 1, 2))                 // Thanksgiving
      add(`${year}-11-11`)                            // Remembrance Day
    }
    if (province === 'BC') {
      add(nthWeekday(year, 2, 1, 3))                  // BC Family Day
      add(lastWeekdayBefore(year, 5, 25, 1))          // Victoria Day
      add(nthWeekday(year, 8, 1, 1))                  // BC Day (1st Mon Aug)
      add(nthWeekday(year, 10, 1, 2))                 // Thanksgiving
      add(`${year}-11-11`)                            // Remembrance Day
    }
  }
  return holidays
}

export function isWeekend(d: Date): boolean {
  return d.getDay() === 0 || d.getDay() === 6
}

export function isStatHoliday(d: Date, province: string): boolean {
  return !!getStatHolidays(province)[fmt(d)]
}

export function addBusinessDays(date: Date, n: number, province: string): Date {
  const d = new Date(date)
  let added = 0
  while (added < n) {
    d.setDate(d.getDate() + 1)
    if (!isWeekend(d) && !isStatHoliday(d, province)) added++
  }
  return d
}

export function prevBusinessDay(date: Date, province: string): Date {
  const d = new Date(date)
  while (isWeekend(d) || isStatHoliday(d, province)) d.setDate(d.getDate() - 1)
  return d
}

// Calculate pay date: offset business days after period end, adjusted for weekends/holidays
export function calcPayDate(periodEnd: string, province: string, offset: number): string {
  const end = new Date(periodEnd + 'T00:00:00')
  let d: Date
  if (offset === 0) {
    d = prevBusinessDay(end, province)
  } else {
    d = addBusinessDays(end, offset, province)
    if (isStatHoliday(d, province)) {
      d.setDate(d.getDate() - 1)
      d = prevBusinessDay(d, province)
    }
  }
  return fmt(d)
}

// Calculate period start/end from first period start + period number
export function calcPeriodDates(
  firstStart: string,
  periodNum: number,
  periodsPerYear: number
): { start: string; end: string } {
  const daysPerPeriod = Math.round(365 / periodsPerYear)
  const start = new Date(firstStart + 'T00:00:00')
  start.setDate(start.getDate() + (periodNum - 1) * daysPerPeriod)
  const end = new Date(start)
  end.setDate(end.getDate() + daysPerPeriod - 1)
  return { start: fmt(start), end: fmt(end) }
}

// ── Period detection ──────────────────────────────────────────────────────────
// Given a pay frequency and an anchor date (employment start or Jan 1),
// figure out which period number today falls in and what the current
// period's start/end dates are.

export interface PeriodInfo {
  periodNumber:  number
  periodStart:   string
  periodEnd:     string
  payDate:       string
  periodsInYear: number
  anchorDate:    string
  anchorWarning?: boolean
}

/**
 * Detect the current pay period by backtracking from today.
 *
 * @param payFrequency      - periods per year: 52 | 26 | 24 | 12
 * @param employmentStart   - employee start date (YYYY-MM-DD) or null
 * @param province          - for pay date business-day adjustment
 * @param payDateOffset     - business days after period end for pay date
 * @param companyFirstPeriod - company's very first pay period start (YYYY-MM-DD)
 *                            This is the correct anchor. If not set, falls back
 *                            to Jan 1 of the current year with a warning flag.
 */
export function detectCurrentPeriod(
  payFrequency:       number,
  _employmentStart:   string | null,
  province:           string,
  payDateOffset = 3,
  companyFirstPeriod: string | null = null
): PeriodInfo & { anchorWarning: boolean } {
  const today          = new Date()
  const year           = today.getFullYear()
  const daysPerPeriod  = Math.round(365 / payFrequency)

  // ── Choose anchor ──────────────────────────────────────────────────────────
  // Priority: companyFirstPeriod > Jan 1 of current year
  // We do NOT use employment start as anchor — the company's pay cycle
  // is independent of when any individual employee started.
  let anchor: Date
  let anchorWarning = false

  if (companyFirstPeriod) {
    // Walk forward from the company's first period start until we find
    // the first period that starts in the current year (or the last one
    // before today if the anchor is already this year).
    const base = new Date(companyFirstPeriod + 'T00:00:00')
    // Find the period that contains Jan 1 of the current year
    const jan1 = new Date(year, 0, 1)
    const msPerDay = 86400000
    const daysSinceBase = Math.floor((jan1.getTime() - base.getTime()) / msPerDay)
    if (daysSinceBase >= 0) {
      // Anchor is in the past — advance to the period that starts on/after Jan 1
      const periodsElapsed = Math.floor(daysSinceBase / daysPerPeriod)
      anchor = new Date(base)
      anchor.setDate(anchor.getDate() + periodsElapsed * daysPerPeriod)
      // If this period started before Jan 1, move one period forward
      if (anchor < jan1) anchor.setDate(anchor.getDate() + daysPerPeriod)
    } else {
      // Company first period is in the future — use Jan 1 as fallback
      anchor = jan1
      anchorWarning = true
    }
  } else {
    // No company first period set — use Jan 1 and warn
    anchor = new Date(year, 0, 1)
    anchorWarning = true
  }

  // ── Count periods from anchor to today ────────────────────────────────────
  const msPerDay        = 86400000
  const daysSinceAnchor = Math.max(0, Math.floor((today.getTime() - anchor.getTime()) / msPerDay))
  const periodIndex     = Math.floor(daysSinceAnchor / daysPerPeriod)

  const periodStart = new Date(anchor)
  periodStart.setDate(periodStart.getDate() + periodIndex * daysPerPeriod)

  const periodEnd = new Date(periodStart)
  periodEnd.setDate(periodEnd.getDate() + daysPerPeriod - 1)

  // ── Period number: count from Jan 1 of current year ───────────────────────
  // Even if anchor is mid-year, period number is relative to the year start
  const jan1Ms      = new Date(year, 0, 1).getTime()
  const anchorMs    = anchor.getTime()
  // How many periods before anchor since Jan 1?
  const preAnchorPeriods = anchorMs > jan1Ms
    ? 0  // anchor is after Jan 1 — period 1 starts at anchor
    : 0
  const periodNumber = preAnchorPeriods + periodIndex + 1

  const payDateStr = calcPayDate(fmt(periodEnd), province, payDateOffset)

  return {
    periodNumber,
    periodStart:   fmt(periodStart),
    periodEnd:     fmt(periodEnd),
    payDate:       payDateStr,
    periodsInYear: payFrequency,
    anchorDate:    fmt(anchor),
    anchorWarning,
  }
}
