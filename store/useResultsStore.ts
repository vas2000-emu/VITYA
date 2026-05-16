import { create } from 'zustand'
import { toast } from 'sonner'
import { moldAnalysisData, partsLibrary } from '@/lib/mockMoldAnalysis'
import { useAppStore } from '@/store/useAppStore'
import type { MoldAnalysisResult, PartId } from '@/lib/types'

export const LOADING_PHASES = [
  'Parsing STEP geometry',
  'Detecting features (holes, bosses, ribs)',
  'Checking draft angles and undercuts',
  'Querying Michigan supplier readiness',
  'Generating recommendations',
] as const

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
  /** Switch which part the dashboard is reporting on. Also syncs the
   *  viewport's currentPartId and clears any user-uploaded STL so the
   *  viewport renders the matching procedural geometry. */
  selectPart: (id: PartId) => void
  /** Demo helper: cycles through loading phases then restores mock data. */
  simulateAnalysis: () => Promise<void>
}

// Module-level token used by simulateAnalysis() to short-circuit stale runs
// when a newer simulate is kicked off (e.g. user clicks Re-analyze twice fast,
// or switches parts mid-load).
let simulateToken = 0

export const useResultsStore = create<ResultsState>((set, get) => ({
  analysis: moldAnalysisData,
  selectedIssueId: moldAnalysisData.issues[0]?.id ?? null,
  fixedIssueIds: [],
  showFix: false,

  loading: false,
  loadingPhase: LOADING_PHASES[0],
  setLoading: (loading, phase = LOADING_PHASES[0]) => set({ loading, loadingPhase: phase }),
  setAnalysis: (analysis) =>
    set({
      analysis,
      selectedIssueId: analysis.issues[0]?.id ?? null,
      fixedIssueIds: [],
      showFix: false,
    }),

  selectIssue: (id) => set({ selectedIssueId: id, showFix: false }),
  toggleShowFix: () => set((s) => ({ showFix: !s.showFix })),
  applyFix: (id) => {
    const already = get().fixedIssueIds.includes(id)
    if (already) {
      toast('Already fixed', { description: 'This issue is already in the applied-fixes list.' })
      return
    }
    set((s) => ({ fixedIssueIds: [...s.fixedIssueIds, id], showFix: true }))
  },
  resetFixes: () => {
    // Bumping the token cancels any in-flight simulate so the reset isn't
    // immediately stomped by a phase tick.
    simulateToken++
    set({ fixedIssueIds: [], showFix: false })
  },

  selectPart: (id) => {
    const next = partsLibrary[id]
    if (!next) {
      toast.error(`Unknown part "${id}"`)
      return
    }
    simulateToken++ // cancel any in-flight analysis simulation
    set({
      analysis: next,
      selectedIssueId: next.issues[0]?.id ?? null,
      fixedIssueIds: [],
      showFix: false,
    })
    // Sync the workspace viewport so its geometry matches the dashboard.
    const app = useAppStore.getState()
    app.setCurrentPartId(id)
    if (app.uploadedSTL) {
      URL.revokeObjectURL(app.uploadedSTL)
      app.setUploadedSTL(null)
    }
  },

  simulateAnalysis: async () => {
    const myToken = ++simulateToken
    for (const phase of LOADING_PHASES) {
      if (myToken !== simulateToken) return // a newer run replaced us
      set({ loading: true, loadingPhase: phase })
      await new Promise((r) => setTimeout(r, 550))
    }
    if (myToken !== simulateToken) return
    set({
      loading: false,
      loadingPhase: LOADING_PHASES[0],
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
