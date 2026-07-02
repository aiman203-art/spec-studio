import type {
  Discipline,
  ProjectInfo,
  RecommendationItem,
  ScopeForm,
} from '../store/types'

export async function requestResearch(args: {
  discipline: Discipline
  projectInfo: ProjectInfo
  scope: ScopeForm
  existingCodes: string[]
}): Promise<RecommendationItem[]> {
  const res = await fetch('/api/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  })

  if (!res.ok) {
    let message = `Research failed (${res.status})`
    try {
      const data = (await res.json()) as { error?: string }
      if (data.error) message = data.error
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }

  const data = (await res.json()) as { items: RecommendationItem[] }
  return data.items ?? []
}
