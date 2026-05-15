import { useEffect, useState, createContext, useContext, useCallback } from 'react'
import clsx from 'clsx'

// ── Types ─────────────────────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id:      string
  type:    ToastType
  title:   string
  message?: string
  duration?: number   // ms, default 4000; 0 = sticky
}

interface ToastContextValue {
  toasts:  Toast[]
  toast:   (t: Omit<Toast, 'id'>) => void
  success: (title: string, message?: string) => void
  error:   (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info:    (title: string, message?: string) => void
  dismiss: (id: string) => void
}

// ── Context ───────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { ...t, id }])
    const dur = t.duration ?? 4000
    if (dur > 0) setTimeout(() => dismiss(id), dur)
  }, [dismiss])

  const success = useCallback((title: string, message?: string) => toast({ type: 'success', title, message }), [toast])
  const error   = useCallback((title: string, message?: string) => toast({ type: 'error',   title, message, duration: 6000 }), [toast])
  const warning = useCallback((title: string, message?: string) => toast({ type: 'warning', title, message }), [toast])
  const info    = useCallback((title: string, message?: string) => toast({ type: 'info',    title, message }), [toast])

  return (
    <ToastContext.Provider value={{ toasts, toast, success, error, warning, info, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  )
}

// ── Container ─────────────────────────────────────────────────────────────────
function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  )
}

// ── Item ──────────────────────────────────────────────────────────────────────
const ICONS: Record<ToastType, string> = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
}

const STYLES: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-300 text-green-800',
  error:   'bg-red-50   border-red-300   text-red-800',
  warning: 'bg-yellow-50 border-yellow-300 text-yellow-800',
  info:    'bg-blue-50  border-blue-300  text-blue-800',
}

const ICON_STYLES: Record<ToastType, string> = {
  success: 'bg-green-500  text-white',
  error:   'bg-red-500    text-white',
  warning: 'bg-yellow-500 text-white',
  info:    'bg-blue-500   text-white',
}

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Animate in
    const tid = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(tid)
  }, [])

  return (
    <div
      className={clsx(
        'pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg transition-all duration-300',
        STYLES[t.type],
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      )}
    >
      <span className={clsx('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5', ICON_STYLES[t.type])}>
        {ICONS[t.type]}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{t.title}</div>
        {t.message && <div className="text-xs mt-0.5 opacity-80">{t.message}</div>}
      </div>
      <button onClick={onDismiss} className="text-current opacity-50 hover:opacity-100 text-lg leading-none shrink-0 mt-0.5">×</button>
    </div>
  )
}
