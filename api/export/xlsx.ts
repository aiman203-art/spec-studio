import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as XLSX from 'xlsx'
import {
  activeDisciplines,
  COLUMNS,
  DISCIPLINE_TITLE,
  safeFileName,
  type ExportPayload,
} from '../_lib/schedule.js'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  let payload: ExportPayload
  try {
    payload =
      typeof req.body === 'string'
        ? JSON.parse(req.body)
        : (req.body as ExportPayload)
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' })
    return
  }

  const disciplines = activeDisciplines(payload)
  const hasSummary = (payload.projectSummary?.length ?? 0) > 0
  const hasMoodboard = (payload.moodboard?.length ?? 0) > 0
  if (disciplines.length === 0 && !hasSummary && !hasMoodboard) {
    res.status(400).json({ error: 'No content selected to export.' })
    return
  }

  const wb = XLSX.utils.book_new()
  const header = COLUMNS.map((c) => c.header)

  // Project Summary sheet
  if (hasSummary) {
    const aoa = [
      ['Project Summary'],
      [`${payload.meta.projectName} · ${payload.meta.date}`],
      [],
      ['Field', 'Value'],
      ...(payload.projectSummary ?? []).map((r) => [r.label, r.value]),
    ]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!cols'] = [{ wch: 24 }, { wch: 48 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Project Summary')
  }

  // Discipline sheets
  for (const d of disciplines) {
    const items = payload.disciplines[d] ?? []
    const rows = items.map((it) => COLUMNS.map((c) => c.get(it)))
    const aoa = [
      [DISCIPLINE_TITLE[d]],
      [`${payload.meta.projectName} · ${payload.meta.client} · ${payload.meta.date}`],
      [],
      header,
      ...rows,
    ]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!cols'] = COLUMNS.map((c) => ({
      wch: Math.max(c.header.length + 2, 16),
    }))
    XLSX.utils.book_append_sheet(
      wb,
      ws,
      d.charAt(0).toUpperCase() + d.slice(1),
    )
  }

  // Mood Board sheet
  if (hasMoodboard) {
    const mbHeader = ['Discipline', 'Name', 'Manufacturer', 'Finish', 'Colour', 'Room', 'Cost']
    const aoa = [
      ['Mood Board — Approved Items'],
      [`${payload.meta.projectName} · ${payload.meta.date}`],
      [],
      mbHeader,
      ...(payload.moodboard ?? []).map((it) => [it.discipline, it.name, it.manufacturer, it.finish, it.colour, it.room, it.estimatedCost]),
    ]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!cols'] = mbHeader.map(() => ({ wch: 20 }))
    XLSX.utils.book_append_sheet(wb, ws, 'Mood Board')
  }

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  const filename = `${safeFileName(payload.meta.projectName)}_schedule.xlsx`

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.status(200).send(buffer)
}
