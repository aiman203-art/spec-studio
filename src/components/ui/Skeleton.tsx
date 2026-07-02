/** Skeleton card grid used as the research loading state (ADR §Screen 4 Phase 2). */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={['animate-pulse rounded-md bg-surface', className].join(' ')}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="rounded-md border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-14" />
      </div>
      <Skeleton className="mb-2 h-6 w-3/4" />
      <Skeleton className="mb-4 h-4 w-1/2" />
      <div className="mb-4 flex gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
