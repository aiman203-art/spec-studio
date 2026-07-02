import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { emptyField } from '../lib/fieldState'
import {
  CODE_PREFIX,
  emptyDiscipline,
  type ApprovedItem,
  type Discipline,
  type Project,
  type ProjectInfo,
  type ProjectType,
  type RecommendationItem,
  type ScopeForm,
} from './types'

function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  ).toUpperCase()
}

export function blankInfo(
  projectType: ProjectType = 'residential',
): ProjectInfo {
  return {
    projectType,
    mixedUseTypes: [],
    name: '',
    client: emptyField(''),
    style: emptyField(''),
    budget: emptyField(''),
    location: emptyField({ address: '', lat: null, lng: null }),
    colourPalette: emptyField(''),
    materialsToAvoid: emptyField(''),
    compliance: emptyField(''),
    supplyChain: emptyField(''),
    typeSpecific: {},
  }
}

export function newProject(info: ProjectInfo): Project {
  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    info,
    materials: emptyDiscipline(),
    lighting: emptyDiscipline(),
    furniture: emptyDiscipline(),
  }
}

export function approvedCount(p: Project, d: Discipline): number {
  return p[d].approved.length
}

interface ProjectState {
  projects: Project[]
  createProject: (info: ProjectInfo) => string
  addProject: (project: Project) => string
  deleteProject: (id: string) => void
  getProject: (id: string) => Project | undefined

  setScope: (id: string, d: Discipline, scope: ScopeForm) => void
  setRecommendations: (
    id: string,
    d: Discipline,
    items: RecommendationItem[],
  ) => void
  setItemStatus: (
    id: string,
    d: Discipline,
    code: string,
    status: RecommendationItem['status'],
  ) => void
  /** Move approved recommendations into the approved[] list; advance itemCounter. */
  submitSelections: (id: string, d: Discipline) => number
  updateApprovedItem: (
    id: string,
    d: Discipline,
    code: string,
    patch: Partial<Pick<ApprovedItem, 'name' | 'notes' | 'quantity'>>,
  ) => void
  removeApprovedItem: (id: string, d: Discipline, code: string) => void
  clearApprovedItems: (id: string, d: Discipline) => void
}

function mutateProject(
  projects: Project[],
  id: string,
  fn: (p: Project) => void,
): Project[] {
  return projects.map((p) => {
    if (p.id !== id) return p
    const copy: Project = structuredClone(p)
    fn(copy)
    return copy
  })
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],

      createProject: (info) => {
        const project = newProject(info)
        set((s) => ({ projects: [project, ...s.projects] }))
        return project.id
      },

      addProject: (project) => {
        set((s) => ({
          projects: [project, ...s.projects.filter((p) => p.id !== project.id)],
        }))
        return project.id
      },

      deleteProject: (id) =>
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),

      getProject: (id) => get().projects.find((p) => p.id === id),

      setScope: (id, d, scope) =>
        set((s) => ({
          projects: mutateProject(s.projects, id, (p) => {
            p[d].scope = scope
          }),
        })),

      setRecommendations: (id, d, items) =>
        set((s) => ({
          projects: mutateProject(s.projects, id, (p) => {
            p[d].recommendations = items
          }),
        })),

      setItemStatus: (id, d, code, status) =>
        set((s) => ({
          projects: mutateProject(s.projects, id, (p) => {
            const item = p[d].recommendations.find((r) => r.code === code)
            if (item) item.status = status
          }),
        })),

      submitSelections: (id, d) => {
        let count = 0
        set((s) => ({
          projects: mutateProject(s.projects, id, (p) => {
            const disc = p[d]
            const approved = disc.recommendations
              .filter((r) => r.status === 'approved')
              .map<ApprovedItem>((r) => ({
                ...r,
                status: 'approved',
                quantity: 1,
                notes: '',
              }))
            count = approved.length
            // Append to the flat list, de-duping by code
            const existingCodes = new Set(disc.approved.map((a) => a.code))
            disc.approved = [
              ...disc.approved,
              ...approved.filter((a) => !existingCodes.has(a.code)),
            ]
            // Advance counter past the highest code used so far
            disc.itemCounter = highestCodeNumber(d, disc.approved)
            // Clear the working recommendation set (rejected/undecided discarded)
            disc.recommendations = []
          }),
        }))
        return count
      },

      updateApprovedItem: (id, d, code, patch) =>
        set((s) => ({
          projects: mutateProject(s.projects, id, (p) => {
            const item = p[d].approved.find((a) => a.code === code)
            if (item) Object.assign(item, patch)
          }),
        })),

      removeApprovedItem: (id, d, code) =>
        set((s) => ({
          projects: mutateProject(s.projects, id, (p) => {
            p[d].approved = p[d].approved.filter((a) => a.code !== code)
          }),
        })),

      clearApprovedItems: (id, d) =>
        set((s) => ({
          projects: mutateProject(s.projects, id, (p) => {
            p[d].approved = []
          }),
        })),
    }),
    {
      name: 'spec-studio:v1', // localStorage key — autosave (plan decision #4)
      version: 2,
      migrate: (stored: unknown) => {
        // v2: strip unreliable third-party imageUrls; keep only picsum seed images
        const state = stored as { projects?: Project[] }
        const stripImages = (item: RecommendationItem | ApprovedItem) => ({
          ...item,
          imageUrl: item.imageUrl?.startsWith('https://picsum.photos/') ? item.imageUrl : '',
        })
        return {
          ...state,
          projects: (state.projects ?? []).map((p) => ({
            ...p,
            materials: { ...p.materials, recommendations: p.materials.recommendations.map(stripImages), approved: p.materials.approved.map(stripImages) },
            lighting:  { ...p.lighting,  recommendations: p.lighting.recommendations.map(stripImages),  approved: p.lighting.approved.map(stripImages) },
            furniture: { ...p.furniture, recommendations: p.furniture.recommendations.map(stripImages), approved: p.furniture.approved.map(stripImages) },
          })),
        }
      },
    },
  ),
)

function highestCodeNumber(d: Discipline, items: { code: string }[]): number {
  const prefix = CODE_PREFIX[d]
  let max = 0
  for (const it of items) {
    const m = it.code.match(new RegExp(`^${prefix}-(\\d+)$`))
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return max
}
