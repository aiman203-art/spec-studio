import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { approvedCount, useProjectStore } from '../store/useProjectStore'
import { DISCIPLINES, PROJECT_TYPE_LABELS, type Discipline } from '../store/types'
import { describeField } from '../lib/fieldState'
import { useToast } from '../components/ui/Toast'
import { exportSchedule } from '../lib/export'
import { exportPdf } from '../lib/exportPdf'

const DISCIPLINE_LABEL: Record<Discipline, string> = {
  materials: 'Materials',
  lighting: 'Lighting',
  furniture: 'Furniture',
}

const DISCIPLINE_ICON: Record<Discipline, string> = {
  materials: '◼',
  lighting:  '◎',
  furniture: '⬡',
}

export function Dashboard() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const project = useProjectStore((s) => s.projects.find((p) => p.id === id))
  const [showSummary, setShowSummary] = useState(false)
  const [showDocModal, setShowDocModal] = useState(false)
  const { toast } = useToast()

  if (!project) return <Navigate to="/" replace />
  const { info } = project

  return (
    <AppShell crumbs={[{ label: info.name || 'Project' }]}>
      {/* Dark hero header */}
      <section className="border-b border-border bg-bg px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-2 flex items-center gap-3">
            <Badge tone="accent">Active</Badge>
          </div>
          <h1 className="font-serif text-display-md text-ink">
            {info.name || 'Untitled project'}
          </h1>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-body text-muted">
            <span><span className="text-faint">Client </span>{describeField(info.client)}</span>
            <span><span className="text-faint">Type </span>{PROJECT_TYPE_LABELS[info.projectType]}</span>
            <span>
              <span className="text-faint">Location </span>
              {info.location.state === 'filled' ? info.location.value.address || '—' : describeField(info.location)}
            </span>
            <span><span className="text-faint">Style </span>{describeField(info.style)}</span>
            <span><span className="text-faint">Budget </span>{describeField(info.budget)}</span>
          </div>
        </div>
      </section>

      {/* Cream content */}
      <section className="bg-cream px-6 py-10">
        <div className="mx-auto max-w-5xl">

          {/* Metric cards */}
          <div className="mb-16 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {DISCIPLINES.map((d) => (
              <button
                key={d}
                onClick={() => navigate(`/project/${id}/${d}`)}
                className="group rounded-xl border border-cream-border bg-white p-6 text-left shadow-card transition-all hover:shadow-card-hover hover:border-accent/40"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-caption uppercase tracking-widest text-faint">{DISCIPLINE_LABEL[d]}</span>
                  <span className="text-lg text-accent opacity-60 group-hover:opacity-100 transition-opacity">{DISCIPLINE_ICON[d]}</span>
                </div>
                <p className="font-serif text-display-md text-bg leading-none">
                  {approvedCount(project, d)}
                </p>
                <p className="mt-1 text-caption text-faint">approved items</p>
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-3">
              {[
                { label: 'Schedules', action: () => navigate(`/project/${id}/schedules`) },
                { label: 'Mood board', action: () => navigate(`/project/${id}/moodboard`) },
                { label: showSummary ? 'Hide summary' : 'Project summary', action: () => setShowSummary((s) => !s) },
              ].map(({ label, action }) => (
                <button
                  key={label}
                  onClick={action}
                  className="inline-flex items-center justify-center rounded-pill px-6 h-10 text-label font-medium transition-all"
                  style={{ background: '#e2dbd0', color: '#3d3020', border: '1px solid #cfc8bc' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#d6cfc2')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#e2dbd0')}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button onClick={() => setShowDocModal(true)}>
              Generate documentation
            </Button>
          </div>

          {showSummary && (
            <div className="mt-6 rounded-xl border border-cream-border bg-white p-6 shadow-card">
              <h3 className="font-serif text-title-sm text-bg mb-4">Project brief</h3>
              <div className="grid gap-2.5 text-body">
                <SummaryRow label="Colour palette" value={describeField(info.colourPalette)} />
                <SummaryRow label="Materials to avoid" value={describeField(info.materialsToAvoid)} />
                <SummaryRow label="Compliance" value={describeField(info.compliance)} />
                <SummaryRow label="Supply chain" value={describeField(info.supplyChain)} />
                {Object.entries(info.typeSpecific).map(([k, f]) => (
                  <SummaryRow key={k} label={k} value={describeField(f)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
      {showDocModal && (
        <DocModal
          project={project}
          onClose={() => setShowDocModal(false)}
          onExport={async (format, selected, includeSummary, includeMoodboard) => {
            setShowDocModal(false)
            toast(`Preparing ${format.toUpperCase()} export…`)
            try {
              if (format === 'pdf') {
                await exportPdf(project, selected, includeSummary, includeMoodboard)
              } else {
                await exportSchedule(project, format, selected, includeSummary, includeMoodboard)
              }
              toast(`${format.toUpperCase()} downloaded`, 'success')
            } catch (e) {
              toast(e instanceof Error ? e.message : 'Export failed', 'error')
            }
          }}
        />
      )}
    </AppShell>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <span className="w-44 shrink-0 text-faint">{label}</span>
      <span className="text-bg">{value}</span>
    </div>
  )
}

function DocModal({
  project,
  onClose,
  onExport,
}: {
  project: ReturnType<typeof useProjectStore.getState>['projects'][0]
  onClose: () => void
  onExport: (format: 'xlsx' | 'docx' | 'pdf', selected: Set<string>, includeSummary: boolean, includeMoodboard: boolean) => void
}) {
  const allCodes = DISCIPLINES.flatMap((d) => project[d].approved.map((a) => a.code))
  const [checked, setChecked] = useState<Set<string>>(new Set(allCodes))
  const [disciplineOn, setDisciplineOn] = useState<Set<string>>(new Set(DISCIPLINES))
  const [includeSummary, setIncludeSummary] = useState(true)
  const [includeMoodboard, setIncludeMoodboard] = useState(true)
  const [busy, setBusy] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)

  function toggle(code: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(code) ? next.delete(code) : next.add(code)
      return next
    })
  }

  function toggleDiscipline(d: string, codes: string[]) {
    const isOn = disciplineOn.has(d)
    setDisciplineOn((prev) => {
      const next = new Set(prev)
      isOn ? next.delete(d) : next.add(d)
      return next
    })
    setChecked((prev) => {
      const next = new Set(prev)
      codes.forEach((c) => (isOn ? next.delete(c) : next.add(c)))
      return next
    })
  }

  async function handleExport(format: 'xlsx' | 'docx' | 'pdf') {
    if (checked.size === 0 && !includeSummary && !includeMoodboard) return
    setBusy(true)
    await onExport(format, checked, includeSummary, includeMoodboard)
    setBusy(false)
  }

  async function handlePreview() {
    if (checked.size === 0 && !includeSummary && !includeMoodboard) return
    setPreviewing(true)
    try {
      const url = await exportPdf(project, checked, includeSummary, includeMoodboard, undefined, 'bloburl')
      if (url) setPreviewUrl(url as string)
    } finally {
      setPreviewing(false)
    }
  }

  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(14,12,9,0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-card-hover overflow-hidden"
        style={{ background: '#faf7f2', border: '1px solid #d6cfc2' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-6 pb-4" style={{ borderBottom: '1px solid #e8e0d4' }}>
          <div>
            <h2 className="font-serif text-title-md" style={{ color: '#1a1710' }}>Generate documentation</h2>
            <p className="mt-0.5 text-body" style={{ color: '#8a7a6a' }}>Select items to include in the export</p>
          </div>
          <button onClick={onClose} className="text-xl leading-none" style={{ color: '#a89880' }}>✕</button>
        </div>

        {/* Section toggles */}
        <div className="px-7 pt-5 pb-3 space-y-2" style={{ borderBottom: '1px solid #e8e0d4' }}>
          <p className="text-caption uppercase tracking-widest mb-3" style={{ color: '#c9922a' }}>Document sections</p>
          {[
            { label: 'Project summary', sub: 'Client, style, budget, colour palette', value: includeSummary, set: setIncludeSummary },
            { label: 'Mood board', sub: 'All approved items as a reference list', value: includeMoodboard, set: setIncludeMoodboard },
          ].map(({ label, sub, value, set }) => (
            <label key={label} className="flex items-start gap-3 cursor-pointer py-1">
              <input type="checkbox" checked={value} onChange={() => set((v) => !v)}
                className="h-4 w-4 rounded mt-0.5 cursor-pointer shrink-0" style={{ accentColor: '#c9922a' }} />
              <div>
                <span className="text-body" style={{ color: '#1a1710' }}>{label}</span>
                <span className="ml-2 text-caption" style={{ color: '#a89880' }}>{sub}</span>
              </div>
            </label>
          ))}
        </div>

        {/* Item list */}
        <div className="max-h-72 overflow-y-auto px-7 py-5 space-y-5">
          {DISCIPLINES.map((d) => {
            const items = project[d].approved
            if (items.length === 0) return null
            const codes = items.map((a) => a.code)
            return (
              <div key={d}>
                {/* Discipline header with select-all */}
                <div className="flex items-center gap-3 mb-2">
                  <input
                    type="checkbox"
                    checked={disciplineOn.has(d)}
                    onChange={() => toggleDiscipline(d, codes)}
                    className="h-4 w-4 rounded accent-amber-600 cursor-pointer"
                  />
                  <span className="text-caption uppercase tracking-widest font-medium" style={{ color: '#c9922a' }}>
                    {DISCIPLINE_LABEL[d]}
                  </span>
                </div>
                <div className="space-y-0.5 mt-1">
                  {items.map((item) => (
                    <label key={item.code} className="flex items-center gap-3 py-1 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={checked.has(item.code)}
                        onChange={() => toggle(item.code)}
                        className="h-4 w-4 rounded accent-amber-600 cursor-pointer shrink-0"
                      />
                      <span className="flex-1" style={{ color: '#1a1710', fontSize: '12px' }}>{item.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-7 py-4" style={{ borderTop: '1px solid #e8e0d4' }}>
          <span className="text-caption" style={{ color: '#8a7a6a' }}>
            {checked.size} item{checked.size !== 1 ? 's' : ''}
            {includeSummary ? ' · summary' : ''}
            {includeMoodboard ? ' · mood board' : ''}
          </span>
          <div className="flex gap-2">
            <button
              disabled={previewing || busy || (checked.size === 0 && !includeSummary && !includeMoodboard)}
              onClick={handlePreview}
              className="rounded-pill px-4 h-9 text-body font-medium transition-all disabled:opacity-40"
              style={{ background: 'transparent', color: '#6b5e4a', border: '1px solid #d6cfc2' }}
            >
              {previewing ? '…' : '⊡ Preview'}
            </button>
            {([
              { fmt: 'xlsx', label: 'Excel', bg: '#e2dbd0', color: '#3d3020', border: '1px solid #d6cfc2' },
              { fmt: 'docx', label: 'Word',  bg: '#2d5fa6', color: '#fff',    border: 'none' },
              { fmt: 'pdf',  label: 'PDF',   bg: '#c9922a', color: '#fff',    border: 'none' },
            ] as const).map(({ fmt, label, bg, color, border }) => (
              <button
                key={fmt}
                disabled={busy || (checked.size === 0 && !includeSummary && !includeMoodboard)}
                onClick={() => handleExport(fmt)}
                className="rounded-pill px-4 h-9 text-body font-medium transition-all disabled:opacity-40"
                style={{ background: bg, color, border }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* PDF Preview modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[60] flex flex-col"
          style={{ background: 'rgba(14,12,9,0.85)' }}
        >
          {/* Preview toolbar */}
          <div className="flex items-center justify-between px-6 py-3 shrink-0" style={{ background: '#1a1710', borderBottom: '1px solid #2e2a24' }}>
            <div className="flex items-center gap-3">
              <span className="font-serif text-title-sm" style={{ color: '#f5f0e8' }}>
                PDF Preview
              </span>
              <span className="text-caption" style={{ color: '#8a7a6a' }}>
                {project.info.name || 'Untitled Project'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { closePreview(); handleExport('pdf') }}
                className="rounded-pill px-5 h-9 text-body font-medium"
                style={{ background: '#c9922a', color: '#fff' }}
              >
                ↓ Download PDF
              </button>
              <button
                onClick={closePreview}
                className="rounded-pill px-4 h-9 text-body"
                style={{ background: 'transparent', color: '#8a7a6a', border: '1px solid #3a3530' }}
              >
                Close
              </button>
            </div>
          </div>

          {/* iframe */}
          <iframe
            src={previewUrl}
            className="flex-1 w-full"
            style={{ border: 'none', background: '#2a2520' }}
            title="PDF Preview"
          />
        </div>
      )}
    </div>
  )
}
