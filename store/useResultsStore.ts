import { create } from 'zustand'
import { moldAnalysisData } from '@/lib/mockMoldAnalysis'
import type { MoldAnalysisResult } from '@/lib/types'

interface ResultsState {
  analysis: MoldAnalysisResult
  selectedIssueId: string | null
  fixedIssueIds: string[]
  showFix: boolean

  // Loading state — flip these when the real backend fetch is wired in.
  // See `lib/backendAdapter.ts` for the example fetchAnalysis() helper.
  loading: boolean
  loadingPhase: string
  setLoading: (loading: boolean, phase?: string) => void
  setAnalysis: (analysis: MoldAnalysisResult) => void

  selectIssue: (id: string | null) => void
  toggleShowFix: () => void
  applyFix: (id: string) => void
  resetFixes: () => void
  /** Demo helper: cycles through loading phases then restores mock data. */
  simulateAnalysis: () => Promise<void>
}

export const useResultsStore = create<ResultsState>((set) => ({
  analysis: moldAnalysisData,
  selectedIssueId: moldAnalysisData.issues[0]?.id ?? null,
  fixedIssueIds: [],
  showFix: false,

  loading: false,
  loadingPhase: '',
  setLoading: (loading, phase = '') => set({ loading, loadingPhase: phase }),
  setAnalysis: (analysis) =>
    set({
      analysis,
      selectedIssueId: analysis.issues[0]?.id ?? null,
      fixedIssueIds: [],
      showFix: false,
    }),

  selectIssue: (id) => set({ selectedIssueId: id, showFix: false }),
  toggleShowFix: () => set((s) => ({ showFix: !s.showFix })),
  applyFix: (id) =>
    set((s) =>
      s.fixedIssueIds.includes(id)
        ? s
        : { fixedIssueIds: [...s.fixedIssueIds, id], showFix: true },
    ),
  resetFixes: () => set({ fixedIssueIds: [], showFix: false }),

  simulateAnalysis: async () => {
    const phases = [
      'Parsing STEP geometry',
      'Detecting features (holes, bosses, ribs)',
      'Checking draft angles and undercuts',
      'Querying Michigan supplier readiness',
      'Generating recommendations',
    ]
    for (const phase of phases) {
      set({ loading: true, loadingPhase: phase })
      await new Promise((r) => setTimeout(r, 550))
    }
    set({
      loading: false,
      loadingPhase: '',
      fixedIssueIds: [],
      showFix: false,
      selectedIssueId: moldAnalysisData.issues[0]?.id ?? null,
    })
  },
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
