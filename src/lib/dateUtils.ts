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
