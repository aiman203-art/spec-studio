import type { ProjectField } from '../lib/fieldState'

export type Discipline = 'materials' | 'lighting' | 'furniture'

export const DISCIPLINES: Discipline[] = ['materials', 'lighting', 'furniture']

export const CODE_PREFIX: Record<Discipline, string> = {
  materials: 'MAT',
  lighting: 'LGT',
  furniture: 'FUR',
}

export type ProjectType =
  | 'residential'
  | 'commercial'
  | 'hospitality'
  | 'healthcare'
  | 'workplace'
  | 'retail'
  | 'education'
  | 'mixed-use'

export interface LocationValue {
  address: string
  lat: number | null
  lng: number | null
}

/** All form fields with their FieldState (ADR §Screen 2). */
export interface ProjectInfo {
  projectType: ProjectType
  /** Only set when projectType === 'mixed-use'. */
  mixedUseTypes: ProjectType[]
  name: string // required — the project's identity
  client: ProjectField<string>
  style: ProjectField<string>
  budget: ProjectField<string>
  location: ProjectField<LocationValue>
  colourPalette: ProjectField<string>
  materialsToAvoid: ProjectField<string>
  compliance: ProjectField<string>
  supplyChain: ProjectField<string>
  /** Type-specific fields keyed by field id (e.g. durabilityRating). */
  typeSpecific: Record<string, ProjectField<string>>
}

/** Discipline-specific scope (ADR §Screen 4 Phase 1). Always carries `room`. */
export type ScopeForm = Record<string, string> & { room: string }

export interface ComplianceCheck {
  label: string
  passed: boolean
}

export interface SourceLink {
  label: string
  url: string
}

export type ItemStatus = 'pending' | 'approved' | 'rejected'

export interface RecommendationItem {
  code: string // e.g. MAT-003
  name: string
  manufacturer: string
  finish: string
  colour: string
  specs: Record<string, string> // 3 key specs
  estimatedCost: string
  rationale: string
  compliance: ComplianceCheck[]
  pros: string[]
  cons: string[]
  sources: SourceLink[]
  fireRating: string
  sustainabilityCert: string
  room: string // ADR Open-Q2: flat list, filterable by room
  imageUrl?: string // product photo from the manufacturer / source page
  status: ItemStatus
}

/** An approved item gains designer-editable fields used on the schedule. */
export interface ApprovedItem extends RecommendationItem {
  status: 'approved'
  quantity: number
  notes: string
}

export interface DisciplineState {
  scope: ScopeForm | null
  recommendations: RecommendationItem[]
  approved: ApprovedItem[]
  itemCounter: number // for sequential codes (MAT-001…)
}

export interface Project {
  id: string
  createdAt: string // ISO
  info: ProjectInfo
  materials: DisciplineState
  lighting: DisciplineState
  furniture: DisciplineState
}

export function emptyDiscipline(): DisciplineState {
  return { scope: null, recommendations: [], approved: [], itemCounter: 0 }
}

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  hospitality: 'Hospitality',
  healthcare: 'Healthcare',
  workplace: 'Workplace',
  retail: 'Retail',
  education: 'Education',
  'mixed-use': 'Mixed Use',
}
