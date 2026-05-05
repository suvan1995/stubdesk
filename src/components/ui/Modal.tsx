import { useEffect, useRef } from 'react'
import clsx from 'clsx'

interface ModalProps {
  open:     boolean
  onClose:  () => void
  title:    string
  subtitle?: string
  children: React.ReactNode
  footer?:  React.ReactNode
  size?:    'sm' | 'md' | 'lg' | 'xl'
}

export default function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto"
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className={clsx('bg-white rounded-2xl shadow-2xl w-full mt-16 mb-8 overflow-hidden', widths[size])}>
        {/* Header */}
        <div className="bg-brand-600 px-6 py-4 flex items-start justify-between">
          <div>
            <h3 className="text-white font-bold text-base">{title}</h3>
            {subtitle && <p className="text-brand-200 text-xs mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-xl leading-none ml-4 mt-0.5"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[65vh] overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 items-center flex-wrap">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
