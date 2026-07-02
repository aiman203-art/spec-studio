import { useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Button } from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { useProjectStore } from '../store/useProjectStore'
import { DISCIPLINES, type Discipline } from '../store/types'
import { exportSchedule } from '../lib/export'
import { exportPdf } from '../lib/exportPdf'

const LABEL: Record<Discipline, string> = {
  materials: 'Materials',
  lighting: 'Lighting',
  furniture: 'Furniture',
}

export function Schedules() {
  const { id = '' } = useParams()
  const { toast } = useToast()
  const project = useProjectStore((s) => s.projects.find((p) => p.id === id))
  const updateApprovedItem = useProjectStore((s) => s.updateApprovedItem)
  const removeApprovedItem = useProjectStore((s) => s.removeApprovedItem)
  const clearApprovedItems = useProjectStore((s) => s.clearApprovedItems)

  const [tab, setTab] = useState<Discipline>('materials')
  const [confirmClear, setConfirmClear] = useState(false)
  const [roomFilter, setRoomFilter] = useState<string>('all')
  const [busy, setBusy] = useState(false)

  const items = project?.[tab].approved ?? []
  const rooms = useMemo(
    () => Array.from(new Set(items.map((i) => i.room).filter(Boolean))),
    [items],
  )
  const visible = useMemo(
    () => (roomFilter === 'all' ? items : items.filter((i) => i.room === roomFilter)),
    [items, roomFilter],
  )

  if (!project) return <Navigate to="/" replace />

  const totalApproved = DISCIPLINES.reduce(
    (n, d) => n + project[d].approved.length,
    0,
  )

  async function doExport(format: 'xlsx' | 'docx' | 'pdf') {
    if (totalApproved === 0) {
      toast('Approve some items first', 'error')
      return
    }
    setBusy(true)
    toast(`Preparing ${format.toUpperCase()} export…`)
    try {
      if (format === 'pdf') {
        await exportPdf(project!)
      } else {
        await exportSchedule(project!, format)
      }
      toast(`${format.toUpperCase()} downloaded`, 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Export failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell
      crumbs={[
        { label: project.info.name || 'Project', to: `/project/${id}` },
        { label: 'Schedules' },
      ]}
      actions={
        <>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => doExport('xlsx')}>Excel</Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => doExport('docx')}>Word</Button>
          <Button size="sm" disabled={busy} onClick={() => doExport('pdf')}>PDF</Button>
        </>
      }
    >
      {/* Dark hero */}
      <section className="border-b border-border bg-bg px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-serif text-display-md text-ink">Schedule preview</h1>
          <p className="mt-2 text-body text-muted">
            Only approved items appear. Edit name, notes, and quantity inline before exporting.
          </p>

          {totalApproved > 0 && (
            <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-xl border border-accent/30 bg-accent/10 p-6 sm:flex-row sm:items-center">
              <div>
                <p className="font-serif text-title-md text-accent">Ready to document</p>
                <p className="mt-1 text-body text-muted">
                  {totalApproved} approved item{totalApproved === 1 ? '' : 's'} across{' '}
                  {DISCIPLINES.filter((d) => project[d].approved.length > 0).length} schedule
                  {DISCIPLINES.filter((d) => project[d].approved.length > 0).length === 1 ? '' : 's'}.
                </p>
              </div>
              <div className="flex gap-2">
                <Button disabled={busy} variant="secondary" onClick={() => doExport('xlsx')}>Excel</Button>
                <Button disabled={busy} variant="secondary" onClick={() => doExport('docx')}>Word</Button>
                <Button disabled={busy} onClick={() => doExport('pdf')}>PDF</Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Cream content */}
      <section className="bg-cream px-6 py-8">
        <div className="mx-auto max-w-6xl">
          {/* Tabs */}
          <div className="mb-6 flex items-center justify-between border-b border-cream-border">
            <div className="flex items-center gap-1">
              {DISCIPLINES.map((d) => (
                <button
                  key={d}
                  onClick={() => { setTab(d); setRoomFilter('all'); setConfirmClear(false) }}
                  className={[
                    '-mb-px border-b-2 px-4 py-2 text-body transition-colors',
                    tab === d
                      ? 'border-accent text-bg'
                      : 'border-transparent text-faint hover:text-bg',
                  ].join(' ')}
                >
                  {LABEL[d]} <span className="text-faint">({project[d].approved.length})</span>
                </button>
              ))}
            </div>
            {items.length > 0 && (
              confirmClear ? (
                <div className="mb-1 flex items-center gap-2 text-body">
                  <span className="text-faint">Clear all {LABEL[tab].toLowerCase()}?</span>
                  <button
                    onClick={() => { clearApprovedItems(id, tab); setConfirmClear(false) }}
                    className="rounded-pill border border-reject/50 bg-reject/10 px-3 py-1 text-caption text-reject hover:bg-reject/20 transition-colors"
                  >
                    Yes, clear
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="text-caption text-faint hover:text-bg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="mb-1 rounded-pill border border-cream-border px-3 py-1 text-caption text-faint hover:border-reject/40 hover:text-reject transition-colors"
                >
                  Clear all
                </button>
              )
            )}
          </div>

          {rooms.length > 1 && (
            <div className="mb-4 flex items-center gap-2">
              <span className="text-caption text-faint">Room</span>
              <select
                value={roomFilter}
                onChange={(e) => setRoomFilter(e.target.value)}
                className="h-9 rounded-lg border border-cream-border bg-white px-2 text-body text-bg"
              >
                <option value="all">All rooms</option>
                {rooms.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          )}

          {visible.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-cream-border py-16 text-center">
              <p className="font-serif text-title-sm text-bg/50">No approved {LABEL[tab].toLowerCase()} items yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-cream-border bg-white shadow-card">
              <table className="w-full min-w-[900px] text-body">
                <thead>
                  <tr className="border-b border-cream-border bg-cream text-left text-caption uppercase tracking-wide text-faint">
                    <Th>Code</Th>
                    <Th>Name</Th>
                    <Th>Manufacturer</Th>
                    <Th>Finish / Colour</Th>
                    <Th>Room</Th>
                    <Th>Qty</Th>
                    <Th>Cost</Th>
                    <Th>Notes</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((it) => (
                    <tr key={it.code} className="border-b border-cream-border/60 align-top hover:bg-cream/40 transition-colors">
                      <Td className="text-faint font-mono text-[11px]">{it.code}</Td>
                      <Td>
                        <input
                          value={it.name}
                          onChange={(e) => updateApprovedItem(id, tab, it.code, { name: e.target.value })}
                          className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-bg hover:border-cream-border focus:border-accent focus:outline-none"
                        />
                      </Td>
                      <Td className="text-faint">{it.manufacturer}</Td>
                      <Td className="text-faint">{it.finish}{it.colour ? ` · ${it.colour}` : ''}</Td>
                      <Td className="text-faint">{it.room}</Td>
                      <Td>
                        <input
                          type="number" min={0} value={it.quantity}
                          onChange={(e) => updateApprovedItem(id, tab, it.code, { quantity: Math.max(0, Number(e.target.value) || 0) })}
                          className="w-16 rounded border border-transparent bg-transparent px-1 py-0.5 text-bg hover:border-cream-border focus:border-accent focus:outline-none"
                        />
                      </Td>
                      <Td className="whitespace-nowrap text-faint">{it.estimatedCost}</Td>
                      <Td>
                        <input
                          value={it.notes} placeholder="—"
                          onChange={(e) => updateApprovedItem(id, tab, it.code, { notes: e.target.value })}
                          className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-bg placeholder:text-cream-border hover:border-cream-border focus:border-accent focus:outline-none"
                        />
                      </Td>
                      <Td>
                        <button
                          onClick={() => removeApprovedItem(id, tab, it.code)}
                          title="Remove item"
                          className="rounded p-1 text-faint/50 hover:bg-reject/10 hover:text-reject transition-colors"
                        >
                          ✕
                        </button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  )
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-3 py-2 font-medium">{children}</th>
}
function Td({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <td className={['px-3 py-2', className].join(' ')}>{children}</td>
}
