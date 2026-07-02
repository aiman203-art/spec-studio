import type { ReactNode } from 'react'

type Tone = 'neutral' | 'accent' | 'approve' | 'reject' | 'muted'

const tones: Record<Tone, string> = {
  neutral: 'bg-surface border-border text-ink',
  accent:  'bg-accent/20 border-accent/40 text-accent',
  approve: 'bg-approve/15 border-approve/30 text-approve',
  reject:  'bg-reject/15 border-reject/30 text-reject',
  muted:   'bg-surface border-border text-muted',
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={['inline-flex items-center rounded-pill border px-2.5 py-0.5 text-caption tracking-wide uppercase', tones[tone]].join(' ')}>
      {children}
    </span>
  )
}
