import { field } from '../lib/fieldState'
import type { Project } from '../store/types'
import { emptyDiscipline } from '../store/types'

function uid() {
  return ('DEMO' + Math.random().toString(36).slice(2, 7)).toUpperCase()
}

// ─── HOSPITALITY ─────────────────────────────────────────────────────────────

export function buildHospitalityDemo(): Project {
  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    info: {
      projectType: 'hospitality',
      mixedUseTypes: [],
      name: 'Harbourview Boutique Hotel — Lobby & Suites',
      client: field('Meridian Hospitality Group', 'filled'),
      style: field('Warm contemporary, coastal materials', 'filled'),
      budget: field('Mid–high ($$$)', 'filled'),
      location: field({ address: 'Auckland, New Zealand', lat: -36.8485, lng: 174.7633 }, 'filled'),
      colourPalette: field('Sand, charcoal, brass, deep teal', 'filled'),
      materialsToAvoid: field('High-gloss laminates, cold greys', 'filled'),
      compliance: field('NZ Building Code; contract-grade fire ratings', 'filled'),
      supplyChain: field('Prefer regional suppliers; <12 week lead', 'filled'),
      typeSpecific: {
        durabilityRating: field('Heavy-duty / contract grade', 'filled'),
        cleaningRegime: field('Daily commercial cleaning', 'filled'),
        starRating: field('5-star boutique', 'filled'),
      },
    },
    materials: {
      ...emptyDiscipline(),
      scope: { room: 'Lobby', surfaceType: 'Flooring', area: '180', trafficLevel: 'High' },
    },
    lighting: {
      ...emptyDiscipline(),
      scope: { room: 'Lobby', function: 'Ambient + feature', ceilingHeight: '4.2', naturalLight: 'Medium' },
    },
    furniture: {
      ...emptyDiscipline(),
      scope: { room: 'Lobby', itemType: 'Lounge seating', quantity: '4' },
    },
    moodboardLayout: {},
  }
}

// ─── RESIDENTIAL ─────────────────────────────────────────────────────────────

export function buildResidentialDemo(): Project {
  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    info: {
      projectType: 'residential',
      mixedUseTypes: [],
      name: 'Mosman Residence — Full Interior Fit-Out',
      client: field('Mr & Mrs Calloway', 'filled'),
      style: field('Refined Hamptons, relaxed coastal luxury', 'filled'),
      budget: field('High ($$$$)', 'filled'),
      location: field({ address: 'Mosman, Sydney NSW, Australia', lat: -33.8271, lng: 151.2444 }, 'filled'),
      colourPalette: field('White oak, navy, aged brass, linen white', 'filled'),
      materialsToAvoid: field('Dark veneers, industrial concrete, chrome fixtures', 'filled'),
      compliance: field('NCC 2022; BAL-29 bushfire rating for external works', 'filled'),
      supplyChain: field('Australian-made preferred; avoid >16-week lead times', 'filled'),
      typeSpecific: {
        numberOfBedrooms: field('4 bedrooms + study', 'filled'),
        occupants: field('Family of 4, two children under 10', 'filled'),
        petsAllowed: field('Yes — one large dog', 'filled'),
      },
    },
    materials: {
      ...emptyDiscipline(),
      scope: { room: 'Kitchen & Living', surfaceType: 'Flooring + joinery', area: '220', trafficLevel: 'Medium' },
    },
    lighting: {
      ...emptyDiscipline(),
      scope: { room: 'Kitchen & Dining', function: 'Task + ambient', ceilingHeight: '3.0', naturalLight: 'High' },
    },
    furniture: {
      ...emptyDiscipline(),
      scope: { room: 'Living & Master', itemType: 'Sofas, beds, occasional chairs', quantity: '8' },
    },
    moodboardLayout: {},
  }
}

// ─── COMMERCIAL ──────────────────────────────────────────────────────────────

export function buildCommercialDemo(): Project {
  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    info: {
      projectType: 'commercial',
      mixedUseTypes: [],
      name: 'Northshore Tower — Level 12 Office Fit-Out',
      client: field('Axiom Capital Partners', 'filled'),
      style: field('Corporate contemporary, biophilic accents, dark palette', 'filled'),
      budget: field('Mid ($$$)', 'filled'),
      location: field({ address: 'North Sydney, NSW, Australia', lat: -33.8404, lng: 151.2070 }, 'filled'),
      colourPalette: field('Charcoal, warm white, forest green, brushed nickel', 'filled'),
      materialsToAvoid: field('Warm timbers, residential finishes, glossy surfaces', 'filled'),
      compliance: field('NCC 2022 Class 5; BCA DDA; NABERS Energy 5-star target', 'filled'),
      supplyChain: field('Tier-1 commercial suppliers; Green Star credits preferred', 'filled'),
      typeSpecific: {
        openPlanOrCellular: field('Hybrid — open plan + 8 cellular offices', 'filled'),
        occupancyDensity: field('1 person per 10m² NLA', 'filled'),
        nabers: field('5-star NABERS Energy target', 'filled'),
      },
    },
    materials: {
      ...emptyDiscipline(),
      scope: { room: 'Open Plan + Reception', surfaceType: 'Flooring + feature wall', area: '950', trafficLevel: 'High' },
    },
    lighting: {
      ...emptyDiscipline(),
      scope: { room: 'Open Plan Office', function: 'General + task', ceilingHeight: '2.8', naturalLight: 'High (north-facing perimeter)' },
    },
    furniture: {
      ...emptyDiscipline(),
      scope: { room: 'Open Plan + Collaboration', itemType: 'Workstations, meeting, breakout', quantity: '60' },
    },
    moodboardLayout: {},
  }
}

/** @deprecated use buildHospitalityDemo / buildResidentialDemo / buildCommercialDemo */
export function buildDemoProject(): Project {
  return buildHospitalityDemo()
}
