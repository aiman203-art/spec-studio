import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'
import {
  buildSystemPrompt,
  buildUserPrompt,
  formatCode,
  nextCodeNumber,
  OUTPUT_SCHEMA,
  type ModelItem,
  type ResearchRequest,
} from './_lib/prompts'

export const config = { maxDuration: 60 }

type MockItem = Omit<ModelItem, 'specPairs'> & { specs: Record<string, string> }
const MOCK_ITEMS: Record<string, MockItem[]> = {
  materials: [
    {
      name: 'Calacatta Oro Porcelain Tile',
      manufacturer: 'Artedomus',
      finish: 'Polished',
      colour: 'White / Gold veining',
      specs: { 'Size': '600Ã—1200mm', 'Thickness': '10mm', 'PEI Rating': 'IV' },
      estimatedCost: '$120â€“$160/mÂ²',
      rationale: 'High-traffic rated porcelain replicating Calacatta marble at a fraction of the cost. Ideal for lobby flooring with mid-high budget.',
      compliance: [{ label: 'Slip rating R10', passed: true }, { label: 'Fire class A1', passed: true }],
      pros: ['Extremely durable', 'Low maintenance', 'Consistent veining'],
      cons: ['Grout lines visible', 'Cold underfoot without hydronic heating'],
      sources: [{ label: 'Artedomus product page', url: 'https://www.artedomus.com' }],
      fireRating: 'A1',
      sustainabilityCert: 'ISO 14001',
      imageUrl: 'https://picsum.photos/seed/tile/800/600',
    },
    {
      name: 'Brushed Aged Brass Mosaic',
      manufacturer: 'Perini Tiles',
      finish: 'Brushed / Aged',
      colour: 'Warm brass',
      specs: { 'Sheet size': '300Ã—300mm', 'Material': 'Metal-faced ceramic', 'Grout': '3mm joint' },
      estimatedCost: '$280â€“$340/mÂ²',
      rationale: 'Feature wall accent in lift lobby and reception niche. Adds warmth and the brass tones align with the coastal palette.',
      compliance: [{ label: 'Fire class A2', passed: true }, { label: 'Interior use only', passed: true }],
      pros: ['Striking focal point', 'On-trend material', 'Easy to clean'],
      cons: ['Premium price point', 'Requires specialist installation'],
      sources: [{ label: 'Perini Tiles', url: 'https://www.perinitiles.com.au' }],
      fireRating: 'A2',
      sustainabilityCert: 'None required (accent use)',
      imageUrl: 'https://picsum.photos/seed/brass/800/600',
    },
    {
      name: 'Smoked Oak Engineered Timber',
      manufacturer: 'Havwoods',
      finish: 'Natural matte oil',
      colour: 'Warm honey / charcoal grain',
      specs: { 'Width': '220mm', 'Thickness': '21mm', 'Wear layer': '6mm' },
      estimatedCost: '$185â€“$220/mÂ²',
      rationale: 'Value option for suite corridors. Engineered construction handles humidity fluctuation; smoked finish aligns with warm contemporary brief.',
      compliance: [{ label: 'E0 formaldehyde emissions', passed: true }, { label: 'PEFC certified timber', passed: true }],
      pros: ['Warm acoustic quality', 'Refinishable wear layer', 'Wide boards reduce joins'],
      cons: ['Avoid wet areas', 'Requires acclimatisation before install'],
      sources: [{ label: 'Havwoods AU', url: 'https://www.havwoods.com.au' }],
      fireRating: 'Cfl-s1',
      sustainabilityCert: 'PEFC',
      imageUrl: 'https://picsum.photos/seed/oak/800/600',
    },
  ],
  lighting: [
    {
      name: 'Vibia Wireflow Linear Pendant',
      manufacturer: 'Vibia',
      finish: 'Matte black powder coat',
      colour: 'Black / Warm white 2700K',
      specs: { 'Length': '120cm', 'Lumen output': '2200lm', 'CRI': '>90' },
      estimatedCost: '$1,800â€“$2,400 per unit',
      rationale: 'Architectural linear pendant ideal over reception desk. Warm CCT matches coastal contemporary brief; dimmable to 1%.',
      compliance: [{ label: 'IP20 interior rated', passed: true }, { label: 'DALI compatible', passed: true }],
      pros: ['Highly adjustable light distribution', 'Premium Danish design', 'Long LED lifespan'],
      cons: ['Lead time 8â€“12 weeks', 'Requires structural fixing point'],
      sources: [{ label: 'Vibia product page', url: 'https://www.vibia.com' }],
      fireRating: 'N/A (pendant)',
      sustainabilityCert: 'CE marked',
      imageUrl: 'https://picsum.photos/seed/pendant/800/600',
    },
    {
      name: 'Bega 66900 Wall Washer',
      manufacturer: 'Bega',
      finish: 'Graphite powder coat',
      colour: 'Graphite / 3000K',
      specs: { 'Wattage': '10W LED', 'Beam angle': '25Â°', 'IP rating': 'IP44' },
      estimatedCost: '$420â€“$580 per unit',
      rationale: 'Mid-range wall washer for corridor art lighting. IP44 rating suitable for bathroom-adjacent areas; precise beam control.',
      compliance: [{ label: 'IP44 rated', passed: true }, { label: 'Triac dimmable', passed: true }],
      pros: ['Excellent light quality', 'Compact profile', 'IP44 versatility'],
      cons: ['Fixed beam angle', 'Requires recess box in plasterboard'],
      sources: [{ label: 'Bega Australia', url: 'https://www.bega.com' }],
      fireRating: 'N/A',
      sustainabilityCert: 'CE / RCM',
      imageUrl: 'https://picsum.photos/seed/wallwash/800/600',
    },
    {
      name: 'Astro Lighting Palermo 300 Wall Light',
      manufacturer: 'Astro Lighting',
      finish: 'Polished chrome',
      colour: 'Chrome / 2700K',
      specs: { 'Width': '300mm', 'Wattage': '6W LED', 'CRI': '>80' },
      estimatedCost: '$280â€“$360 per unit',
      rationale: 'Value option for suite bedside sconces. Clean British design, widely stocked locally for fast delivery.',
      compliance: [{ label: 'IP44 rated', passed: true }, { label: 'Phase dimmable', passed: true }],
      pros: ['Readily available', 'Good price-to-quality', 'Easy to specify'],
      cons: ['CRI slightly lower than premium options', 'Chrome may not suit all suite palettes'],
      sources: [{ label: 'Astro Lighting', url: 'https://www.astrolighting.com' }],
      fireRating: 'N/A',
      sustainabilityCert: 'CE marked',
      imageUrl: 'https://picsum.photos/seed/sconce/800/600',
    },
  ],
  furniture: [
    {
      name: 'Minotti Floyd Lounge Chair',
      manufacturer: 'Minotti',
      finish: 'Hand-stitched leather',
      colour: 'Cognac / Warm tan',
      specs: { 'Dimensions': 'W82 Ã— D87 Ã— H72cm', 'Frame': 'Steel + solid walnut legs', 'Upholstery': 'Full-grain leather' },
      estimatedCost: '$6,800â€“$8,200 per unit',
      rationale: 'Premium lobby seating that anchors the coastal contemporary aesthetic. Contract-rated leather, long lead time offset by quality.',
      compliance: [{ label: 'Contract durability BS 7176', passed: true }, { label: 'Fire retardant fill', passed: true }],
      pros: ['Exceptional build quality', 'Timeless design', 'Full contract rating'],
      cons: ['12â€“16 week lead time', 'Highest price point in this set'],
      sources: [{ label: 'Minotti product page', url: 'https://www.minotti.com' }],
      fireRating: 'BS 7176 Medium Hazard',
      sustainabilityCert: 'OEKO-TEX leather',
      imageUrl: 'https://picsum.photos/seed/lounge/800/600',
    },
    {
      name: 'Jardan Arlo Sofa 3-Seater',
      manufacturer: 'Jardan',
      finish: 'Performance fabric',
      colour: 'Dune / Sandy beige',
      specs: { 'Dimensions': 'W240 Ã— D95 Ã— H78cm', 'Legs': 'Solid American oak', 'Seat depth': '60cm' },
      estimatedCost: '$4,200â€“$5,100 per unit',
      rationale: 'Mid-range Australian-made sofa with 12-week lead time. Locally manufactured reduces freight risk; performance fabric suits high-use lobby.',
      compliance: [{ label: 'AS/NZS 4688 contract rated', passed: true }, { label: 'Made in Australia', passed: true }],
      pros: ['Local manufacture â€” shorter lead time', 'Excellent after-sales support', 'Fabric highly cleanable'],
      cons: ['Fabric less premium than leather', 'Oak legs may mark'],
      sources: [{ label: 'Jardan Australia', url: 'https://www.jardan.com.au' }],
      fireRating: 'AS/NZS 3837',
      sustainabilityCert: 'Australian made',
      imageUrl: 'https://picsum.photos/seed/sofa/800/600',
    },
    {
      name: 'Stellar Works Ode Dining Chair',
      manufacturer: 'Stellar Works',
      finish: 'Walnut veneer shell, upholstered seat',
      colour: 'Warm walnut / Charcoal weave',
      specs: { 'Dimensions': 'W50 Ã— D55 Ã— H80cm', 'Shell': 'Moulded walnut veneer', 'Seat height': '46cm' },
      estimatedCost: '$980â€“$1,280 per unit',
      rationale: 'Value option for restaurant / bar seating. Refined Scandinavian-influenced form suits the brief; stackable for event flexibility.',
      compliance: [{ label: 'Contract durability tested', passed: true }, { label: 'Stackable Ã—6', passed: true }],
      pros: ['Competitive price per unit', 'Stackable for multi-use spaces', 'Warm material palette'],
      cons: ['Veneer shell requires care', 'Seat cushion is not removable'],
      sources: [{ label: 'Stellar Works', url: 'https://www.stellarworks.com' }],
      fireRating: 'EN 1021-1',
      sustainabilityCert: 'FSC veneer',
      imageUrl: 'https://picsum.photos/seed/chair/800/600',
    },
  ],
}

const MODEL = 'claude-opus-4-8'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    // No API key â€” return believable demo items so the UI is fully explorable.
    let body2: ResearchRequest
    try {
      body2 = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as ResearchRequest)
    } catch {
      res.status(400).json({ error: 'Invalid JSON body' })
      return
    }
    const startNum2 = nextCodeNumber(body2.discipline, body2.existingCodes ?? [])
    const room2 = body2.scope?.room ?? 'General'
    const mockItems = MOCK_ITEMS[body2.discipline] ?? MOCK_ITEMS.materials

    // Enrich mock items with real images from SerpAPI if key is available
    const serpKey2 = process.env.SERPAPI_KEY
    const mockImages = await Promise.all(
      mockItems.map(async (m) => {
        if (!serpKey2) return m.imageUrl || ''
        try {
          const q = encodeURIComponent(`${m.name} ${m.manufacturer} product`)
          const r = await fetch(`https://serpapi.com/search.json?engine=google_images&q=${q}&num=5&api_key=${serpKey2}`)
          if (!r.ok) return m.imageUrl || ''
          const data = await r.json() as { images_results?: { original?: string; thumbnail?: string }[] }
          return data.images_results?.[0]?.original || data.images_results?.[0]?.thumbnail || m.imageUrl || ''
        } catch {
          return m.imageUrl || ''
        }
      }),
    )

    const items2 = mockItems.map((m, idx) => ({
      code: formatCode(body2.discipline, startNum2 + idx),
      ...m,
      imageUrl: mockImages[idx] ?? '',
      room: room2,
      status: 'pending' as const,
    }))
    res.status(200).json({ items: items2, _demo: true })
    return
  }

  let body: ResearchRequest
  try {
    body =
      typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as ResearchRequest)
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' })
    return
  }
  if (!body?.discipline || !body?.scope) {
    res.status(400).json({ error: 'Missing discipline or scope' })
    return
  }

  const client = new Anthropic({ apiKey })

  // Experimental fields (web_search tool variant, output_config) aren't in this
  // SDK version's static types yet â€” build the params object and cast.
  const baseParams = {
    model: MODEL,
    max_tokens: 16000,
    system: buildSystemPrompt(),
    tools: [{ type: 'web_search_20260209', name: 'web_search' }],
    output_config: { format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
  }

  type Block = { type: string; text?: string }
  type Resp = { content: Block[]; stop_reason: string | null }

  const messages: Array<{ role: 'user' | 'assistant'; content: unknown }> = [
    { role: 'user', content: buildUserPrompt(body) },
  ]

  try {
    let response: Resp | null = null
    // Server-tool loop may return pause_turn if it hits the internal iteration
    // cap; re-send to resume (ADR Â§Structured output, web search).
    for (let i = 0; i < 5; i++) {
      response = (await client.messages.create({
        ...baseParams,
        messages,
      } as never)) as unknown as Resp

      if (response.stop_reason !== 'pause_turn') break
      messages.push({ role: 'assistant', content: response.content })
    }

    if (!response) {
      res.status(502).json({ error: 'No response from model' })
      return
    }
    if (response.stop_reason === 'refusal') {
      res.status(422).json({
        error:
          'The research request was declined. Adjust the brief or scope and try again.',
      })
      return
    }

    const text = response.content
      .filter((b) => b.type === 'text' && b.text)
      .map((b) => b.text as string)
      .join('')
      .trim()

    let parsed: { items: ModelItem[] }
    try {
      parsed = JSON.parse(text)
    } catch {
      res.status(502).json({
        error: 'Model did not return valid structured JSON. Try again.',
      })
      return
    }

    const startNum = nextCodeNumber(body.discipline, body.existingCodes ?? [])
    const room = body.scope.room ?? ''
    const rawItems = parsed.items ?? []

    // Fetch product images from SerpAPI Google Images (one request per item, in parallel)
    const serpKey = process.env.SERPAPI_KEY
    const imageUrls = await Promise.all(
      rawItems.map(async (m) => {
        if (!serpKey) return ''
        try {
          const q = encodeURIComponent(`${m.name} ${m.manufacturer} product`)
          const url = `https://serpapi.com/search.json?engine=google_images&q=${q}&num=5&api_key=${serpKey}`
          const r = await fetch(url)
          if (!r.ok) return ''
          const data = await r.json() as { images_results?: { original?: string; thumbnail?: string }[] }
          // Prefer a direct original image URL; fall back to thumbnail
          const result = data.images_results?.[0]
          return result?.original || result?.thumbnail || ''
        } catch {
          return ''
        }
      }),
    )

    const items = rawItems.map((m, idx) => ({
      code: formatCode(body.discipline, startNum + idx),
      name: m.name,
      manufacturer: m.manufacturer,
      finish: m.finish,
      colour: m.colour,
      specs: Object.fromEntries(
        (m.specPairs ?? []).map((p) => [p.label, p.value]),
      ),
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

