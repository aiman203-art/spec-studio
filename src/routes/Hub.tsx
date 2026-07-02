import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { useToast } from '../components/ui/Toast'
import { approvedCount, useProjectStore } from '../store/useProjectStore'
import { DISCIPLINES, PROJECT_TYPE_LABELS } from '../store/types'
import { buildHospitalityDemo, buildResidentialDemo, buildCommercialDemo } from '../data/demoProject'
import { downloadProjectJson, pickImportFile } from '../lib/projectIo'

export function Hub() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const projects = useProjectStore((s) => s.projects)
  const addProject = useProjectStore((s) => s.addProject)
  const deleteProject = useProjectStore((s) => s.deleteProject)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showDemoPicker, setShowDemoPicker] = useState(false)

  function loadDemo(type: 'residential' | 'commercial' | 'hospitality') {
    const builders = {
      residential: buildResidentialDemo,
      commercial: buildCommercialDemo,
      hospitality: buildHospitalityDemo,
    }
    const demo = builders[type]()
    addProject(demo)
    toast('Demo project loaded', 'success')
    setShowDemoPicker(false)
    navigate(`/project/${demo.id}`)
  }

  async function importFile() {
    try {
      const result = await pickImportFile()
      if (!result) return
      addProject(result.project)
      if (result.type === 'schedule') {
        toast('Schedule imported as new project', 'success')
      } else {
        toast('Project imported', 'success')
      }
      navigate(`/project/${result.project.id}`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Import failed', 'error')
    }
  }

  return (
    <AppShell
      actions={
        <>
          <Button variant="ghost" size="sm" onClick={importFile}>Import file</Button>
          <Button size="sm" onClick={() => navigate('/project/new')}>New project</Button>
        </>
      }
    >
      {/* Dark hero section */}
      <section className="border-b border-border bg-bg px-6 py-16 text-center">
        <p className="mb-3 text-caption uppercase tracking-widest text-accent">
          Interior Specification
        </p>
        <h1 className="font-serif text-display-lg text-ink">
          Spec Studio
        </h1>
        <p className="mx-auto mt-4 max-w-md text-body text-muted">
          Research real products with Claude, curate your selections, and export
          professional schedules — all in one place.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button onClick={() => navigate('/project/new')}>Start new project</Button>
          <Button variant="secondary" onClick={() => setShowDemoPicker((v) => !v)}>Load demo →</Button>
        </div>

        {showDemoPicker && (
          <div className="mx-auto mt-6 flex max-w-lg flex-col gap-2 rounded-xl border border-border/40 bg-white/5 p-4">
            <p className="mb-1 text-caption uppercase tracking-widest text-muted">Choose a demo project</p>
            {([
              { type: 'residential', label: 'Residential', sub: 'Mosman Residence — Sydney family home fit-out' },
              { type: 'commercial', label: 'Commercial', sub: 'Northshore Tower — Level 12 office fit-out' },
              { type: 'hospitality', label: 'Hospitality', sub: 'Harbourview Boutique Hotel — Lobby & Suites' },
            ] as const).map(({ type, label, sub }) => (
              <button
                key={type}
                onClick={() => loadDemo(type)}
                className="flex items-center gap-3 rounded-lg border border-border/30 bg-white/5 px-4 py-3 text-left transition-colors hover:border-accent/50 hover:bg-white/10"
              >
                <div>
                  <p className="text-body font-medium text-ink">{label}</p>
                  <p className="text-caption text-muted">{sub}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Cream content section */}
      <section className="min-h-[60vh] bg-cream px-6 py-12">
        <div className="mx-auto max-w-5xl">

          {/* Autosave notice */}
          <div className="mb-8 rounded-lg border border-cream-border bg-cream-dark px-4 py-3 text-body text-faint">
            Projects autosave to this browser only. Export as JSON or generate schedules to keep a durable copy.
          </div>

          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-serif text-title-lg text-bg">
              {projects.length === 0 ? 'Your projects' : `${projects.length} project${projects.length === 1 ? '' : 's'}`}
            </h2>
            {projects.length > 0 && (
              <Button size="sm" onClick={() => navigate('/project/new')}>+ New project</Button>
            )}
          </div>

          {projects.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-cream-border py-20 text-center">
              <p className="font-serif text-title-md text-bg/60">No projects yet</p>
              <p className="mt-2 text-body text-faint">Start one above or load the demo to explore.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="group cursor-pointer rounded-xl border border-cream-border bg-white p-5 shadow-card transition-all hover:shadow-card-hover"
                  onClick={() => navigate(`/project/${p.id}`)}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-serif text-title-sm text-bg group-hover:text-accent transition-colors">
                        {p.info.name || 'Untitled project'}
                      </p>
                      <p className="mt-0.5 text-caption text-faint">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge tone="accent">{PROJECT_TYPE_LABELS[p.info.projectType]}</Badge>
                  </div>
                  <div className="mb-4 flex gap-2">
                    {DISCIPLINES.map((d) => (
                      <span key={d} className="rounded-pill border border-cream-border bg-cream px-2.5 py-0.5 text-caption text-faint">
                        {d[0].toUpperCase() + d.slice(1)}: {approvedCount(p, d)}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" onClick={() => navigate(`/project/${p.id}`)}>Open</Button>
                    <Button size="sm" variant="ghost" onClick={() => downloadProjectJson(p)} className="text-faint">
                      Export JSON
                    </Button>
                    {confirmDeleteId === p.id ? (
                      <>
                        <button
                          onClick={() => { deleteProject(p.id); toast('Project deleted'); setConfirmDeleteId(null) }}
                          className="rounded-pill border border-reject/50 bg-reject/10 px-3 py-1 text-caption text-reject hover:bg-reject/20 transition-colors"
                        >
                          Confirm delete
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-caption text-faint hover:text-bg transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(p.id)}
                        className="rounded-pill border border-cream-border px-3 py-1 text-caption text-faint hover:border-reject/40 hover:text-reject transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </AppShell>
  )
}
