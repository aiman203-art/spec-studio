import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  interactive?: boolean
  /** Use cream/light surface instead of dark card */
  light?: boolean
}

export function Card({
  children,
  interactive = false,
  light = false,
  className = '',
  ...rest
}: CardProps) {
  return (
    <div
      className={[
        'rounded-lg border shadow-card',
        light
          ? 'bg-cream border-cream-border text-bg'
          : 'bg-card border-border text-ink',
        interactive
          ? 'cursor-pointer transition-all hover:shadow-card-hover hover:border-muted'
          : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
}
