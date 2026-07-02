import { useRef, useState } from 'react'
import { Navigate, Link, useParams } from 'react-router-dom'
import html2canvas from 'html2canvas'
import { useProjectStore } from '../store/useProjectStore'
import { DISCIPLINES, type ApprovedItem, type Discipline } from '../store/types'
import { describeField } from '../lib/fieldState'
import { exportPdf } from '../lib/exportPdf'

const DISC_LABEL: Record<Discipline, string> = {
  materials: 'Materials',
  lighting: 'Lighting',
  furniture: 'Furniture',
}

// Colour token → approximate hex
const SWATCH_MAP: Record<string, string> = {
  sand: '#c4a882', beige: '#d4c4a8', cream: '#f0e8d8', white: '#f5f5f0', linen: '#e8dfc8',
  charcoal: '#3d3d3a', grey: '#8a8a84', gray: '#8a8a84', black: '#1a1a18', dark: '#2a2a28',
  brass: '#b5954a', gold: '#c9a84c', amber: '#c9922a', bronze: '#8a6c3e',
  teal: '#2d6e6a', green: '#4a7c59', forest: '#2d5a3d', sage: '#7a9e82', olive: '#6b7c3a',
  blue: '#4a6fa5', navy: '#2d3f6e', slate: '#5a6878', stone: '#8a8278',
  oak: '#c4883c', timber: '#a07040', wood: '#9a7050', walnut: '#7a5c3c',
  'warm white': '#f5f0e8', 'warm sand': '#c4a882', 'deep teal': '#2d6e6a',
  'honey oak': '#c4883c', dune: '#c8b898', 'brushed nickel': '#a0a0a0',
}

function paletteHex(token: string): string {
  const lower = token.toLowerCase()
  for (const [key, color] of Object.entries(SWATCH_MAP)) {
    if (lower.includes(key)) return color
  }
  const hash = token.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return `hsl(${[30, 40, 50, 200, 100][hash % 5]}, 22%, ${48 + (hash % 22)}%)`
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Each slot in the collage grid — spans vary to create visual weight
const SLOT_SIZES: Array<{ cols: string; rows: string; imgH: string }> = [
  { cols: 'col-span-2 row-span-2', rows: '', imgH: 'h-64' },  // large feature
  { cols: 'col-span-1 row-span-1', rows: '', imgH: 'h-40' },  // small
  { cols: 'col-span-1 row-span-2', rows: '', imgH: 'h-56' },  // tall portrait
  { cols: 'col-span-1 row-span-1', rows: '', imgH: 'h-36' },  // small
  { cols: 'col-span-2 row-span-1', rows: '', imgH: 'h-44' },  // wide landscape
  { cols: 'col-span-1 row-span-1', rows: '', imgH: 'h-40' },  // small
  { cols: 'col-span-1 row-span-2', rows: '', imgH: 'h-52' },  // tall
  { cols: 'col-span-1 row-span-1', rows: '', imgH: 'h-36' },  // small
  { cols: 'col-span-2 row-span-1', rows: '', imgH: 'h-40' },  // wide
]

// Subtle rotations — same feel as physical pin-board
const ROTATIONS = [0, 0.8, -0.6, 0, 1.2, -0.9, 0, 0.5, -0.7]

export function Moodboard() {
  const { id = '' } = useParams()
  const project = useProjectStore((s) => s.projects.find((p) => p.id === id))
  const [filter, setFilter] = useState<Discipline | 'all'>('all')
  const [seed, setSeed] = useState(0)
  const [selected, setSelected] = useState<(ApprovedItem & { discipline: Discipline }) | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)

  if (!project) return <Navigate to="/" replace />
  const { info } = project

  const allItems: Array<ApprovedItem & { discipline: Discipline }> = DISCIPLINES.flatMap((d) =>
    project[d].approved.map((item) => ({ ...item, discipline: d })),
  )

  const ordered = seed === 0 ? allItems : shuffle(allItems)
  const visible = filter === 'all' ? ordered : ordered.filter((i) => i.discipline === filter)

  const paletteTokens = (info.colourPalette?.state === 'filled' ? String(info.colourPalette.value) : '')
    .split(/[,;/·]+/).map((s) => s.trim()).filter(Boolean).slice(0, 7)

  const styleLabel = info.style?.state === 'filled' ? describeField(info.style) : ''

  async function downloadPng() {
    setDownloading(true)
    try {
      const el = canvasRef.current
      if (!el) return
      const canvas = await html2canvas(el, { useCORS: true, allowTaint: false, backgroundColor: '#f7f3ee', scale: 2, logging: false })
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `${(info.name || 'moodboard').replace(/[^\w-]+/g, '_').slice(0, 40)}_moodboard.png`
      a.click()
    } finally {
      setDownloading(false)
    }
  }

  async function downloadPdf() {
    setPdfBusy(true)
    try {
      const el = canvasRef.current
      let canvas: HTMLCanvasElement | undefined
      if (el) {
        canvas = await html2canvas(el, { useCORS: true, allowTaint: false, backgroundColor: '#f7f3ee', scale: 2, logging: false })
      }
      await exportPdf(project!, undefined, true, true, canvas)
    } finally {
      setPdfBusy(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#f7f3ee', color: '#1a1710' }}>

      {/* ── Minimal top bar ── */}
      <nav className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-3" style={{ borderColor: '#e0d8ce', background: '#faf7f2' }}>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-body" style={{ color: '#6b5e4a' }}>
          <Link to="/" className="font-serif text-title-sm hover:opacity-70 transition-opacity" style={{ color: '#1a1710' }}>Spec Studio</Link>
          <span style={{ color: '#c2b8ac' }}>/</span>
          <Link to={`/project/${id}`} className="hover:underline" style={{ color: '#6b5e4a' }}>{info.name || 'Project'}</Link>
          <span style={{ color: '#c2b8ac' }}>/</span>
          <span style={{ color: '#1a1710' }}>Mood Board</span>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-1.5">
          {(['all', ...DISCIPLINES] as const).map((d) => (
            <button key={d} onClick={() => setFilter(d)}
              className="rounded-full px-3 py-1 text-caption uppercase tracking-wider transition-all"
              style={{
                border: '1px solid', borderColor: filter === d ? '#1a1710' : '#d0c8be',
                background: filter === d ? '#1a1710' : 'transparent',
                color: filter === d ? '#f7f3ee' : '#6b5e4a',
                fontSize: '10px', letterSpacing: '0.08em',
              }}>
              {d === 'all' ? 'All' : DISC_LABEL[d]}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button onClick={() => setSeed((s) => s + 1)}
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-caption transition-all hover:bg-black/5"
            style={{ borderColor: '#d0c8be', color: '#6b5e4a', fontSize: '11px' }}>
            ↺ Shuffle
          </button>
          <button onClick={downloadPng} disabled={downloading || visible.length === 0}
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-caption transition-all hover:bg-black/5 disabled:opacity-40"
            style={{ borderColor: '#d0c8be', color: '#6b5e4a', fontSize: '11px' }}>
            {downloading ? '…' : '↓ PNG'}
          </button>
          <button onClick={downloadPdf} disabled={pdfBusy || visible.length === 0}
            className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-caption transition-all disabled:opacity-40"
            style={{ background: '#1a1710', color: '#f7f3ee', fontSize: '11px' }}>
            {pdfBusy ? '…' : '↓ PDF report'}
          </button>
        </div>
      </nav>

      {/* ── Mood board canvas ── */}
      <div className="px-6 py-8 md:px-10 md:py-10">
        <div ref={canvasRef} className="mx-auto max-w-6xl rounded-3xl p-8 md:p-12" style={{ background: '#f7f3ee' }}>

          {/* ── Board header ── */}
          <div className="mb-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            {/* Title block */}
            <div>
              <p className="mb-2 text-caption uppercase tracking-[0.2em]" style={{ color: '#a89880', fontSize: '11px' }}>
                Interior Specification · Mood Board
              </p>
              <h1 className="font-serif leading-none" style={{ fontSize: 'clamp(32px, 5vw, 56px)', color: '#1a1710', letterSpacing: '-0.01em' }}>
                {info.name || 'Untitled Project'}
              </h1>
              {styleLabel && (
                <p className="mt-2 font-serif italic" style={{ color: '#6b5e4a', fontSize: 'clamp(14px, 2vw, 18px)' }}>
                  {styleLabel}
                </p>
              )}
            </div>

            {/* Colour palette circles */}
            {paletteTokens.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-caption uppercase tracking-widest" style={{ color: '#a89880', fontSize: '9px' }}>Colour palette</p>
                <div className="flex flex-wrap gap-2">
                  {paletteTokens.map((tok, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div className="rounded-full border" style={{
                        width: '36px', height: '36px',
                        background: paletteHex(tok),
                        borderColor: 'rgba(0,0,0,0.10)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                      }} title={tok} />
                      <span style={{ color: '#8a7a6a', fontSize: '9px', textAlign: 'center', maxWidth: '44px', lineHeight: 1.2 }}>{tok}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Horizontal rule ── */}
          <div className="mb-10 border-t" style={{ borderColor: '#e0d8ce' }} />

          {/* ── Collage ── */}
          {visible.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-2xl border-2 border-dashed" style={{ borderColor: '#d0c8be' }}>
              <div className="text-center">
                <p className="font-serif text-title-sm" style={{ color: '#8a7a6a' }}>No approved items yet</p>
                <p className="mt-1 text-body" style={{ color: '#a89880' }}>Approve items in Materials, Lighting, or Furniture first.</p>
              </div>
            </div>
          ) : (
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: 'repeat(4, 1fr)',
                gridAutoRows: '160px',
              }}
            >
              {visible.map((item, i) => {
                const slot = SLOT_SIZES[i % SLOT_SIZES.length]
                const rot = ROTATIONS[i % ROTATIONS.length]
                return (
                  <CollageItem
                    key={item.code}
                    item={item}
                    colSpanClass={slot.cols}
                    imgHeight={slot.imgH}
                    rotation={rot}
                    onClick={() => setSelected(item)}
                  />
                )
              })}
            </div>
          )}

          {/* ── Board footer ── */}
          {visible.length > 0 && (
            <div className="mt-12 flex items-center justify-between border-t pt-6" style={{ borderColor: '#e0d8ce' }}>
              <p className="font-serif italic" style={{ color: '#a89880', fontSize: '12px' }}>
                {visible.length} item{visible.length !== 1 ? 's' : ''} · {info.projectType}
                {info.budget?.state === 'filled' ? ` · ${describeField(info.budget)}` : ''}
              </p>
              <p style={{ color: '#c2b8ac', fontSize: '11px', letterSpacing: '0.1em' }}>SPEC STUDIO</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Lightbox ── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(26,23,16,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl"
            style={{ background: '#faf7f2', border: '1px solid #e0d8ce' }}
            onClick={(e) => e.stopPropagation()}
          >
            {selected.imageUrl ? (
              <img src={selected.imageUrl} alt={selected.name} crossOrigin="anonymous"
                className="h-56 w-full rounded-t-3xl object-cover" />
            ) : (
              <div className="flex h-40 items-center justify-center rounded-t-3xl" style={{ background: '#ede8df' }}>
                <span className="font-serif select-none" style={{ fontSize: '60px', color: '#c2b8ac' }}>{selected.name.charAt(0)}</span>
              </div>
            )}
            <div className="p-6">
              <span className="text-caption uppercase tracking-widest" style={{ color: '#a89880', fontSize: '10px' }}>
                {DISC_LABEL[selected.discipline]}
              </span>
              <h2 className="mt-0.5 font-serif text-title-md" style={{ color: '#1a1710' }}>{selected.name}</h2>
              <p className="text-body" style={{ color: '#8a7a6a' }}>{selected.manufacturer}</p>
              <p className="mt-2" style={{ color: '#6b5e4a', fontSize: '13px' }}>
                <span style={{ color: '#a89880' }}>Finish </span>{selected.finish}
                {selected.colour && <><span style={{ color: '#a89880' }}> · Colour </span>{selected.colour}</>}
              </p>
              {selected.rationale && (
                <div className="mt-4 rounded-2xl p-4" style={{ background: '#ede8df' }}>
                  <p style={{ color: '#3d3020', fontSize: '13px', lineHeight: '1.7' }}>{selected.rationale}</p>
                </div>
              )}
              {Object.keys(selected.specs).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {Object.entries(selected.specs).map(([k, v]) => (
                    <span key={k} className="rounded-full px-2.5 py-0.5 text-caption"
                      style={{ background: '#e8e0d4', border: '1px solid #d6cfc2', color: '#6b5e4a', fontSize: '11px' }}>
                      <span style={{ color: '#a89880' }}>{k}:</span> {v}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-4 flex items-center justify-between">
                <span className="font-serif" style={{ color: '#1a1710', fontSize: '18px' }}>{selected.estimatedCost}</span>
                {selected.room && <span className="text-caption uppercase" style={{ color: '#a89880', fontSize: '10px' }}>{selected.room}</span>}
              </div>
              <button onClick={() => setSelected(null)}
                className="mt-5 w-full rounded-full py-2.5 text-body transition-all hover:bg-black/5"
                style={{ border: '1px solid #d6cfc2', color: '#8a7a6a' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CollageItem({
  item,
  colSpanClass,
  imgHeight,
  rotation,
  onClick,
}: {
  item: ApprovedItem & { discipline: Discipline }
  colSpanClass: string
  imgHeight: string
  rotation: number
  onClick: () => void
}) {
  const [imgError, setImgError] = useState(false)
  const hasImage = !!item.imageUrl && !imgError

  return (
    <div
      onClick={onClick}
      className={['cursor-pointer group transition-all duration-300', colSpanClass].join(' ')}
      style={{ transform: `rotate(${rotation}deg)`, transformOrigin: 'center center' }}
    >
      <div className="h-full flex flex-col">
        {/* Image block — no card box, just the image on the canvas */}
        <div
          className={['relative overflow-hidden rounded-2xl flex-shrink-0', imgHeight].join(' ')}
          style={{
            boxShadow: '0 2px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.07)',
          }}
        >
          {hasImage ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              crossOrigin="anonymous"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center" style={{ background: '#ede8df' }}>
              <span className="font-serif select-none" style={{ fontSize: '36px', color: '#c2b8ac' }}>{item.name.charAt(0)}</span>
            </div>
          )}

          {/* Hover gradient overlay */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3"
            style={{ background: 'linear-gradient(to top, rgba(26,23,16,0.65) 0%, transparent 55%)' }}
          >
            <p className="font-serif text-white leading-tight" style={{ fontSize: '12px' }}>{item.name}</p>
          </div>
        </div>

        {/* Caption — annotation style, below the image */}
        <div className="mt-2 px-0.5">
          <p className="font-serif leading-snug line-clamp-1" style={{ color: '#1a1710', fontSize: '12px' }}>{item.name}</p>
          <p className="line-clamp-1" style={{ color: '#8a7a6a', fontSize: '10px', marginTop: '1px' }}>{item.manufacturer}</p>
          <p className="font-medium" style={{ color: '#c9922a', fontSize: '11px', marginTop: '2px' }}>{item.estimatedCost}</p>
        </div>
      </div>
    </div>
  )
}
