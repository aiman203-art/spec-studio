import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  buildSystemPrompt,
  buildUserPrompt,
  formatCode,
  nextCodeNumber,
  type ModelItem,
  type ResearchRequest,
} from './_lib/prompts.js'

export const config = { maxDuration: 60 }

const GEMINI_MODEL = 'gemini-flash-latest'

const SEARCH_NOUN: Record<string, string> = {
  materials: 'interior materials finishes',
  lighting: 'lighting fixtures',
  furniture: 'furniture',
}

function fieldValue(f: unknown): string {
  if (f && typeof f === 'object' && 'value' in (f as Record<string, unknown>)) {
    const v = (f as { value: unknown }).value
    if (v && typeof v === 'object' && 'address' in (v as object)) return String((v as { address: string }).address)
    return v != null ? String(v) : ''
  }
  return f != null ? String(f) : ''
}

type MockItem = Omit<ModelItem, 'specPairs'> & { specs: Record<string, string> }
const MOCK_ITEMS: Record<string, MockItem[]> = {
  materials: [
    {
      name: 'Calacatta Oro Porcelain Tile',
      manufacturer: 'Artedomus',
      finish: 'Polished',
      colour: 'White / Gold veining',
      specs: { 'Size': '600×1200mm', 'Thickness': '10mm', 'PEI Rating': 'IV' },
      estimatedCost: '$120–$160/m²',
      rationale: 'High-traffic rated porcelain replicating Calacatta marble at a fraction of the cost.',
      compliance: [{ label: 'Slip rating R10', passed: true }, { label: 'Fire class A1', passed: true }],
      pros: ['Extremely durable', 'Low maintenance', 'Consistent veining'],
      cons: ['Grout lines visible', 'Cold underfoot without hydronic heating'],
      sources: [{ label: 'Artedomus product page', url: 'https://www.artedomus.com' }],
      fireRating: 'A1',
      sustainabilityCert: 'ISO 14001',
      imageUrl: '',
    },
    {
      name: 'Brushed Aged Brass Mosaic',
      manufacturer: 'Perini Tiles',
      finish: 'Brushed / Aged',
      colour: 'Warm brass',
      specs: { 'Sheet size': '300×300mm', 'Material': 'Metal-faced ceramic', 'Grout': '3mm joint' },
      estimatedCost: '$280–$340/m²',
      rationale: 'Feature wall accent. Adds warmth and the brass tones align with the coastal palette.',
      compliance: [{ label: 'Fire class A2', passed: true }, { label: 'Interior use only', passed: true }],
      pros: ['Striking focal point', 'On-trend material', 'Easy to clean'],
      cons: ['Premium price point', 'Requires specialist installation'],
      sources: [{ label: 'Perini Tiles', url: 'https://www.perinitiles.com.au' }],
      fireRating: 'A2',
      sustainabilityCert: 'None required',
      imageUrl: '',
    },
    {
      name: 'Smoked Oak Engineered Timber',
      manufacturer: 'Havwoods',
      finish: 'Natural matte oil',
      colour: 'Warm honey / charcoal grain',
      specs: { 'Width': '220mm', 'Thickness': '21mm', 'Wear layer': '6mm' },
      estimatedCost: '$185–$220/m²',
      rationale: 'Engineered construction handles humidity fluctuation; smoked finish aligns with warm contemporary brief.',
      compliance: [{ label: 'E0 formaldehyde emissions', passed: true }, { label: 'PEFC certified timber', passed: true }],
      pros: ['Warm acoustic quality', 'Refinishable wear layer', 'Wide boards reduce joins'],
      cons: ['Avoid wet areas', 'Requires acclimatisation before install'],
      sources: [{ label: 'Havwoods AU', url: 'https://www.havwoods.com.au' }],
      fireRating: 'Cfl-s1',
      sustainabilityCert: 'PEFC',
      imageUrl: '',
    },
  ],
  lighting: [
    {
      name: 'Vibia Wireflow Linear Pendant',
      manufacturer: 'Vibia',
      finish: 'Matte black powder coat',
      colour: 'Black / Warm white 2700K',
      specs: { 'Length': '120cm', 'Lumen output': '2200lm', 'CRI': '>90' },
      estimatedCost: '$1,800–$2,400 per unit',
      rationale: 'Architectural linear pendant ideal over reception desk. Warm CCT matches coastal contemporary brief.',
      compliance: [{ label: 'IP20 interior rated', passed: true }, { label: 'DALI compatible', passed: true }],
      pros: ['Highly adjustable light distribution', 'Premium Danish design', 'Long LED lifespan'],
      cons: ['Lead time 8–12 weeks', 'Requires structural fixing point'],
      sources: [{ label: 'Vibia product page', url: 'https://www.vibia.com' }],
      fireRating: 'N/A (pendant)',
      sustainabilityCert: 'CE marked',
      imageUrl: '',
    },
    {
      name: 'Bega 66900 Wall Washer',
      manufacturer: 'Bega',
      finish: 'Graphite powder coat',
      colour: 'Graphite / 3000K',
      specs: { 'Wattage': '10W LED', 'Beam angle': '25°', 'IP rating': 'IP44' },
      estimatedCost: '$420–$580 per unit',
      rationale: 'Mid-range wall washer for corridor art lighting. IP44 rating suitable for bathroom-adjacent areas.',
      compliance: [{ label: 'IP44 rated', passed: true }, { label: 'Triac dimmable', passed: true }],
      pros: ['Excellent light quality', 'Compact profile', 'IP44 versatility'],
      cons: ['Fixed beam angle', 'Requires recess box in plasterboard'],
      sources: [{ label: 'Bega Australia', url: 'https://www.bega.com' }],
      fireRating: 'N/A',
      sustainabilityCert: 'CE / RCM',
      imageUrl: '',
    },
  ],
  furniture: [
    {
      name: 'Jardan Arlo Sofa 3-Seater',
      manufacturer: 'Jardan',
      finish: 'Performance fabric',
      colour: 'Dune / Sandy beige',
      specs: { 'Dimensions': 'W240 × D95 × H78cm', 'Legs': 'Solid American oak', 'Seat depth': '60cm' },
      estimatedCost: '$4,200–$5,100 per unit',
      rationale: 'Australian-made sofa with 12-week lead time. Performance fabric suits high-use lobby.',
      compliance: [{ label: 'AS/NZS 4688 contract rated', passed: true }, { label: 'Made in Australia', passed: true }],
      pros: ['Local manufacture – shorter lead time', 'Excellent after-sales support', 'Fabric highly cleanable'],
      cons: ['Fabric less premium than leather', 'Oak legs may mark'],
      sources: [{ label: 'Jardan Australia', url: 'https://www.jardan.com.au' }],
      fireRating: 'AS/NZS 3837',
      sustainabilityCert: 'Australian made',
      imageUrl: '',
    },
    {
      name: 'Stellar Works Ode Dining Chair',
      manufacturer: 'Stellar Works',
      finish: 'Walnut veneer shell, upholstered seat',
      colour: 'Warm walnut / Charcoal weave',
      specs: { 'Dimensions': 'W50 × D55 × H80cm', 'Shell': 'Moulded walnut veneer', 'Seat height': '46cm' },
      estimatedCost: '$980–$1,280 per unit',
      rationale: 'Refined Scandinavian-influenced form suits the brief; stackable for event flexibility.',
      compliance: [{ label: 'Contract durability tested', passed: true }, { label: 'Stackable ×6', passed: true }],
      pros: ['Competitive price per unit', 'Stackable for multi-use spaces', 'Warm material palette'],
      cons: ['Veneer shell requires care', 'Seat cushion is not removable'],
      sources: [{ label: 'Stellar Works', url: 'https://www.stellarworks.com' }],
      fireRating: 'EN 1021-1',
      sustainabilityCert: 'FSC veneer',
      imageUrl: '',
    },
  ],
}

async function fetchSearchContext(query: string, serpKey: string): Promise<string> {
  try {
    const q = encodeURIComponent(query)
    const r = await fetch(`https://serpapi.com/search.json?engine=google&q=${q}&num=8&api_key=${serpKey}`)
    if (!r.ok) return ''
    const data = await r.json() as {
      organic_results?: { title?: string; snippet?: string; link?: string }[]
    }
    const results = data.organic_results ?? []
    return results
      .map((res, i) => `${i + 1}. ${res.title ?? ''}\n   ${res.snippet ?? ''}\n   Source: ${res.link ?? ''}`)
      .join('\n')
  } catch {
    return ''
  }
}

async function fetchImages(items: { name: string; manufacturer: string }[], serpKey: string): Promise<string[]> {
  return Promise.all(
    items.map(async (m) => {
      try {
        const q = encodeURIComponent(`${m.name} ${m.manufacturer} product`)
        const r = await fetch(`https://serpapi.com/search.json?engine=google_images&q=${q}&num=5&api_key=${serpKey}`)
        if (!r.ok) return ''
        const data = await r.json() as { images_results?: { original?: string; thumbnail?: string }[] }
        const result = data.images_results?.[0]
        return result?.original || result?.thumbnail || ''
      } catch {
        return ''
      }
    }),
  )
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const geminiKey = process.env.GEMINI_API_KEY
  const serpKey = process.env.SERPAPI_KEY

  let body: ResearchRequest
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as ResearchRequest)
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' })
    return
  }

  // ── No Gemini key → return mock items ─────────────────────────────────────
  if (!geminiKey) {
    const startNum = nextCodeNumber(body.discipline, body.existingCodes ?? [])
    const room = body.scope?.room ?? 'General'
    const mockItems = MOCK_ITEMS[body.discipline] ?? MOCK_ITEMS.materials

    const imageUrls = serpKey ? await fetchImages(mockItems, serpKey) : mockItems.map(() => '')

    const items = mockItems.map((m, idx) => ({
      code: formatCode(body.discipline, startNum + idx),
      ...m,
      imageUrl: imageUrls[idx] ?? '',
      room,
      status: 'pending' as const,
    }))
    res.status(200).json({ items, _demo: true })
    return
  }

  if (!body?.discipline || !body?.scope) {
    res.status(400).json({ error: 'Missing discipline or scope' })
    return
  }

  // ── Build prompt ───────────────────────────────────────────────────────────
  const systemPrompt = buildSystemPrompt(body.discipline)
  const userPrompt = buildUserPrompt(body)

  // Ground the model with real web results via SerpAPI instead of Gemini's
  // paid built-in google_search tool, which the free API tier doesn't cover.
  const searchQuery = [
    SEARCH_NOUN[body.discipline] ?? body.discipline,
    ...Object.values(body.scope ?? {}),
    fieldValue(body.projectInfo?.style),
    fieldValue(body.projectInfo?.location),
    'manufacturer specifications price',
  ].filter(Boolean).join(' ')

  const searchContext = serpKey ? await fetchSearchContext(searchQuery, serpKey) : ''

  const groundingBlock = searchContext
    ? `\n## Live web search results (cite real sources from here where relevant)\n${searchContext}\n`
    : '\nNo live web search is available for this request — rely only on real, currently-available products you are confident about from your training, and omit anything you are not sure still exists.\n'

  const fullPrompt = `${systemPrompt}

${userPrompt}
${groundingBlock}
IMPORTANT: Respond ONLY with a valid JSON object in this exact format (no markdown, no code fences):
{
  "items": [
    {
      "name": "Product Name",
      "manufacturer": "Manufacturer Name",
      "finish": "Finish description",
      "colour": "Colour description",
      "specPairs": [
        {"label": "Spec name", "value": "Spec value"}
      ],
      "estimatedCost": "$XX–$XX/m²",
      "rationale": "Why this product suits the brief",
      "compliance": [{"label": "Compliance check", "passed": true}],
      "pros": ["Pro 1", "Pro 2"],
      "cons": ["Con 1", "Con 2"],
      "sources": [{"label": "Source name", "url": "https://..."}],
      "fireRating": "Rating or N/A",
      "sustainabilityCert": "Cert or None"
    }
  ]
}`

  try {
    // ── Call Gemini REST API, grounded via SerpAPI search context above ─────
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 8192,
          },
        }),
      },
    )

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      res.status(geminiRes.status).json({ error: errText })
      return
    }

    const geminiData = await geminiRes.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> }
      }>
    }

    const rawText = geminiData.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? '')
      .join('')
      .trim() ?? ''

    // Strip markdown code fences if present
    const jsonText = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    let parsed: { items: ModelItem[] }
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      res.status(502).json({ error: 'Model did not return valid JSON. Try again.' })
      return
    }

    const startNum = nextCodeNumber(body.discipline, body.existingCodes ?? [])
    const room = body.scope.room ?? ''
    const rawItems = parsed.items ?? []

    const imageUrls = serpKey ? await fetchImages(rawItems, serpKey) : rawItems.map(() => '')

    const items = rawItems.map((m, idx) => ({
      code: formatCode(body.discipline, startNum + idx),
      name: m.name,
      manufacturer: m.manufacturer,
      finish: m.finish,
      colour: m.colour,
      specs: Object.fromEntries((m.specPairs ?? []).map((p) => [p.label, p.value])),
      estimatedCost: m.estimatedCost,
      rationale: m.rationale,
      compliance: m.compliance ?? [],
      pros: m.pros ?? [],
      cons: m.cons ?? [],
      sources: m.sources ?? [],
      fireRating: m.fireRating,
      sustainabilityCert: m.sustainabilityCert,
      imageUrl: imageUrls[idx] ?? '',
      room,
      status: 'pending' as const,
    }))

    res.status(200).json({ items })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Research failed'
    res.status(502).json({ error: message })
  }
}
