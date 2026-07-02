import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Discipline, Project } from '../store/types'
import { describeField } from './fieldState'

const DISC_LABEL: Record<Discipline, string> = {
  materials: 'Materials',
  lighting: 'Lighting',
  furniture: 'Furniture',
}

export async function exportPdf(
  project: Project,
  selected?: Set<string>,
  includeSummary?: boolean,
  includeMoodboard?: boolean,
  moodboardCanvas?: HTMLCanvasElement,
  mode?: 'save' | 'bloburl',
): Promise<string | void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const info = project.info
  const pageW = doc.internal.pageSize.getWidth()
  const amber = [201, 146, 42] as [number, number, number]
  const dark  = [26, 23, 16]  as [number, number, number]
  const mid   = [138, 122, 106] as [number, number, number]
  const cream = [245, 240, 232] as [number, number, number]

  let y = 18

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFillColor(...amber)
  doc.rect(0, 0, 6, doc.internal.pageSize.getHeight(), 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...dark)
  doc.text(info.name || 'Untitled Project', 14, y)
  y += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...mid)
  const meta = [
    info.client.state === 'filled' ? `Client: ${describeField(info.client)}` : null,
    `Type: ${info.projectType}`,
    info.location.state === 'filled' ? `Location: ${info.location.value.address}` : null,
    `Date: ${new Date().toLocaleDateString()}`,
  ].filter(Boolean).join('   ·   ')
  doc.text(meta, 14, y)
  y += 10

  // ── Project summary ───────────────────────────────────────────────────────
  if (includeSummary) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...amber)
    doc.text('PROJECT SUMMARY', 14, y)
    y += 4

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [['Field', 'Value']],
      body: [
        ['Style', describeField(info.style)],
        ['Budget', describeField(info.budget)],
        ['Colour palette', describeField(info.colourPalette)],
        ['Materials to avoid', describeField(info.materialsToAvoid)],
        ['Compliance', describeField(info.compliance)],
        ['Supply chain', describeField(info.supplyChain)],
        ...Object.entries(info.typeSpecific).map(([k, f]) => [k, describeField(f)]),
      ],
      headStyles: { fillColor: amber, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: dark },
      alternateRowStyles: { fillColor: cream },
      columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold', textColor: mid } },
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  }

  // ── Discipline schedules ──────────────────────────────────────────────────
  const disciplines: Discipline[] = ['materials', 'lighting', 'furniture']

  for (const d of disciplines) {
    const items = project[d].approved.filter((a) => !selected || selected.has(a.code))
    if (items.length === 0) continue

    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage()
      doc.setFillColor(...amber)
      doc.rect(0, 0, 6, doc.internal.pageSize.getHeight(), 'F')
      y = 18
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...amber)
    doc.text(DISC_LABEL[d].toUpperCase() + ' SCHEDULE', 14, y)
    y += 4

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [['Code', 'Name', 'Manufacturer', 'Finish', 'Colour', 'Room', 'Qty', 'Cost', 'Notes']],
      body: items.map((it) => [
        it.code,
        it.name,
        it.manufacturer,
        it.finish,
        it.colour,
        it.room,
        String(it.quantity),
        it.estimatedCost,
        it.notes || '—',
      ]),
      headStyles: { fillColor: dark, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      bodyStyles: { fontSize: 7.5, textColor: dark },
      alternateRowStyles: { fillColor: cream },
      columnStyles: {
        0: { cellWidth: 22, fontStyle: 'bold', textColor: mid },
        6: { cellWidth: 10, halign: 'center' },
        7: { cellWidth: 28 },
      },
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  }

  // ── Mood board — embed canvas image if provided, else text table ─────────
  if (includeMoodboard) {
    doc.addPage()
    doc.setFillColor(...amber)
    doc.rect(0, 0, 6, doc.internal.pageSize.getHeight(), 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...amber)
    doc.text('MOOD BOARD', 14, 18)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...dark)
    doc.text(info.name || 'Untitled Project', 14, 25)
    if (info.style?.state === 'filled') {
      doc.setFontSize(8)
      doc.setTextColor(...mid)
      doc.text(String(info.style.value), 14, 31)
    }

    if (moodboardCanvas) {
      // Embed the captured PNG canvas, scaled to fit the page width
      const imgData = moodboardCanvas.toDataURL('image/png')
      const canvasW = moodboardCanvas.width
      const canvasH = moodboardCanvas.height
      const availW = pageW - 28 // 14mm margin each side
      const scaledH = (canvasH / canvasW) * availW
      const maxH = doc.internal.pageSize.getHeight() - 45
      const finalH = Math.min(scaledH, maxH)
      const finalW = (finalH / scaledH) * availW
      doc.addImage(imgData, 'PNG', 14, 37, finalW, finalH)
    } else {
      // Fallback: text table when no canvas provided
      const allItems = disciplines.flatMap((d) =>
        project[d].approved.map((a) => ({ disc: DISC_LABEL[d], ...a })),
      )
      autoTable(doc, {
        startY: 37,
        margin: { left: 14, right: 14 },
        head: [['Discipline', 'Name', 'Manufacturer', 'Finish / Colour', 'Room', 'Est. Cost']],
        body: allItems.map((it) => [
          it.disc, it.name, it.manufacturer, [it.finish, it.colour].filter(Boolean).join(' · '), it.room, it.estimatedCost,
        ]),
        headStyles: { fillColor: amber, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5, textColor: dark },
        alternateRowStyles: { fillColor: cream },
        columnStyles: { 0: { cellWidth: 28, fontStyle: 'bold', textColor: mid } },
      })
    }
  }

  // ── Footer on each page ───────────────────────────────────────────────────
  const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...mid)
    doc.text(
      `${info.name || 'Spec Studio'} — Page ${i} of ${pageCount}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'center' },
    )
  }

  const safe = (info.name || 'schedule').replace(/[^\w-]+/g, '_').slice(0, 40) || 'schedule'
  if (mode === 'bloburl') {
    const blob = doc.output('blob')
    return URL.createObjectURL(blob)
  }
  doc.save(`${safe}_schedule.pdf`)
}
