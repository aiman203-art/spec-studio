import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import {
  activeDisciplines,
  columnsFor,
  DISCIPLINE_TITLE,
  safeFileName,
  type Discipline,
  type ExportItem,
  type ExportPayload,
  type MoodboardItem,
  type SummaryRow,
} from '../_lib/schedule.js'

function headerCell(text: string): TableCell {
  return new TableCell({
    shading: { fill: 'E6E8EC' },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 16 })],
      }),
    ],
  })
}

function bodyCell(text: string): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, size: 16 })] })],
  })
}

function summaryTable(rows: SummaryRow[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((r) => new TableRow({
      children: [
        new TableCell({ shading: { fill: 'F5F0E8' }, children: [new Paragraph({ children: [new TextRun({ text: r.label, bold: true, size: 16 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.value, size: 16 })] })] }),
      ],
    })),
  })
}

function moodboardTable(items: MoodboardItem[]): Table {
  const headers = ['Discipline', 'Name', 'Manufacturer', 'Finish / Colour', 'Room', 'Cost']
  const head = new TableRow({ tableHeader: true, children: headers.map((h) => headerCell(h)) })
  const rows = items.map((it) => new TableRow({
    children: [
      bodyCell(it.discipline),
      bodyCell(it.name),
      bodyCell(it.manufacturer),
      bodyCell([it.finish, it.colour].filter(Boolean).join(' · ')),
      bodyCell(it.room),
      bodyCell(it.estimatedCost),
    ],
  }))
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [head, ...rows] })
}

function disciplineTable(discipline: Discipline, items: ExportItem[]): Table {
  const columns = columnsFor(discipline)
  const head = new TableRow({
    tableHeader: true,
    children: columns.map((c) => headerCell(c.header)),
  })
  const rows = items.map(
    (it) => new TableRow({ children: columns.map((c) => bodyCell(c.get(it))) }),
  )
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [head, ...rows],
  })
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
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

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: 'Specification Schedule', bold: true })],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: payload.meta.projectName, bold: true, size: 24 }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Client: ${payload.meta.client || '—'}    Date: ${payload.meta.date}`,
          color: '555555',
          size: 18,
        }),
      ],
    }),
  ]

  // Project Summary section
  if (hasSummary) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 320, after: 120 },
      children: [new TextRun({ text: 'Project Summary' })],
    }))
    children.push(summaryTable(payload.projectSummary!))
  }

  // Approved items by discipline
  for (const d of disciplines) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 320, after: 120 },
        alignment: AlignmentType.LEFT,
        children: [new TextRun({ text: DISCIPLINE_TITLE[d] })],
      }),
    )
    children.push(disciplineTable(d, payload.disciplines[d] ?? []))
  }

  // Mood Board section
  if (hasMoodboard) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 320, after: 120 },
      children: [new TextRun({ text: 'Mood Board — Approved Items' })],
    }))
    children.push(moodboardTable(payload.moodboard!))
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { size: { orientation: PageOrientation.LANDSCAPE } },
        },
        children,
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  const filename = `${safeFileName(payload.meta.projectName)}_schedule.docx`

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  )
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.status(200).send(buffer)
}
