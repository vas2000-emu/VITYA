import { create } from 'zustand'
import { moldAnalysisData } from '@/lib/mockMoldAnalysis'
import type { MoldAnalysisResult } from '@/lib/types'

interface ResultsState {
  analysis: MoldAnalysisResult
  selectedIssueId: string | null
  fixedIssueIds: string[]
  showFix: boolean

  selectIssue: (id: string | null) => void
  toggleShowFix: () => void
  applyFix: (id: string) => void
  resetFixes: () => void
}

export const useResultsStore = create<ResultsState>((set) => ({
  analysis: moldAnalysisData,
  selectedIssueId: moldAnalysisData.issues[0]?.id ?? null,
  fixedIssueIds: [],
  showFix: false,

  selectIssue: (id) => set({ selectedIssueId: id, showFix: false }),
  toggleShowFix: () => set((s) => ({ showFix: !s.showFix })),
  applyFix: (id) =>
    set((s) =>
      s.fixedIssueIds.includes(id)
        ? s
        : { fixedIssueIds: [...s.fixedIssueIds, id], showFix: true },
    ),
  resetFixes: () => set({ fixedIssueIds: [], showFix: false }),
}))

export function computeCurrentScore(
  base: number,
  improved: number,
  fixedIds: string[],
  issues: MoldAnalysisResult['issues'],
): number {
  if (fixedIds.length === 0) return base
  const totalGain = issues.reduce((sum, issue) => {
    if (!fixedIds.includes(issue.id)) return sum
    const gain = Number(issue.scoreImpact.replace('+', '')) || 0
    return sum + gain
  }, 0)
  return Math.min(improved, base + totalGain)
}
