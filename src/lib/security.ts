/**
 * Security utilities for StubDesk
 * - Input sanitization
 * - Client-side rate limiting (login attempts)
 * - Session timeout
 * - SIN masking
 */

// ── Input sanitization ────────────────────────────────────────────────────────

/** Strip HTML tags and dangerous characters from user input */
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')           // strip HTML tags
    .replace(/[<>"'`]/g, '')           // strip dangerous chars
    .trim()
    .substring(0, 500)                 // max length
}

/** Sanitize a name field — letters, spaces, hyphens, apostrophes only */
export function sanitizeName(input: string): string {
  return input
    .replace(/[^a-zA-ZÀ-ÿ\s\-'.]/g, '')
    .trim()
    .substring(0, 100)
}

/** Sanitize a dollar amount — numbers and decimal only */
export function sanitizeAmount(input: string): number {
  const cleaned = input.replace(/[^0-9.]/g, '')
  const parsed  = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : Math.min(parsed, 9_999_999.99)
}

/** Mask a SIN — show only last 3 digits */
export function maskSIN(sin: string | null | undefined): string {
  if (!sin) return '***-***-***'
  const digits = sin.replace(/\D/g, '')
  if (digits.length >= 3) return `***-***-${digits.slice(-3)}`
  return '***-***-***'
}

/** Validate a Canadian postal code */
export function isValidPostalCode(code: string): boolean {
  return /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(code.trim())
}

/** Validate a CRA Business Number (9 digits + optional RT/RP/RC + 4 digits) */
export function isValidCRABN(bn: string): boolean {
  return /^\d{9}(\s?(RT|RP|RC)\d{4})?$/.test(bn.replace(/\s/g, ''))
}

// ── Client-side rate limiting ─────────────────────────────────────────────────
// Tracks failed login attempts in sessionStorage to slow brute force

const RATE_KEY    = 'sd_login_attempts'
const MAX_ATTEMPTS = 5
const LOCKOUT_MS   = 15 * 60 * 1000  // 15 minutes

interface RateRecord { count: number; firstAttempt: number; lockedUntil?: number }

export function recordLoginAttempt(success: boolean): { locked: boolean; remaining: number; unlockIn?: number } {
  const raw = sessionStorage.getItem(RATE_KEY)
  let rec: RateRecord = raw ? JSON.parse(raw) : { count: 0, firstAttempt: Date.now() }

  if (success) {
    sessionStorage.removeItem(RATE_KEY)
    return { locked: false, remaining: MAX_ATTEMPTS }
  }

  // Check if currently locked
  if (rec.lockedUntil && Date.now() < rec.lockedUntil) {
    return { locked: true, remaining: 0, unlockIn: Math.ceil((rec.lockedUntil - Date.now()) / 1000) }
  }

  // Reset if window expired
  if (Date.now() - rec.firstAttempt > LOCKOUT_MS) {
    rec = { count: 0, firstAttempt: Date.now() }
  }

  rec.count++
  if (rec.count >= MAX_ATTEMPTS) {
    rec.lockedUntil = Date.now() + LOCKOUT_MS
  }
  sessionStorage.setItem(RATE_KEY, JSON.stringify(rec))

  return {
    locked:    rec.count >= MAX_ATTEMPTS,
    remaining: Math.max(0, MAX_ATTEMPTS - rec.count),
    unlockIn:  rec.lockedUntil ? Math.ceil((rec.lockedUntil - Date.now()) / 1000) : undefined,
  }
}

export function clearLoginLock() {
  sessionStorage.removeItem(RATE_KEY)
}

export function isLoginLocked(): { locked: boolean; unlockIn?: number } {
  const raw = sessionStorage.getItem(RATE_KEY)
  if (!raw) return { locked: false }
  const rec: RateRecord = JSON.parse(raw)
  if (rec.lockedUntil && Date.now() < rec.lockedUntil) {
    return { locked: true, unlockIn: Math.ceil((rec.lockedUntil - Date.now()) / 1000) }
  }
  return { locked: false }
}

// ── Session timeout ───────────────────────────────────────────────────────────
// Auto sign-out after 30 minutes of inactivity

const TIMEOUT_MS  = 30 * 60 * 1000  // 30 minutes
const TIMEOUT_KEY = 'sd_last_active'

export function updateActivity() {
  localStorage.setItem(TIMEOUT_KEY, String(Date.now()))
}

export function isSessionExpired(): boolean {
  const last = localStorage.getItem(TIMEOUT_KEY)
  if (!last) return false
  return Date.now() - parseInt(last) > TIMEOUT_MS
}

export function startActivityTracking(onExpire: () => void) {
  updateActivity()

  const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
  const handler = () => updateActivity()
  events.forEach(e => window.addEventListener(e, handler, { passive: true }))

  const interval = setInterval(() => {
    if (isSessionExpired()) {
      clearInterval(interval)
      events.forEach(e => window.removeEventListener(e, handler))
      onExpire()
    }
  }, 60_000)  // check every minute

  return () => {
    clearInterval(interval)
    events.forEach(e => window.removeEventListener(e, handler))
  }
}

// ── Content Security Policy meta tag ─────────────────────────────────────────
// Call this once at app startup to inject a CSP meta tag
export function injectCSP() {
  if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) return
  const meta = document.createElement('meta')
  meta.httpEquiv = 'Content-Security-Policy'
  meta.content = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",  // jsPDF
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.supabase.co",
    "connect-src 'self' https://*.supabase.co https://api.stripe.com",
    "frame-src https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; ')
  document.head.appendChild(meta)
}
