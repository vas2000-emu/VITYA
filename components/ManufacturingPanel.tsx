'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  PanelRightClose,
  PanelRight,
  Loader2,
  Download,
  Cog,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/useAppStore'
import type { ManufacturingIssue, IssueType } from '@/lib/types'
import { checkManufacturing, calculateCost, calculateCooling, calculateFilling } from '@/lib/moldsim-api'

const issueIcons: Record<IssueType, React.ReactNode> = {
  error: <XCircle className="size-4 text-red-400" />,
  warning: <AlertTriangle className="size-4 text-yellow-400" />,
  success: <CheckCircle className="size-4 text-green-400" />,
  info: <AlertCircle className="size-4 text-blue-400" />,
}

const issueBgColors: Record<IssueType, string> = {
  error: 'bg-red-500/10 border-red-500/30',
  warning: 'bg-yellow-500/10 border-yellow-500/30',
  success: 'bg-green-500/10 border-green-500/30',
  info: 'bg-blue-500/10 border-blue-500/30',
}

interface IssueItemProps {
  issue: ManufacturingIssue
}

// Maps issue ID → the camera action to take when highlighting.
// Issue 1 = undercut on sensor bosses (back face) → mounting hole override
// Issue 2 = draft on side faces → front view
// Issue 3 = wall thickness (all walls) → isometric
// Issue 4 = top face draft → top view
// Issue 5 = parting line at Z=20mm → right view
const ISSUE_VIEW: Record<string, 'mountingHole' | 'front' | 'isometric' | 'top' | 'right'> = {
  '1': 'mountingHole',
  '2': 'front',
  '3': 'isometric',
  '4': 'top',
  '5': 'right',
}

function IssueItem({ issue }: IssueItemProps) {
  const [expanded, setExpanded] = useState(false)
  const setViewportView = useAppStore((s) => s.setViewportView)
  const selectFeature = useAppStore((s) => s.selectFeature)
  const heatmap = useAppStore((s) => s.viewportHeatmap)
  const toggleHeatmap = useAppStore((s) => s.toggleViewportHeatmap)

  const handleHighlight = () => {
    if (!heatmap) toggleHeatmap()
    const target = ISSUE_VIEW[issue.id]
    if (target === 'mountingHole') {
      selectFeature('mountingHole')
    } else if (target) {
      setViewportView(target)
    }
    toast.success(`Highlighted ${issue.location ?? issue.title}`, {
      description: 'Camera moved to the issue location.',
    })
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${issueBgColors[issue.type]}`}>
      <button
        type="button"
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-white/5"
        onClick={() => setExpanded(!expanded)}
      >
        {issueIcons[issue.type]}
        <div className="flex-1 min-w-0">
          <div className="text-xs text-zinc-400 mb-0.5">{issue.category}</div>
          <div className="text-sm font-medium">{issue.title}</div>
          {issue.location && (
            <div className="text-xs text-zinc-500 mt-1 font-mono">{issue.location}</div>
          )}
        </div>
        <span className="p-0.5">
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-white/10 space-y-2 mt-2">
          <div className="text-sm text-zinc-300">{issue.description}</div>
          {issue.suggestion && (
            <div className="px-3 py-2 bg-zinc-900/50 rounded text-xs">
              <div className="text-zinc-400 mb-1">Suggestion:</div>
              <div className="text-zinc-300">{issue.suggestion}</div>
            </div>
          )}
          <button
            type="button"
            onClick={handleHighlight}
            className="w-full px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded"
          >
            Highlight in 3D View
          </button>
        </div>
      )}
    </div>
  )
}

export function ManufacturingPanel() {
  const {
    manufacturingIssues,
    rightCollapsed,
    setRightCollapsed,
    simulationParams,
    simulationResults,
    setSimulationResults,
  } = useAppStore()

  const [isGenerating, setIsGenerating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false)

  const errorCount = manufacturingIssues.filter((i) => i.type === 'error').length
  const warningCount = manufacturingIssues.filter((i) => i.type === 'warning').length
  const successCount = manufacturingIssues.filter((i) => i.type === 'success').length

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
      toast.success('Analysis complete', {
        description: `DFM score ${dfm.overall_score}/100 — see results below.`,
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
      // from the current part's analysis. Workspace doesn't track which
      // part the dashboard is on, so default to 'bracket' here.
      window.open('/api/report?partId=bracket', '_blank', 'noopener')
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
            <span>{errorCount} errors</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <span>{warningCount} warnings</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span>{successCount} passed</span>
          </div>
        </div>
      </div>

      {/* MoldSim summary card */}
      {(simulationResults.cost || simulationResults.dfm) && (
        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950/50">
          <div className="text-xs text-zinc-500 mb-2">MoldSim Results</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {simulationResults.dfm && (
              <div className="p-2 rounded bg-zinc-800/50">
                <div className="text-zinc-400">DFM Score</div>
                <div
                  className={`font-medium ${
                    simulationResults.dfm.overall_score >= 70
                      ? 'text-emerald-400'
                      : simulationResults.dfm.overall_score >= 50
                        ? 'text-amber-400'
                        : 'text-rose-400'
                  }`}
                >
                  {simulationResults.dfm.overall_score}/100
                </div>
              </div>
            )}
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
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {manufacturingIssues.map((issue) => (
          <IssueItem key={issue.id} issue={issue} />
        ))}

        {/* Live DFM issues from the moldsim API. severity → UI color. */}
        {simulationResults.dfm?.issues.map((issue) => {
          const issueKey = `${issue.category}-${issue.issue}`
          const bg =
            issue.severity === 'critical'
              ? issueBgColors.error
              : issue.severity === 'warning'
                ? issueBgColors.warning
                : issueBgColors.info
          const icon =
            issue.severity === 'critical'
              ? issueIcons.error
              : issue.severity === 'warning'
                ? issueIcons.warning
                : issueIcons.info
          return (
            <div key={issueKey} className={`border rounded-lg overflow-hidden ${bg}`}>
              <div className="flex items-start gap-3 p-3">
                {icon}
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-zinc-400 mb-0.5 capitalize">{issue.severity}</div>
                  <div className="text-sm font-medium">{issue.category}</div>
                  <div className="text-xs text-zinc-400 mt-1">{issue.issue}</div>
                  <div className="text-xs text-zinc-500 mt-1">{issue.recommendation}</div>
                </div>
              </div>
            </div>
          )
        })}
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
