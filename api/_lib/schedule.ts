// Shared schedule column definitions for xlsx + docx exports.
// Column set per ADR §API Design (export) plus Room/Qty/Notes which the
// schedule screen makes editable. Self-contained types so the export bundles
// don't import browser code.

export type Discipline = 'materials' | 'lighting' | 'furniture'

export interface ExportItem {
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

export interface SummaryRow { label: string; value: string }
export interface MoodboardItem { discipline: string; name: string; manufacturer: string; finish: string; colour: string; estimatedCost: string; room: string }

export interface ExportPayload {
  meta: { projectName: string; client: string; date: string }
  disciplines: Partial<Record<Discipline, ExportItem[]>>
  projectSummary?: SummaryRow[]
  moodboard?: MoodboardItem[]
}

export const DISCIPLINE_TITLE: Record<Discipline, string> = {
  materials: 'Materials & Finishes Schedule',
  lighting: 'Lighting Schedule',
  furniture: 'Furniture Schedule',
}

export const COLUMNS: { header: string; get: (i: ExportItem) => string }[] = [
  { header: 'Code', get: (i) => i.code },
  { header: 'Name', get: (i) => i.name },
  { header: 'Manufacturer', get: (i) => i.manufacturer },
  { header: 'Finish', get: (i) => i.finish },
  { header: 'Colour', get: (i) => i.colour },
  { header: 'Room', get: (i) => i.room },
  { header: 'Qty', get: (i) => String(i.quantity ?? '') },
  { header: 'Advantages', get: (i) => (i.pros ?? []).join('; ') },
  { header: 'Disadvantages', get: (i) => (i.cons ?? []).join('; ') },
  { header: 'Estimated Cost', get: (i) => i.estimatedCost },
  { header: 'Fire Rating', get: (i) => i.fireRating },
  { header: 'Sustainability Cert', get: (i) => i.sustainabilityCert },
  { header: 'Notes', get: (i) => i.notes ?? '' },
  { header: 'Source URL', get: (i) => (i.sources ?? []).map((s) => s.url).join(', ') },
]

export function activeDisciplines(payload: ExportPayload): Discipline[] {
  return (['materials', 'lighting', 'furniture'] as Discipline[]).filter(
    (d) => (payload.disciplines[d]?.length ?? 0) > 0,
  )
}

export function safeFileName(name: string): string {
  return name.replace(/[^\w-]+/g, '_').slice(0, 40) || 'schedule'
}
