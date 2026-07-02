import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-pill text-label font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-focus'

const variants: Record<Variant, string> = {
  primary:   'bg-accent text-bg hover:bg-accent-hover active:bg-accent-active shadow-sm',
  secondary: 'bg-surface text-ink border border-border hover:border-muted hover:bg-card',
  ghost:     'bg-transparent text-muted hover:text-ink hover:bg-surface',
  danger:    'bg-transparent text-reject border border-reject/40 hover:bg-reject/10',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-4 text-body',
  md: 'h-10 px-6',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button className={[base, variants[variant], sizes[size], className].join(' ')} {...rest}>
      {children}
    </button>
  )
}
