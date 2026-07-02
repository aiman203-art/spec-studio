import type { ProjectType } from './types'

export interface TypeFieldDef {
  id: string
  label: string
  placeholder?: string
  hint?: string
}

/**
 * Type-specific Phase-2 fields (ADR §Screen 2 — e.g. durability for Hospitality,
 * infection control for Healthcare). Universal fields are handled separately.
 */
export const TYPE_SPECIFIC_FIELDS: Record<ProjectType, TypeFieldDef[]> = {
  residential: [
    { id: 'occupants', label: 'Occupants / household', placeholder: 'e.g. couple + 2 children, one pet' },
    { id: 'lifestyle', label: 'Lifestyle notes', placeholder: 'e.g. entertains often, works from home' },
  ],
  commercial: [
    { id: 'footfall', label: 'Expected footfall', placeholder: 'e.g. ~400 visitors/day' },
    { id: 'brandGuidelines', label: 'Brand guidelines', placeholder: 'e.g. corporate blue, no warm tones' },
  ],
  hospitality: [
    { id: 'durabilityRating', label: 'Durability rating required', placeholder: 'e.g. heavy-duty / contract grade', hint: 'High-traffic guest areas' },
    { id: 'cleaningRegime', label: 'Cleaning regime', placeholder: 'e.g. daily commercial cleaning' },
    { id: 'starRating', label: 'Property tier', placeholder: 'e.g. 5-star boutique' },
  ],
  healthcare: [
    { id: 'infectionControl', label: 'Infection control requirements', placeholder: 'e.g. antimicrobial, non-porous, seamless', hint: 'Driving factor for finishes' },
    { id: 'accessibility', label: 'Accessibility standard', placeholder: 'e.g. ADA / Part M compliant' },
    { id: 'cleanability', label: 'Cleanability / chemical resistance', placeholder: 'e.g. withstands bleach-based cleaners' },
  ],
  workplace: [
    { id: 'acoustics', label: 'Acoustic requirements', placeholder: 'e.g. open-plan, needs sound absorption' },
    { id: 'density', label: 'Occupancy density', placeholder: 'e.g. 1 person / 8 m²' },
    { id: 'wellbeing', label: 'Wellbeing standard', placeholder: 'e.g. WELL / biophilic targets' },
  ],
  retail: [
    { id: 'merchandising', label: 'Merchandising approach', placeholder: 'e.g. premium, low product density' },
    { id: 'wearZones', label: 'High-wear zones', placeholder: 'e.g. entrance, fitting rooms' },
  ],
  education: [
    { id: 'ageGroup', label: 'Age group', placeholder: 'e.g. primary / K–6' },
    { id: 'safety', label: 'Safety requirements', placeholder: 'e.g. impact-resistant, low-VOC' },
    { id: 'durabilityRating', label: 'Durability rating', placeholder: 'e.g. heavy institutional use' },
  ],
  'mixed-use': [
    { id: 'zones', label: 'Distinct zones', placeholder: 'e.g. retail ground floor, residential above' },
    { id: 'sharedAreas', label: 'Shared / circulation areas', placeholder: 'e.g. lobby, communal roof terrace' },
  ],
}
