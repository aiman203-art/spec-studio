import type { Discipline, Project } from '../store/types'
// Discipline re-used below for moodboard flatMap
import { describeField } from './fieldState'

interface ExportItem {
  code: string
  name: string
  manufacturer: string
  finish: string
  colour: string
  room: string
  quantity: number
  pros: string[]
  cons: string[]
  estimatedCost: string
  fireRating: string
  sustainabilityCert: string
  notes: string
  sources: { label: string; url: string }[]
}

function toExportItems(project: Project, d: Discipline, selected?: Set<string>): ExportItem[] {
  return project[d].approved.filter((a) => !selected || selected.has(a.code)).map((a) => ({
    code: a.code,
    name: a.name,
    manufacturer: a.manufacturer,
    finish: a.finish,
    colour: a.colour,
    room: a.room,
    quantity: a.quantity,
    pros: a.pros,
    cons: a.cons,
    estimatedCost: a.estimatedCost,
    fireRating: a.fireRating,
    sustainabilityCert: a.sustainabilityCert,
    notes: a.notes,
    sources: a.sources,
  }))
}

export async function exportSchedule(
  project: Project,
  format: 'xlsx' | 'docx',
  selected?: Set<string>,
  includeSummary?: boolean,
  includeMoodboard?: boolean,
): Promise<void> {
  const info = project.info

  const projectSummary = includeSummary ? [
    { label: 'Project name', value: info.name || '—' },
    { label: 'Client', value: describeField(info.client) },
    { label: 'Project type', value: info.projectType },
    { label: 'Style', value: describeField(info.style) },
    { label: 'Budget', value: describeField(info.budget) },
    { label: 'Colour palette', value: describeField(info.colourPalette) },
    { label: 'Materials to avoid', value: describeField(info.materialsToAvoid) },
    { label: 'Compliance', value: describeField(info.compliance) },
    { label: 'Supply chain', value: describeField(info.supplyChain) },
  ] : undefined

  const moodboard = includeMoodboard
    ? (['materials', 'lighting', 'furniture'] as Discipline[]).flatMap((d) =>
        project[d].approved.map((a) => ({
          discipline: d.charAt(0).toUpperCase() + d.slice(1),
          name: a.name,
          manufacturer: a.manufacturer,
          finish: a.finish,
          colour: a.colour,
          estimatedCost: a.estimatedCost,
          room: a.room,
        })),
      )
    : undefined

  const payload = {
    meta: {
      projectName: info.name || 'Untitled project',
      client: info.client.state === 'filled' ? describeField(info.client) : '',
      date: new Date().toLocaleDateString(),
    },
    disciplines: {
      materials: toExportItems(project, 'materials', selected),
      lighting: toExportItems(project, 'lighting', selected),
      furniture: toExportItems(project, 'furniture', selected),
    },
    projectSummary,
    moodboard,
  }

  const res = await fetch(`/api/export/${format}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    let message = `Export failed (${res.status})`
    try {
      const data = (await res.json()) as { error?: string }
      if (data.error) message = data.error
    } catch {
      /* binary or empty */
    }
    throw new Error(message)
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safe =
    (project.info.name || 'schedule').replace(/[^\w-]+/g, '_').slice(0, 40) ||
    'schedule'
  a.href = url
  a.download = `${safe}_schedule.${format}`
  a.click()
  URL.revokeObjectURL(url)
}
