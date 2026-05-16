import { create } from 'zustand'
import { toast } from 'sonner'
import { moldAnalysisData, partsLibrary } from '@/lib/mockMoldAnalysis'
import { useAppStore } from '@/store/useAppStore'
import type { MoldAnalysisResult, PartId } from '@/lib/types'

/**
 * Loading phases shown by LoadingScreen. Each phase has a label and a
 * minimum duration so the simulated analysis feels like real work rather
 * than a sequence of 100ms blips. Sum is ~5s — long enough to feel real,
 * short enough not to bore.
 */
export const LOADING_PHASES = [
  { label: 'Parsing geometry…', ms: 800 },
  { label: 'Computing surface normals…', ms: 550 },
  { label: 'Sampling wall thickness…', ms: 1100 },
  { label: 'Detecting undercuts…', ms: 700 },
  { label: 'Estimating cost via Michigan ABS norms…', ms: 900 },
  { label: 'Querying supplier readiness…', ms: 600 },
  { label: 'Compiling report…', ms: 400 },
] as const

export const LOADING_PHASE_LABELS = LOADING_PHASES.map((p) => p.label)

interface ResultsState {
  analysis: MoldAnalysisResult
  selectedIssueId: string | null
  fixedIssueIds: string[]
  /** While a fix is "applying" (CSS+3D transition window), this is the
   *  issue id; null when no fix is mid-application. UI uses this to show
   *  spinners and to animate the mesh region's color. */
  pendingFixId: string | null
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
  pendingFixId: null,
  showFix: false,

  loading: false,
  loadingPhase: LOADING_PHASES[0].label,
  setLoading: (loading, phase = LOADING_PHASES[0].label) => set({ loading, loadingPhase: phase }),
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
    const state = get()
    if (state.fixedIssueIds.includes(id)) {
      toast('Already fixed', { description: 'This issue is already in the applied-fixes list.' })
      return
    }
    if (state.pendingFixId) {
      toast('A fix is already applying', { description: 'Wait for the current animation to finish.' })
      return
    }
    // Two-phase apply so the viewport / score / diff have a transition
    // window to animate before the commit lands.
    set({ pendingFixId: id, showFix: true })
    const PENDING_MS = 1500
    setTimeout(() => {
      // Guard: user may have hit Reset or switched parts mid-apply.
      const after = get()
      if (after.pendingFixId !== id) return
      set((s) => ({
        fixedIssueIds: s.fixedIssueIds.includes(id) ? s.fixedIssueIds : [...s.fixedIssueIds, id],
        pendingFixId: null,
        showFix: true,
      }))
      const issue = after.analysis.issues.find((i) => i.id === id)
      if (issue) {
        toast.success(`Fix applied: ${issue.title}`, {
          description: `Score ${issue.scoreImpact}`,
        })
      }
    }, PENDING_MS)
  },
  resetFixes: () => {
    // Bumping the token cancels any in-flight simulate so the reset isn't
    // immediately stomped by a phase tick.
    simulateToken++
    set({ fixedIssueIds: [], pendingFixId: null, showFix: false })
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
      pendingFixId: null,
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
      set({ loading: true, loadingPhase: phase.label })
      await new Promise((r) => setTimeout(r, phase.ms))
    }
    if (myToken !== simulateToken) return
    set({
      loading: false,
      loadingPhase: LOADING_PHASES[0].label,
      fixedIssueIds: [],
      pendingFixId: null,
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
