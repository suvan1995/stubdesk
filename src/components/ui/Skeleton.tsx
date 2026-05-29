import clsx from 'clsx'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export default function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'animate-pulse bg-gray-200 dark:bg-gray-700',
        className
      )}
      {...props}
    />
  )
}
