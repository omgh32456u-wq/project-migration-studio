
import { useMemo } from 'react'
import { useStore } from '@/components/providers/app-store'
import type { LogEntry } from '@/lib/types'

/** Most recently logged distinct foods/recipes that still exist, newest first. */
export function useRecentEntries(limit = 12): LogEntry[] {
  const { logs, foodsById, recipes } = useStore()
  return useMemo(() => {
    const recipeIds = new Set(recipes.map((r) => r.id))
    const seen = new Set<string>()
    const out: LogEntry[] = []
    const sorted = [...logs].sort((a, b) => b.createdAt - a.createdAt)
    for (const l of sorted) {
      if (!l.sourceId) continue
      const key = `${l.sourceType}:${l.sourceId}`
      if (seen.has(key)) continue
      const exists = l.sourceType === 'food' ? !!foodsById.get(l.sourceId) && !foodsById.get(l.sourceId)?.deleted : recipeIds.has(l.sourceId)
      if (!exists) continue
      seen.add(key)
      out.push(l)
      if (out.length >= limit) break
    }
    return out
  }, [logs, foodsById, recipes, limit])
}
