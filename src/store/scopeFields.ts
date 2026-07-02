import type { Discipline } from './types'

export interface ScopeFieldDef {
  id: string
  label: string
  placeholder?: string
  options?: string[] // present → render as a select
  required?: boolean
}

/** Discipline-specific scope forms (ADR §Screen 4 Phase 1). */
export const SCOPE_FIELDS: Record<Discipline, ScopeFieldDef[]> = {
  materials: [
    { id: 'room', label: 'Room / area', placeholder: 'e.g. Lobby', required: true },
    {
      id: 'surfaceType',
      label: 'Surface type',
      placeholder: 'e.g. Flooring, Wall, Worktop',
      required: true,
    },
    { id: 'area', label: 'Area (m²)', placeholder: 'e.g. 180' },
    {
      id: 'trafficLevel',
      label: 'Traffic level',
      options: ['Low', 'Medium', 'High', 'Very high'],
    },
  ],
  lighting: [
    { id: 'room', label: 'Room / area', placeholder: 'e.g. Lobby', required: true },
    {
      id: 'function',
      label: 'Lighting function',
      placeholder: 'e.g. Ambient, Task, Feature',
      required: true,
    },
    { id: 'ceilingHeight', label: 'Ceiling height (m)', placeholder: 'e.g. 4.2' },
    {
      id: 'naturalLight',
      label: 'Natural light',
      options: ['None', 'Low', 'Medium', 'High'],
    },
  ],
  furniture: [
    { id: 'room', label: 'Room / area', placeholder: 'e.g. Lobby', required: true },
    {
      id: 'itemType',
      label: 'Item type',
      placeholder: 'e.g. Lounge seating, Desk',
      required: true,
    },
    { id: 'quantity', label: 'Quantity', placeholder: 'e.g. 4' },
  ],
}
