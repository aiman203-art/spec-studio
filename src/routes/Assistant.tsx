import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { SkeletonGrid } from '../components/ui/Skeleton'
import { RecommendationCard } from '../components/RecommendationCard'
import { useToast } from '../components/ui/Toast'
import { useProjectStore } from '../store/useProjectStore'
import { SCOPE_FIELDS } from '../store/scopeFields'
import type { Discipline, ScopeForm } from '../store/types'
import { describeField } from '../lib/fieldState'
import { requestResearch } from '../lib/research'

const LABEL: Record<Discipline, string> = {
  materials: 'Materials',
  lighting: 'Lighting',
  furniture: 'Furniture',
}

type Phase = 'scope' | 'loading' | 'review'

export function Assistant({ discipline }: { discipline: Discipline }) {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const project = useProjectStore((s) => s.projects.find((p) => p.id === id))
  const setScope = useProjectStore((s) => s.setScope)
  const setRecommendations = useProjectStore((s) => s.setRecommendations)
  const setItemStatus = useProjectStore((s) => s.setItemStatus)
  const submitSelections = useProjectStore((s) => s.submitSelections)

  const defs = SCOPE_FIELDS[discipline]
  const disc = project?.[discipline]

  const [scopeDraft, setScopeDraft] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {}
    for (const d of defs) base[d.id] = disc?.scope?.[d.id] ?? ''
    return base
  })
  const [phase, setPhase] = useState<Phase>(
    (disc?.recommendations.length ?? 0) > 0 ? 'review' : 'scope',
  )
  const [error, setError] = useState<string | null>(null)

  const recommendations = disc?.recommendations ?? []
  const approvedCount = useMemo(
    () => recommendations.filter((r) => r.status === 'approved').length,
    [recommendations],
  )

  if (!project) return <Navigate to="/" replace />

  async function runResearch() {
    const missing = defs.filter((d) => d.required && !scopeDraft[d.id]?.trim())
    if (missing.length) {
      toast(`Fill: ${missing.map((m) => m.label).join(', ')}`, 'error')
      return
    }
    const scope: ScopeForm = { room: scopeDraft.room ?? '', ...scopeDraft }
    setScope(id, discipline, scope)
    setError(null)
    setPhase('loading')
    try {
      const existingCodes = [
        ...(disc?.approved.map((a) => a.code) ?? []),
        ...recommendations.map((r) => r.code),
      ]
      const items = await requestResearch({
        discipline,
        projectInfo: project!.info,
        scope,
        existingCodes,
      })
      if (items.length === 0) {
        setError('No options were returned. Try adjusting the scope.')
        setPhase('scope')
        return
      }
      setRecommendations(id, discipline, items)
      setPhase('review')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Research failed')
      setPhase('scope')
    }
  }

  function submit() {
    const n = submitSelections(id, discipline)
    toast(
      n > 0
        ? `${n} ${LABEL[discipline].toLowerCase()} item${n === 1 ? '' : 's'} approved`
        : 'No items approved — nothing added',
      n > 0 ? 'success' : 'info',
    )
    navigate(`/project/${id}`)
  }

  return (
    <AppShell
      crumbs={[
        { label: project.info.name || 'Project', to: `/project/${id}` },
        { label: LABEL[discipline] },
      ]}
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-[300px_1fr]">
        {/* Left: scope form / context */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            <h2 className="text-title-sm text-ink">{LABEL[discipline]} scope</h2>
            <p className="mt-1 text-caption text-muted">
              {project.info.name}
            </p>

            <div className="mt-4 grid gap-4">
              {defs.map((d) => (
                <div key={d.id}>
                  <label className="mb-1.5 block text-caption text-muted">
                    {d.label}
                    {d.required && <span className="text-reject"> *</span>}
                  </label>
                  {d.options ? (
                    <select
                      value={scopeDraft[d.id] ?? ''}
                      disabled={phase === 'loading'}
                      onChange={(e) =>
                        setScopeDraft((s) => ({ ...s, [d.id]: e.target.value }))
                      }
                      className="h-11 w-full rounded-sm border border-border bg-surface px-3 text-body text-ink focus-visible:ring-focus"
                    >
                      <option value="">Select…</option>
                      {d.options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={scopeDraft[d.id] ?? ''}
                      disabled={phase === 'loading'}
                      placeholder={d.placeholder}
                      onChange={(e) =>
                        setScopeDraft((s) => ({ ...s, [d.id]: e.target.value }))
                      }
                      className="h-11 w-full rounded-sm border border-border bg-surface px-3 text-body text-ink placeholder:text-faint focus-visible:ring-focus"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-5">
              <Button
                className="w-full"
                disabled={phase === 'loading'}
                onClick={runResearch}
              >
                {phase === 'review' ? 'Re-run research' : 'Research options'}
              </Button>
            </div>
            {error && <p className="mt-3 text-caption text-reject">{error}</p>}
          </Card>

          {/* Brief context */}
          <Card className="mt-4 grid gap-1 p-5 text-caption">
            <ContextRow label="Style" value={describeField(project.info.style)} />
            <ContextRow label="Budget" value={describeField(project.info.budget)} />
            <ContextRow label="Palette" value={describeField(project.info.colourPalette)} />
            <ContextRow label="Avoid" value={describeField(project.info.materialsToAvoid)} />
          </Card>
        </aside>

        {/* Right: results */}
        <section>
          {phase === 'scope' && (
            <EmptyState discipline={discipline} />
          )}

          {phase === 'loading' && (
            <div>
              <p className="mb-4 flex items-center gap-2 text-body text-muted">
                <span className="h-2 w-2 animate-pulse rounded-pill bg-accent" />
                Claude is researching real {LABEL[discipline].toLowerCase()} options…
              </p>
              <SkeletonGrid count={6} />
            </div>
          )}

          {phase === 'review' && (
            <>
              <div className="grid grid-cols-1 gap-5">
                {recommendations.map((item) => (
                  <RecommendationCard
                    key={item.code}
                    item={item}
                    onSetStatus={(status) =>
                      setItemStatus(id, discipline, item.code, status)
                    }
                  />
                ))}
              </div>

              {/* Sticky status bar */}
              <div className="sticky bottom-0 mt-6 flex items-center justify-between rounded-md border border-border bg-card/95 px-5 py-3 backdrop-blur">
                <span className="text-body text-muted">
                  <span className="text-ink">{approvedCount}</span> of{' '}
                  {recommendations.length} approved
                </span>
                <Button onClick={submit}>Submit selections</Button>
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  )
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-16 shrink-0 text-faint">{label}</span>
      <span className="text-muted">{value}</span>
    </div>
  )
}

function EmptyState({ discipline }: { discipline: Discipline }) {
  return (
    <Card className="flex h-full min-h-[300px] flex-col items-center justify-center p-10 text-center">
      <p className="text-title-sm text-ink">Set the scope, then research</p>
      <p className="mt-2 max-w-sm text-body text-muted">
        Fill in the {LABEL[discipline].toLowerCase()} scope on the left and
        Claude will search for real, in-budget products to review and approve.
      </p>
    </Card>
  )
}
