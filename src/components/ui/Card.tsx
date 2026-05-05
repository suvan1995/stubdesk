import clsx from 'clsx'

interface CardProps {
  children:  React.ReactNode
  className?: string
  padding?:  boolean
}

export function Card({ children, className, padding = true }: CardProps) {
  return (
    <div className={clsx('card', padding && 'p-5', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('text-xs font-bold uppercase tracking-widest text-gray-400 mb-3', className)}>
      {children}
    </div>
  )
}
