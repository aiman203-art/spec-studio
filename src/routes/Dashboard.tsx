import { useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { approvedCount, useProjectStore } from '../store/useProjectStore'
import { DISCIPLINES, PROJECT_TYPE_LABELS, type Discipline, type Project } from '../store/types'
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
          onExport={async (format, selected, includeSummary, includeMoodboard, moodboardCanvas) => {
            setShowDocModal(false)
            toast(`Preparing ${format.toUpperCase()} export…`)
            try {
              if (format === 'pdf') {
                await exportPdf(project, selected, includeSummary, includeMoodboard, moodboardCanvas)
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

// ─── HTML Document Preview ────────────────────────────────────────────────────

function DocPreview({
  project,
  checked,
  includeSummary,
  includeMoodboard,
  onClose,
}: {
  project: Project
  checked: Set<string>
  includeSummary: boolean
  includeMoodboard: boolean
  onClose: () => void
}) {
  const moodboardRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const info = project.info
  const amber = '#c9922a'
  const dark  = '#1a1710'
  const mid   = '#8a7a6a'
  const cream = '#f5f0e8'
  const altRow = '#f0ece4'

  async function handleDownload() {
    setDownloading(true)
    try {
      let canvas: HTMLCanvasElement | undefined
      if (includeMoodboard && moodboardRef.current) {
        canvas = await html2canvas(moodboardRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          allowTaint: true,
        })
      }
      await exportPdf(project, checked, includeSummary, includeMoodboard, canvas)
      onClose()
    } finally {
      setDownloading(false)
    }
  }

  const summaryRows: [string, string][] = [
    ['Style',              describeField(info.style)],
    ['Budget',             describeField(info.budget)],
    ['Colour palette',     describeField(info.colourPalette)],
    ['Materials to avoid', describeField(info.materialsToAvoid)],
    ['Compliance',         describeField(info.compliance)],
    ['Supply chain',       describeField(info.supplyChain)],
    ...Object.entries(info.typeSpecific).map(([k, f]) => [k, describeField(f)] as [string, string]),
  ]

  const locationStr = info.location.state === 'filled' && info.location.value
    ? (info.location.value as { address?: string }).address ?? ''
    : ''
  const meta = [
    describeField(info.client) ? `Client: ${describeField(info.client)}` : null,
    `Type: ${PROJECT_TYPE_LABELS[info.projectType] ?? info.projectType}`,
    locationStr ? `Location: ${locationStr}` : null,
    `Date: ${new Date().toLocaleDateString()}`,
  ].filter(Boolean).join('   ·   ')

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: 'rgba(14,12,9,0.88)' }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{ background: '#16140f', borderBottom: '1px solid #2e2a24' }}
      >
        <div className="flex items-center gap-3">
          <span className="font-serif" style={{ color: cream, fontSize: 18 }}>Document Preview</span>
          <span className="text-caption" style={{ color: mid }}>{info.name || 'Untitled Project'}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="rounded-pill px-5 h-9 text-body font-medium disabled:opacity-60"
            style={{ background: amber, color: '#fff' }}
          >
            {downloading ? 'Preparing…' : '↓ Download PDF'}
          </button>
          <button
            onClick={onClose}
            className="rounded-pill px-4 h-9 text-body"
            style={{ color: mid, border: '1px solid #3a3530' }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Scrollable preview body */}
      <div className="flex-1 overflow-y-auto py-10 px-6" style={{ background: '#2a2520' }}>
        <div
          className="mx-auto"
          style={{ maxWidth: 900, background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
        >
          {/* Amber sidebar + header */}
          <div style={{ display: 'flex' }}>
            <div style={{ width: 8, background: amber, flexShrink: 0 }} />
            <div style={{ flex: 1, padding: '28px 32px 20px' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: dark }}>{info.name || 'Untitled Project'}</div>
              <div style={{ fontSize: 11, color: mid, marginTop: 4 }}>{meta}</div>
            </div>
          </div>

          <div style={{ padding: '0 32px 32px' }}>
            {/* Project summary */}
            {includeSummary && summaryRows.length > 0 && (
              <section style={{ marginTop: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: amber, letterSpacing: 2, marginBottom: 8 }}>PROJECT SUMMARY</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: amber }}>
                      <th style={{ padding: '6px 10px', color: '#fff', textAlign: 'left', width: 160 }}>Field</th>
                      <th style={{ padding: '6px 10px', color: '#fff', textAlign: 'left' }}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.map(([k, v], i) => (
                      <tr key={k} style={{ background: i % 2 === 0 ? '#fff' : altRow }}>
                        <td style={{ padding: '5px 10px', color: mid, fontWeight: 600 }}>{k}</td>
                        <td style={{ padding: '5px 10px', color: dark }}>{v || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {/* Discipline schedules */}
            {DISCIPLINES.map((d) => {
              const items = project[d].approved.filter((a) => checked.has(a.code))
              if (items.length === 0) return null
              return (
                <section key={d} style={{ marginTop: 28 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: amber, letterSpacing: 2, marginBottom: 8 }}>
                    {DISCIPLINE_LABEL[d].toUpperCase()} SCHEDULE
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: dark }}>
                        {['Code', 'Name', 'Manufacturer', 'Finish', 'Colour', 'Room', 'Qty', 'Cost', 'Notes'].map((h) => (
                          <th key={h} style={{ padding: '6px 8px', color: '#fff', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, i) => (
                        <tr key={it.code} style={{ background: i % 2 === 0 ? '#fff' : altRow }}>
                          <td style={{ padding: '5px 8px', color: mid, fontWeight: 600, whiteSpace: 'nowrap' }}>{it.code}</td>
                          <td style={{ padding: '5px 8px', color: dark }}>{it.name}</td>
                          <td style={{ padding: '5px 8px', color: dark }}>{it.manufacturer}</td>
                          <td style={{ padding: '5px 8px', color: dark }}>{it.finish}</td>
                          <td style={{ padding: '5px 8px', color: dark }}>{it.colour}</td>
                          <td style={{ padding: '5px 8px', color: dark }}>{it.room}</td>
                          <td style={{ padding: '5px 8px', color: dark, textAlign: 'center' }}>{it.quantity}</td>
                          <td style={{ padding: '5px 8px', color: dark, whiteSpace: 'nowrap' }}>{it.estimatedCost}</td>
                          <td style={{ padding: '5px 8px', color: mid }}>{it.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )
            })}

            {/* Mood board — visual image grid */}
            {includeMoodboard && (
              <section style={{ marginTop: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: amber, letterSpacing: 2, marginBottom: 12 }}>MOOD BOARD</div>
                <div ref={moodboardRef} style={{ background: '#fff' }}>
                  <MoodboardGrid project={project} />
                </div>
              </section>
            )}

            {/* Footer */}
            <div style={{ marginTop: 32, paddingTop: 12, borderTop: '1px solid #e8e0d4', fontSize: 10, color: mid, textAlign: 'center' }}>
              {info.name || 'Spec Studio'} — generated {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MoodboardGrid({ project }: { project: Project }) {
  const allItems = DISCIPLINES.flatMap((d) => project[d].approved)
  if (allItems.length === 0) return null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
      {allItems.map((item) => (
        <div
          key={item.code}
          style={{
            aspectRatio: '1',
            background: '#f0ece4',
            borderRadius: 4,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              loading="lazy"
              decoding="async"
              crossOrigin="anonymous"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, color: '#c9922a', fontFamily: 'Georgia, serif',
            }}>
              {item.name[0]}
            </div>
          )}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(transparent, rgba(26,23,16,0.82))',
            padding: '16px 6px 5px',
          }}>
            <div style={{ fontSize: 9, color: '#fff', fontWeight: 700, lineHeight: 1.2 }}>{item.name}</div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>{item.manufacturer}</div>
          </div>
        </div>
      ))}
    </div>
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
  onExport: (format: 'xlsx' | 'docx' | 'pdf', selected: Set<string>, includeSummary: boolean, includeMoodboard: boolean, moodboardCanvas?: HTMLCanvasElement) => void
}) {
  const captureRef = useRef<HTMLDivElement>(null)
  const allCodes = DISCIPLINES.flatMap((d) => project[d].approved.map((a) => a.code))
  const [checked, setChecked] = useState<Set<string>>(new Set(allCodes))
  const [disciplineOn, setDisciplineOn] = useState<Set<string>>(new Set(DISCIPLINES))
  const [includeSummary, setIncludeSummary] = useState(true)
  const [includeMoodboard, setIncludeMoodboard] = useState(true)
  const [busy, setBusy] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  async function captureMoodboard(): Promise<HTMLCanvasElement | undefined> {
    if (!includeMoodboard || !captureRef.current) return undefined
    return html2canvas(captureRef.current, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: true,
    })
  }

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
    const canvas = format === 'pdf' ? await captureMoodboard() : undefined
    await onExport(format, checked, includeSummary, includeMoodboard, canvas)
    setBusy(false)
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
              disabled={busy || (checked.size === 0 && !includeSummary && !includeMoodboard)}
              onClick={() => setShowPreview(true)}
              className="rounded-pill px-4 h-9 text-body font-medium transition-all disabled:opacity-40"
              style={{ background: 'transparent', color: '#6b5e4a', border: '1px solid #d6cfc2' }}
            >
              ⊡ Preview
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

      {/* Hidden off-screen moodboard capture target for html2canvas */}
      <div
        ref={captureRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: -9999,
          top: 0,
          width: 900,
          background: '#ffffff',
          pointerEvents: 'none',
        }}
      >
        <MoodboardGrid project={project} />
      </div>

      {/* HTML Preview modal */}
      {showPreview && (
        <DocPreview
          project={project}
          checked={checked}
          includeSummary={includeSummary}
          includeMoodboard={includeMoodboard}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  )
}
