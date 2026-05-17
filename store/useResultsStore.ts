import { create } from 'zustand'
import { toast } from 'sonner'
import { moldAnalysisData, getDashboardAnalysis } from '@/lib/mockMoldAnalysis'
import { getPartSimInputs } from '@/lib/partSimInputs'
import { runFullAnalysis, type FullAnalysisResponse } from '@/lib/moldsim-api'
import { useAppStore } from '@/store/useAppStore'
import type { MoldAnalysisResult, PartId, UserPart } from '@/lib/types'

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

  // Live moldsim API responses. Set by runMoldsim(), nullable so the UI
  // can show a skeleton / fallback to the mock numbers if the API is
  // mid-flight or errored.
  liveResults: FullAnalysisResponse | null
  liveError: string | null

  // Loading state — drives <LoadingScreen />. Phase strings come from
  // LOADING_PHASES below.
  loading: boolean
  loadingPhase: string
  setLoading: (loading: boolean, phase?: string) => void
  setAnalysis: (analysis: MoldAnalysisResult) => void

  selectIssue: (id: string | null) => void
  toggleShowFix: () => void
  applyFix: (id: string) => void
  resetFixes: () => void
  /** Switch which part the dashboard is reporting on. Also syncs the
   *  viewport's currentPartId, clears any user-uploaded STL, and fires
   *  the moldsim API for the new part. */
  selectPart: (id: PartId) => void
  /** Switch the active part to one of the user-registered entries
   *  (AI-generated or STL-uploaded). Hydrates simulationParams +
   *  geometry baselines from the UserPart, sets currentPartId, fires
   *  the moldsim API. Counterpart to selectPart for demo entries. */
  selectUserPart: (part: UserPart) => Promise<void>
  /** Fire moldsim API for the current part. Updates `liveResults`,
   *  drives the loading screen, and overrides `analysis` scores with
   *  API-derived values (cost, dfm score, cycle time). */
  runMoldsim: () => Promise<void>
}

// Module-level token used by runMoldsim() to short-circuit stale runs
// when a newer simulate is kicked off (e.g. user clicks Re-analyze twice fast,
// or switches parts mid-load).
let simulateToken = 0

/** Shared user-part analysis path used by both selectUserPart() (when
 *  the user switches to an AI/STL part) and runMoldsim() (when the
 *  dashboard re-fires on mount or via the Re-analyze button). Hydrates
 *  simulation params, fires the moldsim API, and writes a synthetic
 *  MoldAnalysisResult into the results store. Side-effects only — no
 *  return value. */
async function runUserPartAnalysis(
  part: UserPart,
  set: (partial: Partial<ResultsState>) => void,
): Promise<void> {
  const dims =
    part.kind === 'ai-created'
      ? {
          partLength: part.spec.partLength,
          partWidth: part.spec.partWidth,
          partHeight: part.spec.partHeight,
          wallThickness: part.spec.wallThickness,
          material: part.spec.material,
        }
      : {
          partLength: part.partLength,
          partWidth: part.partWidth,
          partHeight: part.partHeight,
          wallThickness: part.wallThickness,
          material: part.material,
        }

  const app = useAppStore.getState()
  const volCm3 = (dims.partLength * dims.partWidth * dims.partHeight * dims.wallThickness) / 1_000_000
  const partVolume = Math.max(1, volCm3)
  const partWeight = Math.max(1, volCm3 * 1)
  const projectedArea = Math.max(1, (dims.partLength * dims.partHeight) / 100)

  // DFM-trigger overrides from the AI-created spec (intentionally-bad
  // parts). STL uploads have no spec, so they always get safe defaults.
  const aiSpec = part.kind === 'ai-created' ? part.spec : null
  const minDraftAngle = aiSpec?.minDraftAngle ?? 2
  const hasSharpCorners = aiSpec?.hasSharpCorners ?? false
  const hasUniformWall = aiSpec?.hasUniformWall ?? true
  const numUndercuts = aiSpec?.numUndercuts ?? 0
  const complexity = aiSpec?.complexity ?? 'moderate'

  app.setSimulationBaseline({ ...dims, partVolume, partWeight, projectedArea })
  app.updateSimulationParams({
    ...dims,
    partVolume,
    partWeight,
    projectedArea,
    complexity,
    minDraftAngle,
    productionQuantity: 10_000,
    meltTemp: 230,
    moldTemp: 50,
    numCavities: 1,
    numUndercuts,
    hasSharpCorners,
    hasUniformWall,
  })
  app.updateParameterValue('p-len', dims.partLength)
  app.updateParameterValue('p-wid', dims.partWidth)
  app.updateParameterValue('p-height', dims.partHeight)
  app.updateParameterValue('p-wall', dims.wallThickness)
  app.updateParameterValue('p-draft', minDraftAngle)

  app.setSimulationResults({ isLoading: true, error: null })
  try {
    const results = await runFullAnalysis({
      material: dims.material,
      wall_thickness: dims.wallThickness,
      part_volume: partVolume,
      part_weight: partWeight,
      projected_area: projectedArea,
      part_length: dims.partLength,
      part_width: dims.partWidth,
      part_height: dims.partHeight,
      melt_temp: 230,
      mold_temp: 50,
      production_quantity: 10_000,
      complexity,
      num_cavities: 1,
      num_undercuts: numUndercuts,
      min_draft_angle: minDraftAngle,
      has_sharp_corners: hasSharpCorners,
      has_uniform_wall: hasUniformWall,
    })
    app.setSimulationResults({
      cost: results.cost,
      cooling: results.cooling,
      dfm: results.manufacturing,
      filling: results.filling,
      isLoading: false,
      error: null,
    })

    const dfmScore = Math.round(results.manufacturing.overall_score)
    const tooling = results.cost.total_tooling_cost
    const perPart = results.cost.total_cost_per_part
    const cycleTime = results.cooling.cycle_time
    const costRiskLabel =
      tooling > 25_000 || perPart > 2 ? 'High' : tooling > 15_000 ? 'Medium' : 'Low'
    const leadTimeLabel = cycleTime > 45 ? 'Long' : cycleTime > 30 ? 'Moderate' : 'Short'

    const syntheticAnalysis: MoldAnalysisResult = {
      partId: part.id as PartId,
      partName: part.label,
      partSummary:
        part.kind === 'ai-created'
          ? `AI-generated ${part.spec.shape} part.`
          : 'User-uploaded STL part.',
      overallScore: dfmScore,
      improvedScore: dfmScore,
      issues: [],
      riskSummary: [
        {
          label: 'Moldability',
          value: `${dfmScore}/100`,
          description: results.manufacturing.is_manufacturable
            ? 'Geometry meets baseline DFM thresholds.'
            : 'DFM checks flagged risks — review the issues panel.',
        },
        {
          label: 'Cost risk',
          value: costRiskLabel,
          description: `~$${tooling.toLocaleString()} tooling + $${perPart.toFixed(2)}/part at 10,000 pcs.`,
        },
        {
          label: 'Lead time',
          value: leadTimeLabel,
          description: `Cycle time ${cycleTime.toFixed(1)}s; ${Math.round(results.cost.parts_per_hour)} pcs/hr.`,
        },
        {
          label: 'Fill time',
          value: `${results.filling.estimated_fill_time.toFixed(1)}s`,
          description:
            results.filling.flow_ratio >= 0.95
              ? 'Part fills completely.'
              : 'Potential short-shot risk.',
        },
      ],
      supplierReadiness: {
        region: 'Michigan',
        status:
          dfmScore >= 80 ? 'Ready' : dfmScore >= 60 ? 'Review needed' : 'Redesign recommended',
        notes: results.manufacturing.summary,
      },
      checklist:
        results.manufacturing.issues.length === 0
          ? [{ id: 'dfm-ok', label: 'No DFM issues detected', status: 'good' as const }]
          : results.manufacturing.issues.map((issue, i) => ({
              id: `dfm-${i}`,
              label: issue.issue,
              status: (
                issue.severity === 'critical'
                  ? 'action'
                  : issue.severity === 'warning'
                    ? 'attention'
                    : 'good'
              ) as 'good' | 'attention' | 'action',
            })),
    }

    set({
      liveResults: results,
      liveError: null,
      analysis: syntheticAnalysis,
      selectedIssueId: null,
      fixedIssueIds: [],
      pendingFixId: null,
      showFix: false,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to analyze part'
    app.setSimulationResults({ isLoading: false, error: msg })
    toast.error(msg)
  }
}

export const useResultsStore = create<ResultsState>((set, get) => ({
  analysis: moldAnalysisData,
  selectedIssueId: moldAnalysisData.issues[0]?.id ?? null,
  fixedIssueIds: [],
  pendingFixId: null,
  showFix: false,

  liveResults: null,
  liveError: null,

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
    const next = getDashboardAnalysis(id)
    if (!next) {
      toast.error(`Unknown part "${id}"`)
      return
    }
    // Reset state with the mock baseline; runMoldsim() below will then
    // overwrite the scalar metrics with API-derived values.
    set({
      analysis: next,
      selectedIssueId: next.issues[0]?.id ?? null,
      fixedIssueIds: [],
      pendingFixId: null,
      showFix: false,
      liveResults: null,
      liveError: null,
    })
    // Sync the workspace viewport so its geometry matches the dashboard.
    const app = useAppStore.getState()
    app.setCurrentPartId(id)
    if (app.uploadedSTL) {
      URL.revokeObjectURL(app.uploadedSTL)
      app.setUploadedSTL(null)
    }
    // Sync the workspace's simulationParams so the /analysis/* pages
    // (cost, draft, thickness, undercut, on-demand) reflect this part
    // when the user navigates there. partSimInputs uses the API's
    // snake_case shape; simulationParams uses camelCase — map across.
    const inputs = getPartSimInputs(id)
    if (inputs) {
      // Reset the scaling baseline FIRST so the dimension-derived
      // fields (volume/weight/projectedArea) lock onto this preset's
      // numbers when we push the patch below.
      app.setSimulationBaseline({
        material: inputs.material,
        wallThickness: inputs.wall_thickness,
        partVolume: inputs.part_volume,
        partWeight: inputs.part_weight,
        projectedArea: inputs.projected_area,
        partLength: inputs.part_length,
        partWidth: inputs.part_width,
        partHeight: inputs.part_height,
      })
      app.updateSimulationParams({
        material: inputs.material,
        wallThickness: inputs.wall_thickness,
        partVolume: inputs.part_volume,
        partWeight: inputs.part_weight,
        projectedArea: inputs.projected_area,
        partLength: inputs.part_length,
        partWidth: inputs.part_width,
        partHeight: inputs.part_height,
        meltTemp: inputs.melt_temp,
        moldTemp: inputs.mold_temp,
        productionQuantity: inputs.production_quantity,
        complexity: inputs.complexity,
        numCavities: inputs.num_cavities,
        numUndercuts: inputs.num_undercuts,
        minDraftAngle: inputs.min_draft_angle,
        hasSharpCorners: inputs.has_sharp_corners,
        hasUniformWall: inputs.has_uniform_wall,
      })
      // A6: sync the Parameters-panel values so the left-panel UI
      // reflects the part you just loaded instead of bracket-era
      // defaults.
      app.updateParameterValue('p-len', inputs.part_length)
      app.updateParameterValue('p-wid', inputs.part_width)
      app.updateParameterValue('p-height', inputs.part_height)
      app.updateParameterValue('p-wall', inputs.wall_thickness)
      app.updateParameterValue('p-draft', inputs.min_draft_angle)
    }
    // Fire the moldsim API for the new part. simulateToken bump inside
    // runMoldsim cancels any earlier in-flight run.
    void get().runMoldsim()
  },

  selectUserPart: async (part) => {
    const app = useAppStore.getState()
    if (part.kind === 'ai-created') {
      // STL upload (if any) is stale once we switch to an AI part.
      if (app.uploadedSTL) {
        URL.revokeObjectURL(app.uploadedSTL)
        app.setUploadedSTL(null)
      }
      app.setCustomPartSpec(part.spec)
    } else {
      // Uploaded part: reinstate the stored Blob URL on the viewport
      // (the user may have cleared it earlier).
      app.setUploadedSTL(part.stlUrl)
      app.setCustomPartSpec(null)
    }
    app.setCurrentPartId(part.id)
    await runUserPartAnalysis(part, set)
  },

  runMoldsim: async () => {
    const myToken = ++simulateToken
    const partId = get().analysis.partId

    // If the active part is a user-registered one (AI-generated or
    // STL-uploaded), bypass the demo-part path entirely — those parts
    // have no entry in partSimInputs / mockMoldAnalysis. Re-run the
    // synthetic analysis using the saved UserPart dims instead.
    const userPart = useAppStore.getState().userParts.find((p) => p.id === partId)
    if (userPart) {
      set({ loading: true, loadingPhase: LOADING_PHASES[0].label, liveError: null })
      const phaseTicks = (async () => {
        for (const phase of LOADING_PHASES) {
          if (myToken !== simulateToken) return
          set({ loadingPhase: phase.label })
          await new Promise((r) => setTimeout(r, phase.ms))
        }
      })()
      try {
        await Promise.all([runUserPartAnalysis(userPart, set), phaseTicks])
        if (myToken !== simulateToken) return
        set({ loading: false, loadingPhase: LOADING_PHASES[0].label })
      } catch {
        if (myToken !== simulateToken) return
        set({ loading: false, loadingPhase: LOADING_PHASES[0].label })
      }
      return
    }

    const inputs = getPartSimInputs(partId)
    const baseMock = getDashboardAnalysis(partId)
    if (!inputs || !baseMock) {
      // Unknown part id that's not a UserPart and not a demo part — keep
      // the existing analysis on screen and stay silent. A toast here
      // would fire on every report-page mount for AI parts created in a
      // prior session.
      return
    }

    set({ loading: true, loadingPhase: LOADING_PHASES[0].label, liveError: null })

    // Tick the loading phases on a fixed schedule while the API call runs
    // in parallel. The API is typically sub-second; we let phases finish
    // their scripted duration so the UI doesn't feel jerky.
    const phaseTicks = (async () => {
      for (const phase of LOADING_PHASES) {
        if (myToken !== simulateToken) return
        set({ loadingPhase: phase.label })
        await new Promise((r) => setTimeout(r, phase.ms))
      }
    })()

    try {
      const [results] = await Promise.all([runFullAnalysis(inputs), phaseTicks])
      if (myToken !== simulateToken) return

      // Map API response into the dashboard's analysis shape. We keep the
      // rich-text mock fields (issues, recommendations, supplier notes)
      // and override the scalar metrics with live values. baseMock + inputs
      // were resolved up top so the early-return runs before we kick the
      // loading phases.
      const dfmScore = Math.round(results.manufacturing.overall_score)
      const tooling = results.cost.total_tooling_cost
      const perPart = results.cost.total_cost_per_part
      const cycleTime = results.cooling.cycle_time

      const costRiskLabel = tooling > 25_000 || perPart > 2 ? 'High' : tooling > 15_000 ? 'Medium' : 'Low'
      const leadTimeLabel = cycleTime > 45 ? 'Long' : cycleTime > 30 ? 'Moderate' : 'Short'

      const liveAnalysis: MoldAnalysisResult = {
        ...baseMock,
        overallScore: dfmScore,
        riskSummary: [
          {
            label: `${baseMock.supplierReadiness.region} readiness`,
            value: `${dfmScore}/100`,
            description: results.manufacturing.summary,
          },
          {
            label: 'Moldability',
            value: `${dfmScore}/100`,
            description: results.manufacturing.is_manufacturable
              ? 'Geometry meets baseline DFM thresholds.'
              : 'DFM checks flagged risks — review the issues panel.',
          },
          {
            label: 'Cost risk',
            value: costRiskLabel,
            description: `~$${tooling.toLocaleString()} tooling + $${perPart.toFixed(2)}/part at ${inputs.production_quantity.toLocaleString()} pcs.`,
          },
          {
            label: 'Lead time',
            value: leadTimeLabel,
            description: `Cycle time ${cycleTime.toFixed(1)}s; ${Math.round(results.cost.parts_per_hour)} pcs/hr.`,
          },
        ],
      }

      set({
        loading: false,
        loadingPhase: LOADING_PHASES[0].label,
        liveResults: results,
        liveError: null,
        analysis: liveAnalysis,
        // Don't clobber user's applied fixes when re-running.
      })
    } catch (err) {
      if (myToken !== simulateToken) return
      const message = err instanceof Error ? err.message : 'Simulation failed'
      set({
        loading: false,
        loadingPhase: LOADING_PHASES[0].label,
        liveError: message,
      })
      toast.error('Moldsim API call failed', { description: message })
    }
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
