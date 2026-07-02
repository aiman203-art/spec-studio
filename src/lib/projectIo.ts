import * as XLSX from 'xlsx'
import type { ApprovedItem, Discipline, Project } from '../store/types'
import { field } from './fieldState'

/** Download a project as a JSON file (the "save your work" escape hatch). */
export function downloadProjectJson(project: Project) {
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safe = project.info.name.replace(/[^\w-]+/g, '_').slice(0, 40) || 'project'
  a.href = url
  a.download = `${safe}.specstudio.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** Parse + lightly validate an imported project JSON. Throws on bad shape. */
export function parseProjectJson(text: string): Project {
  const data = JSON.parse(text) as Project
  if (
    !data ||
    typeof data.id !== 'string' ||
    !data.info ||
    !data.materials ||
    !data.lighting ||
    !data.furniture
  ) {
    throw new Error('Not a valid Spec Studio project file.')
  }
  return data
}

/** Parse an Excel or CSV schedule export into a new Project shell. */
function parseScheduleFile(buffer: ArrayBuffer): Project {
  const wb = XLSX.read(buffer, { type: 'array' })

  const disciplineMap: Record<string, Discipline> = {
    materials: 'materials',
    lighting: 'lighting',
    furniture: 'furniture',
  }

  function makeEmpty() {
    return { scope: { room: '' }, recommendations: [], itemCounter: 0, approved: [] as ApprovedItem[] }
  }

  const result: Record<Discipline, ReturnType<typeof makeEmpty>> = {
    materials: makeEmpty(),
    lighting: makeEmpty(),
    furniture: makeEmpty(),
  }

  for (const sheetName of wb.SheetNames) {
    const key = sheetName.toLowerCase().trim()
    const disc = disciplineMap[key]
    if (!disc) continue

    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[sheetName], { defval: '' })
    const items: ApprovedItem[] = rows.map((row, i) => {
      const code = row['Code'] || row['code'] || `${disc.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`
      const finishColour = row['Finish / Colour'] || row['Finish/Colour'] || ''
      const [finish = '', colour = ''] = finishColour.split('·').map((s: string) => s.trim())
      return {
        code,
        name: row['Name'] || row['name'] || 'Unnamed item',
        manufacturer: row['Manufacturer'] || row['manufacturer'] || '',
        finish,
        colour,
        room: row['Room'] || row['room'] || '',
        quantity: Number(row['Qty'] || row['Quantity'] || 1) || 1,
        estimatedCost: row['Cost'] || row['Estimated Cost'] || '',
        notes: row['Notes'] || row['notes'] || '',
        specs: {},
        rationale: '',
        compliance: [],
        pros: [],
        cons: [],
        sources: [],
        fireRating: row['Fire Rating'] || '',
        sustainabilityCert: row['Sustainability Cert'] || '',
        imageUrl: '',
        status: 'approved' as const,
      }
    })
    result[disc].approved = items
    result[disc].itemCounter = items.length
  }

  const id = ('IMP' + Math.random().toString(36).slice(2, 7)).toUpperCase()
  return {
    id,
    createdAt: new Date().toISOString(),
    info: {
      projectType: 'commercial',
      mixedUseTypes: [],
      name: 'Imported Schedule',
      client: field('', 'empty'),
      style: field('', 'empty'),
      budget: field('', 'empty'),
      location: field({ address: '', lat: null, lng: null }, 'empty'),
      colourPalette: field('', 'empty'),
      materialsToAvoid: field('', 'empty'),
      compliance: field('', 'empty'),
      supplyChain: field('', 'empty'),
      typeSpecific: {},
    },
    materials: result.materials,
    lighting: result.lighting,
    furniture: result.furniture,
  }
}

export type ImportResult =
  | { type: 'project'; project: Project }
  | { type: 'schedule'; project: Project }

/**
 * Open a file picker accepting JSON project files, Excel schedules, and CSV.
 * Returns a parsed ImportResult or null if the user cancelled.
 */
export function pickImportFile(): Promise<ImportResult | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.xlsx,.xls,.csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)

      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''

      if (ext === 'json') {
        const reader = new FileReader()
        reader.onload = () => {
          try {
            const project = parseProjectJson(String(reader.result))
            resolve({ type: 'project', project })
          } catch (e) {
            resolve(null)
          }
        }
        reader.onerror = () => resolve(null)
        reader.readAsText(file)
      } else {
        // Excel or CSV — treat as schedule import
        const reader = new FileReader()
        reader.onload = () => {
          try {
            const buffer = reader.result as ArrayBuffer
            const project = parseScheduleFile(buffer)
            resolve({ type: 'schedule', project })
          } catch {
            resolve(null)
          }
        }
        reader.onerror = () => resolve(null)
        reader.readAsArrayBuffer(file)
      }
    }
    input.click()
  })
}

/** @deprecated use pickImportFile */
export function pickJsonFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => resolve(null)
      reader.readAsText(file)
    }
    input.click()
  })
}
