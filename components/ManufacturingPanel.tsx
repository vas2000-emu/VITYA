'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  XCircle,
  PanelRightClose,
  PanelRight,
  Loader2,
  Download,
  Cog,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/useAppStore'
import { checkManufacturing, calculateCost, calculateCooling, calculateFilling } from '@/lib/moldsim-api'
import { useLiveDfmScore, type LiveDfmSeverity } from './viewport/useLiveDfmScore'

const severityIcon: Record<LiveDfmSeverity, React.ReactNode> = {
  critical: <XCircle className="size-4 text-red-400" />,
  warning: <AlertTriangle className="size-4 text-yellow-400" />,
  info: <AlertCircle className="size-4 text-blue-400" />,
}

const severityBg: Record<LiveDfmSeverity, string> = {
  critical: 'bg-red-500/10 border-red-500/30',
  warning: 'bg-yellow-500/10 border-yellow-500/30',
  info: 'bg-blue-500/10 border-blue-500/30',
}

export function ManufacturingPanel() {
  const {
    rightCollapsed,
    setRightCollapsed,
    simulationParams,
    simulationResults,
    setSimulationResults,
    currentPartId,
  } = useAppStore()

  // Live DFM data — derived synchronously from simulationParams so any
  // edit to the Parameters or Simulation Settings panels reflects
  // immediately here (no Run button needed). Cost/cooling/filling
  // still live in simulationResults because they require API calls.
  const live = useLiveDfmScore()

  const [isGenerating, setIsGenerating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false)

  const errorCount = live.issues.filter((i) => i.severity === 'critical').length
  const warningCount = live.issues.filter((i) => i.severity === 'warning').length
  const infoCount = live.issues.filter((i) => i.severity === 'info').length

  /** Run the four moldsim endpoints in parallel and stash the responses
   *  in simulationResults. Field names match the actual request shapes
   *  in lib/moldsim/types.ts. */
  const handleRunAnalysis = async () => {
    setIsRunningAnalysis(true)
    setSimulationResults({ isLoading: true, error: null })

    try {
      const [dfm, cost, cooling, filling] = await Promise.all([
        checkManufacturing({
          wall_thickness: simulationParams.wallThickness,
          min_draft_angle: simulationParams.minDraftAngle,
          num_undercuts: simulationParams.numUndercuts,
          material: simulationParams.material,
          has_sharp_corners: simulationParams.hasSharpCorners,
          has_uniform_wall: simulationParams.hasUniformWall,
          part_length: simulationParams.partLength,
          part_width: simulationParams.partWidth,
          part_height: simulationParams.partHeight,
        }),
        calculateCost({
          part_volume: simulationParams.partVolume,
          part_weight: simulationParams.partWeight,
          projected_area: simulationParams.projectedArea,
          wall_thickness: simulationParams.wallThickness,
          production_quantity: simulationParams.productionQuantity,
          material: simulationParams.material,
          complexity: simulationParams.complexity,
          num_cavities: simulationParams.numCavities,
          num_undercuts: simulationParams.numUndercuts,
          melt_temp: simulationParams.meltTemp,
          mold_temp: simulationParams.moldTemp,
        }),
        calculateCooling({
          wall_thickness: simulationParams.wallThickness,
          melt_temp: simulationParams.meltTemp,
          mold_temp: simulationParams.moldTemp,
          material: simulationParams.material,
        }),
        calculateFilling({
          flow_length: Math.max(simulationParams.partLength, simulationParams.partWidth),
          wall_thickness: simulationParams.wallThickness,
          melt_temp: simulationParams.meltTemp,
          mold_temp: simulationParams.moldTemp,
          material: simulationParams.material,
        }),
      ])

      setSimulationResults({ dfm, cost, cooling, filling, isLoading: false, error: null })
      toast.success('Full simulation complete', {
        description: `Cost, cooling, filling refreshed. Moldability ${dfm.overall_score}/100.`,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed'
      setSimulationResults({ error: message, isLoading: false })
      toast.error('Analysis failed', { description: message })
    } finally {
      setIsRunningAnalysis(false)
    }
  }

  /** Generate a JSON summary of the mold design and trigger a download. */
  const handleGenerateMoldDesign = async () => {
    setIsGenerating(true)

    try {
      if (!simulationResults.dfm || !simulationResults.cost) {
        await handleRunAnalysis()
      }

      const moldDesign = {
        partInfo: {
          material: simulationParams.material,
          volume_cm3: simulationParams.partVolume,
          weight_g: simulationParams.partWeight,
          wall_thickness_mm: simulationParams.wallThickness,
        },
        moldRecommendations: {
          mold_material: 'P20 Steel',
          num_cavities: simulationParams.numCavities,
          estimated_tool_life: 500_000,
          tooling_cost: simulationResults.cost?.total_tooling_cost ?? 0,
        },
        processParameters: {
          melt_temp_c: simulationParams.meltTemp,
          mold_temp_c: simulationParams.moldTemp,
          cycle_time_s: simulationResults.cooling?.cycle_time ?? 0,
          cooling_time_s: simulationResults.cooling?.cooling_time ?? 0,
        },
        dfmScore: simulationResults.dfm?.overall_score ?? 0,
        issues: simulationResults.dfm?.issues ?? [],
      }

      const blob = new Blob([JSON.stringify(moldDesign, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'mold-design-recommendation.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Mold design saved', { description: 'mold-design-recommendation.json' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate mold design'
      toast.error('Generate failed', { description: message })
    } finally {
      setIsGenerating(false)
    }
  }

  /** Export the analysis as a PDF report via /api/report. */
  const handleExportReport = async () => {
    setIsExporting(true)

    try {
      if (!simulationResults.cost && !simulationResults.dfm) {
        await handleRunAnalysis()
      }

      // Use the dashboard's PDF route — it owns the layout and pulls
      // from the current part's analysis. currentPartId is kept in sync
      // by useResultsStore.selectPart, so the export tracks the part
      // the user is actually viewing.
      window.open(
        `/api/report?partId=${encodeURIComponent(currentPartId)}`,
        '_blank',
        'noopener',
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export report'
      toast.error('Export failed', { description: message })
    } finally {
      setIsExporting(false)
    }
  }

  if (rightCollapsed) {
    return (
      <div className="h-full flex flex-col bg-zinc-900 w-12">
        <div className="flex flex-col items-center py-3 border-b border-zinc-800">
          <button
            type="button"
            onClick={() => setRightCollapsed(false)}
            className="p-2 hover:bg-zinc-800 rounded"
            title="Expand Manufacturing"
          >
            <PanelRight className="size-4 text-orange-400" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-zinc-900">
      <div className="px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-orange-400" />
            <h2 className="font-medium">Manufacturing Analysis</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleRunAnalysis}
              disabled={isRunningAnalysis}
              className="p-1 hover:bg-zinc-800 rounded disabled:opacity-50"
              title="Re-run Analysis"
            >
              {isRunningAnalysis ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setRightCollapsed(true)}
              className="p-1 hover:bg-zinc-800 rounded"
              title="Collapse Manufacturing"
            >
              <PanelRightClose className="size-4" />
            </button>
          </div>
        </div>
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span>{errorCount} critical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <span>{warningCount} warning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <span>{infoCount} info</span>
          </div>
        </div>
      </div>

      {/* Summary card — DFM score updates synchronously off
          simulationParams via useLiveDfmScore. Cost / cycle / tooling
          stay from the last "Re-run Analysis" press (they need API). */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-500">Live moldability</span>
          <span className="text-[10px] uppercase tracking-wider text-zinc-600 inline-flex items-center gap-1">
            <CheckCircle2 className="size-3 text-emerald-400/80" />
            in sync with parameters
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded bg-zinc-800/50">
            <div className="text-zinc-400">Moldability score</div>
            <div
              className={`font-medium ${
                live.score >= 70
                  ? 'text-emerald-400'
                  : live.score >= 50
                    ? 'text-amber-400'
                    : 'text-rose-400'
              }`}
            >
              {live.score}/100
            </div>
          </div>
          {simulationResults.cost && (
            <div className="p-2 rounded bg-zinc-800/50">
              <div className="text-zinc-400">Per-part</div>
              <div className="font-medium text-zinc-100">
                ${simulationResults.cost.total_cost_per_part.toFixed(2)}
              </div>
            </div>
          )}
          {simulationResults.cooling && (
            <div className="p-2 rounded bg-zinc-800/50">
              <div className="text-zinc-400">Cycle time</div>
              <div className="font-medium text-zinc-100">
                {simulationResults.cooling.cycle_time.toFixed(1)}s
              </div>
            </div>
          )}
          {simulationResults.cost && (
            <div className="p-2 rounded bg-zinc-800/50">
              <div className="text-zinc-400">Tooling</div>
              <div className="font-medium text-zinc-100">
                ${(simulationResults.cost.total_tooling_cost / 1000).toFixed(1)}k
              </div>
            </div>
          )}
        </div>
        {!simulationResults.cost && (
          <div className="text-[11px] text-zinc-500 mt-2">
            Press <RefreshCw className="inline size-3 -mt-0.5" /> to also pull cost,
            cooling, and filling numbers.
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {live.issues.length === 0 ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200 flex items-start gap-3">
            <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">No moldability issues at current settings.</div>
              <div className="text-xs text-emerald-300/80 mt-1">{live.summary}</div>
            </div>
          </div>
        ) : (
          live.issues.map((issue, idx) => (
            <div
              key={`${issue.category}-${idx}`}
              className={`border rounded-lg overflow-hidden ${severityBg[issue.severity]}`}
            >
              <div className="flex items-start gap-3 p-3">
                {severityIcon[issue.severity]}
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-zinc-400 mb-0.5 capitalize">{issue.severity}</div>
                  <div className="text-sm font-medium">{issue.category}</div>
                  <div className="text-xs text-zinc-400 mt-1">{issue.issue}</div>
                  <div className="text-xs text-zinc-500 mt-1">{issue.recommendation}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-zinc-800 space-y-2">
        <button
          type="button"
          onClick={handleGenerateMoldDesign}
          disabled={isGenerating}
          className="w-full px-3 py-2 text-sm bg-orange-600 hover:bg-orange-700 rounded flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Cog className="size-4" />
              Generate Mold Design
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleExportReport}
          disabled={isExporting}
          className="w-full px-3 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isExporting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="size-4" />
              Export Analysis Report
            </>
          )}
        </button>
      </div>
    </div>
  )
}
