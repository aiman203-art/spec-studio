import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export interface Crumb {
  label: string
  to?: string
}

export function AppShell({
  crumbs = [],
  actions,
  children,
}: {
  crumbs?: Crumb[]
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-bg/95 px-6 backdrop-blur">
        <nav className="flex items-center gap-3 text-body">
          <Link to="/" className="flex items-center gap-2.5">
            {/* Warm amber logo mark */}
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" fill="white" fillOpacity="0.9"/>
              </svg>
            </span>
            <span className="font-serif text-title-sm tracking-tight text-ink">Spec Studio</span>
          </Link>
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-3 text-muted">
              <span className="text-faint">/</span>
              {c.to ? (
                <Link to={c.to} className="hover:text-ink transition-colors">{c.label}</Link>
              ) : (
                <span className="text-ink">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
        <div className="flex items-center gap-3">{actions}</div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
