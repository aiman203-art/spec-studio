import { useState } from 'react'
import { Badge } from './ui/Badge'
import type { ItemStatus, RecommendationItem } from '../store/types'

export function RecommendationCard({
  item,
  onSetStatus,
}: {
  item: RecommendationItem
  onSetStatus: (status: ItemStatus) => void
}) {
  const rejected = item.status === 'rejected'
  const approved = item.status === 'approved'
  const [imgError, setImgError] = useState(false)
  const trustedImage = item.imageUrl || ''
  const hasImage = !!trustedImage && !imgError

  return (
    <div
      className={[
        'overflow-hidden rounded-xl border shadow-card transition-all',
        approved ? 'border-approve/50' : rejected ? 'border-reject/40 opacity-55' : 'border-cream-border',
      ].join(' ')}
    >
      <div className="flex flex-col sm:flex-row">
        {/* ── Side image panel ── */}
        <div className="relative w-full shrink-0 sm:w-56 lg:w-64">
          {hasImage ? (
            <img
              src={trustedImage}
              alt={item.name}
              onError={() => setImgError(true)}
              className="h-48 w-full object-cover sm:h-full"
            />
          ) : (
            /* Placeholder with initials when no image */
            <div className="flex h-48 w-full items-center justify-center bg-card sm:h-full">
              <span className="font-serif text-display-md text-muted/30 select-none">
                {item.name.charAt(0)}
              </span>
            </div>
          )}

          {/* Status ribbon overlay */}
          {(approved || rejected) && (
            <div className={[
              'absolute inset-x-0 bottom-0 py-1.5 text-center text-caption font-medium',
              approved ? 'bg-approve/80 text-white' : 'bg-reject/70 text-white',
            ].join(' ')}>
              {approved ? '✓ Approved' : '✕ Rejected'}
            </div>
          )}
        </div>

        {/* ── Info panel ── */}
        <div className="flex flex-1 flex-col bg-white p-5">
          {/* Header */}
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <span className="text-caption uppercase tracking-widest text-faint">{item.code}</span>
              <h3 className="font-serif text-title-sm text-bg">{item.name}</h3>
              <p className="text-body text-faint">{item.manufacturer}</p>
            </div>
            {item.room && <Badge tone="muted">{item.room}</Badge>}
          </div>

          {/* Finish / colour */}
          <p className="mb-3 text-body text-faint">
            <span className="text-bg/60">Finish </span>{item.finish}
            {item.colour && <><span className="text-bg/40"> · </span><span className="text-bg/60">Colour </span>{item.colour}</>}
          </p>

          {/* Spec pills */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {Object.entries(item.specs).slice(0, 3).map(([k, v]) => (
              <span key={k} className="rounded-pill border border-cream-border bg-cream px-2.5 py-0.5 text-caption text-faint">
                <span className="text-bg/50">{k}:</span> {v}
              </span>
            ))}
          </div>

          {/* Rationale */}
          <div className="mb-3 rounded-lg border border-cream-border bg-cream p-3">
            <p className="text-body text-bg/80">{item.rationale}</p>
          </div>

          {/* Compliance */}
          {item.compliance.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {item.compliance.map((c, i) => (
                <Badge key={i} tone={c.passed ? 'approve' : 'reject'}>
                  {c.passed ? '✓' : '✕'} {c.label}
                </Badge>
              ))}
            </div>
          )}

          {/* Pros / cons */}
          <div className="mb-3 grid grid-cols-2 gap-3 text-caption">
            <ul className="space-y-1">
              {item.pros.map((p, i) => (
                <li key={i} className="text-faint"><span className="text-approve font-medium">+</span> {p}</li>
              ))}
            </ul>
            <ul className="space-y-1">
              {item.cons.map((c, i) => (
                <li key={i} className="text-faint"><span className="text-reject font-medium">−</span> {c}</li>
              ))}
            </ul>
          </div>

          {/* Cost + sources */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-caption">
            <span className="font-medium text-accent">{item.estimatedCost}</span>
            <div className="flex flex-wrap gap-3">
              {item.sources.map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noreferrer"
                  className="text-faint underline-offset-2 hover:text-accent hover:underline transition-colors">
                  {s.label} ↗
                </a>
              ))}
            </div>
          </div>

          {/* Approve / Reject */}
          <div className="mt-auto flex gap-2">
            <button
              onClick={() => onSetStatus(approved ? 'pending' : 'approved')}
              className={[
                'h-9 flex-1 rounded-pill border text-body font-medium transition-all',
                approved
                  ? 'border-approve bg-approve/15 text-approve'
                  : 'border-cream-border text-faint hover:border-approve/50 hover:text-approve',
              ].join(' ')}
            >
              {approved ? '✓ Approved' : 'Approve'}
            </button>
            <button
              onClick={() => onSetStatus(rejected ? 'pending' : 'rejected')}
              className={[
                'h-9 flex-1 rounded-pill border text-body font-medium transition-all',
                rejected
                  ? 'border-reject bg-reject/15 text-reject'
                  : 'border-cream-border text-faint hover:border-reject/50 hover:text-reject',
              ].join(' ')}
            >
              {rejected ? '✕ Rejected' : 'Reject'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
