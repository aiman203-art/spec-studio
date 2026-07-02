// Shared prompt + structured-output schema for /api/research.
// Kept dependency-free so the serverless bundle stays small and never pulls in
// browser code. Mirrors the research/filtering intent of the
// /ai-specification-documentation-assistant skill (ADR §Consequences — keep in
// sync with SKILL.md when that source changes).

export type Discipline = 'materials' | 'lighting' | 'furniture'

export const CODE_PREFIX: Record<Discipline, string> = {
  materials: 'MAT',
  lighting: 'LGT',
  furniture: 'FUR',
}

const DISCIPLINE_NOUN: Record<Discipline, string> = {
  materials: 'materials & finishes',
  lighting: 'lighting fixtures',
  furniture: 'furniture pieces',
}

interface FieldLike {
  value: unknown
  state: 'filled' | 'skipped' | 'na' | 'empty'
}

function renderField(label: string, f: FieldLike | undefined): string | null {
  if (!f) return null
  if (f.state === 'na') return `- ${label}: not applicable`
  if (f.state === 'skipped' || f.state === 'empty') return null
  let value = f.value
  if (value && typeof value === 'object' && 'address' in (value as object)) {
    value = (value as { address: string }).address
  }
  if (value === '' || value == null) return null
  return `- ${label}: ${String(value)}`
}

export interface ResearchRequest {
  discipline: Discipline
  projectInfo: Record<string, FieldLike | unknown> & {
    projectType?: string
    name?: string
    mixedUseTypes?: string[]
    typeSpecific?: Record<string, FieldLike>
  }
  scope: Record<string, string>
  existingCodes: string[]
}

export function buildSystemPrompt(discipline?: Discipline): string {
  const lines = [
    'You are a senior interior-design specification researcher working inside a professional documentation tool.',
    'You research REAL, currently-available products and finishes for a designer who retains all approval authority.',
    '',
    'Hard rules:',
    '- Use web search to find real products. Never invent manufacturers, product names, specs, certifications, or prices.',
    '- Every recommendation must be a product that genuinely exists from a real manufacturer, with a working source URL.',
    '- Return at least 3 options, spread across the stated budget range (include a value, a mid, and a premium option where possible).',
    '- Respect the colour palette, style, materials-to-avoid, compliance, and supply-chain constraints. If a field is "not applicable", do not treat it as a requirement.',
    '- For each option give an honest rationale, real pros and cons, and concrete compliance checks relevant to the project type (e.g. slip rating, fire rating, infection control, contract durability).',
    '- Keep specs factual and short (3 key specs per item).',
    '- If you are unsure a detail is real, omit it rather than guessing.',
  ]
  if (discipline === 'lighting') {
    lines.push(
      '- For every lighting item, always include one specPair labelled "Colour Temperature" with a value formatted as the Kelvin rating plus its warmth descriptor, e.g. "3000K Warm White", "4000K Cool White", or "2700K Warm White".',
    )
  }
  return lines.join('\n')
}

export function buildUserPrompt(req: ResearchRequest): string {
  const info = req.projectInfo
  const lines: string[] = []

  lines.push(`# Research request: ${DISCIPLINE_NOUN[req.discipline]}`)
  lines.push('')
  lines.push('## Project brief')
  if (info.name) lines.push(`- Project: ${info.name}`)
  if (info.projectType) lines.push(`- Project type: ${info.projectType}`)
  if (info.mixedUseTypes && info.mixedUseTypes.length)
    lines.push(`- Mixed-use components: ${info.mixedUseTypes.join(', ')}`)

  const universal: Array<[string, string]> = [
    ['Client', 'client'],
    ['Style direction', 'style'],
    ['Budget range', 'budget'],
    ['Location', 'location'],
    ['Colour palette', 'colourPalette'],
    ['Materials to avoid', 'materialsToAvoid'],
    ['Compliance requirements', 'compliance'],
    ['Supply-chain preferences', 'supplyChain'],
  ]
  for (const [label, key] of universal) {
    const rendered = renderField(label, info[key] as FieldLike | undefined)
    if (rendered) lines.push(rendered)
  }

  if (info.typeSpecific) {
    for (const [key, f] of Object.entries(info.typeSpecific)) {
      const rendered = renderField(key, f)
      if (rendered) lines.push(rendered)
    }
  }

  lines.push('')
  lines.push('## Scope for this request')
  for (const [k, v] of Object.entries(req.scope)) {
    if (v) lines.push(`- ${k}: ${v}`)
  }

  lines.push('')
  lines.push(
    `Research and return ${DISCIPLINE_NOUN[req.discipline]} that fit this scope and brief. Return at least 3 distinct real options spread across the budget. Respond ONLY with the structured JSON object described by the output schema.`,
  )
  return lines.join('\n')
}

// Structured-output JSON schema for the final message.
// Notes: structured outputs require additionalProperties:false on every object
// and don't support open string maps — specs are modelled as label/value pairs
// and converted to a record in the function.
export const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          manufacturer: { type: 'string' },
          finish: { type: 'string' },
          colour: { type: 'string' },
          specPairs: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                label: { type: 'string' },
                value: { type: 'string' },
              },
              required: ['label', 'value'],
            },
          },
          estimatedCost: { type: 'string' },
          rationale: { type: 'string' },
          compliance: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                label: { type: 'string' },
                passed: { type: 'boolean' },
              },
              required: ['label', 'passed'],
            },
          },
          pros: { type: 'array', items: { type: 'string' } },
          cons: { type: 'array', items: { type: 'string' } },
          sources: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                label: { type: 'string' },
                url: { type: 'string' },
              },
              required: ['label', 'url'],
            },
          },
          fireRating: { type: 'string' },
          sustainabilityCert: { type: 'string' },
        },
        required: [
          'name',
          'manufacturer',
          'finish',
          'colour',
          'specPairs',
          'estimatedCost',
          'rationale',
          'compliance',
          'pros',
          'cons',
          'sources',
          'fireRating',
          'sustainabilityCert',
        ],
      },
    },
  },
  required: ['items'],
} as const

export interface ModelItem {
  name: string
  manufacturer: string
  finish: string
  colour: string
  specPairs: { label: string; value: string }[]
  estimatedCost: string
  rationale: string
  compliance: { label: string; passed: boolean }[]
  pros: string[]
  cons: string[]
  sources: { label: string; url: string }[]
  fireRating: string
  sustainabilityCert: string
  imageUrl: string
}

/** Next sequential number after the highest existing code for this discipline. */
export function nextCodeNumber(
  discipline: Discipline,
  existingCodes: string[],
): number {
  const prefix = CODE_PREFIX[discipline]
  let max = 0
  for (const c of existingCodes) {
    const m = c.match(new RegExp(`^${prefix}-(\\d+)$`))
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return max + 1
}

export function formatCode(discipline: Discipline, n: number): string {
  return `${CODE_PREFIX[discipline]}-${String(n).padStart(3, '0')}`
}
