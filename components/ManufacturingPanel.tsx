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
import { useAppStore } from '@/store/useAppStore'
import type { ManufacturingIssue, IssueType } from '@/lib/types'
import moldSimApi from '@/lib/moldsim-api'

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

function IssueItem({ issue }: IssueItemProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`border rounded-lg overflow-hidden ${issueBgColors[issue.type]}`}>
      <div
        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-white/5"
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
        <button className="p-0.5">
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-white/10 space-y-2 mt-2">
          <div className="text-sm text-zinc-300">{issue.description}</div>
          {issue.suggestion && (
            <div className="px-3 py-2 bg-zinc-900/50 rounded text-xs">
              <div className="text-zinc-400 mb-1">Suggestion:</div>
              <div className="text-zinc-300">{issue.suggestion}</div>
            </div>
          )}
          <button className="w-full px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded">
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

  // Run full analysis pipeline
  const handleRunAnalysis = async () => {
    setIsRunningAnalysis(true)
    setSimulationResults({ isLoading: true, error: null })
    
    try {
      const [dfm, cost, cooling, filling] = await Promise.all([
        moldSimApi.checkManufacturability({
          wall_thickness_mm: simulationParams.wallThickness,
          min_draft_angle_deg: simulationParams.minDraftAngle,
          num_undercuts: simulationParams.numUndercuts,
          material: simulationParams.material,
          has_sharp_corners: simulationParams.hasSharpCorners,
          has_uniform_wall: simulationParams.hasUniformWall,
        }),
        moldSimApi.estimateCost({
          part_volume_cm3: simulationParams.partVolume,
          part_weight_g: simulationParams.partWeight,
          projected_area_cm2: simulationParams.projectedArea,
          wall_thickness_mm: simulationParams.wallThickness,
          production_quantity: simulationParams.productionQuantity,
          material: simulationParams.material,
          complexity: simulationParams.complexity,
          num_cavities: simulationParams.numCavities,
          num_undercuts: simulationParams.numUndercuts,
          melt_temp_c: simulationParams.meltTemp,
          mold_temp_c: simulationParams.moldTemp,
        }),
        moldSimApi.analyzeCooling({
          wall_thickness_mm: simulationParams.wallThickness,
          melt_temp_c: simulationParams.meltTemp,
          mold_temp_c: simulationParams.moldTemp,
          part_volume_cm3: simulationParams.partVolume,
          material: simulationParams.material,
        }),
        moldSimApi.analyzeFilling({
          part_length_mm: simulationParams.partLength,
          wall_thickness_mm: simulationParams.wallThickness,
          part_width_mm: simulationParams.partWidth,
          melt_temp_c: simulationParams.meltTemp,
          mold_temp_c: simulationParams.moldTemp,
          material: simulationParams.material,
        }),
      ])
      
      setSimulationResults({ 
        dfm, 
        cost, 
        cooling, 
        filling, 
        isLoading: false,
        error: null,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed'
      setSimulationResults({ error: message, isLoading: false })
    } finally {
      setIsRunningAnalysis(false)
    }
  }

  // Generate mold design recommendations
  const handleGenerateMoldDesign = async () => {
    setIsGenerating(true)
    
    try {
      // Run analysis if not already done
      if (!simulationResults.dfm || !simulationResults.cost) {
        await handleRunAnalysis()
      }
      
      // In a full implementation, this would generate a detailed mold design document
      // For now, we'll create a summary that could be passed to an AI or report generator
      const moldDesign = {
        partInfo: {
          material: simulationParams.material,
          volume_cm3: simulationParams.partVolume,
          weight_g: simulationParams.partWeight,
          wall_thickness_mm: simulationParams.wallThickness,
        },
        moldRecommendations: {
          mold_material: simulationResults.cost?.tooling.mold_material || 'P20 Steel',
          num_cavities: simulationResults.cost?.tooling.num_cavities || 1,
          estimated_tool_life: simulationResults.cost?.tooling.tool_life_cycles || 500000,
          tooling_cost: simulationResults.cost?.tooling.total_tooling_cost || 0,
        },
        processParameters: {
          melt_temp_c: simulationParams.meltTemp,
          mold_temp_c: simulationParams.moldTemp,
          cycle_time_s: simulationResults.cooling?.cycle_time_breakdown.total_cycle_time_s || 0,
          cooling_time_s: simulationResults.cooling?.cooling_time_s || 0,
        },
        dfmScore: simulationResults.dfm?.dfm_score || 0,
        issues: simulationResults.dfm?.issues || [],
        warnings: simulationResults.dfm?.warnings || [],
      }
      
      // Download as JSON for now
      const blob = new Blob([JSON.stringify(moldDesign, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'mold-design-recommendation.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to generate mold design:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  // Export analysis report
  const handleExportReport = async () => {
    setIsExporting(true)
    
    try {
      // Ensure we have results
      if (!simulationResults.cost && !simulationResults.dfm) {
        await handleRunAnalysis()
      }
      
      const report = {
        generated: new Date().toISOString(),
        partParameters: simulationParams,
        costAnalysis: simulationResults.cost,
        dfmAnalysis: simulationResults.dfm,
        coolingAnalysis: simulationResults.cooling,
        fillingAnalysis: simulationResults.filling,
        manufacturingIssues: manufacturingIssues,
        summary: {
          dfm_score: simulationResults.dfm?.dfm_score || 'N/A',
          total_tooling_cost: simulationResults.cost?.tooling.total_tooling_cost || 'N/A',
          per_part_cost: simulationResults.cost?.total_cost_per_part || 'N/A',
          cycle_time_s: simulationResults.cooling?.cycle_time_breakdown.total_cycle_time_s || 'N/A',
          recommendation: simulationResults.cost?.recommendation || 'Run analysis first',
        }
      }
      
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `moldsim-analysis-report-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to export report:', err)
    } finally {
      setIsExporting(false)
    }
  }

  if (rightCollapsed) {
    return (
      <div className="h-full flex flex-col bg-zinc-900 w-12">
        <div className="flex flex-col items-center py-3 border-b border-zinc-800">
          <button
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

      {/* Simulation Results Summary */}
      {(simulationResults.cost || simulationResults.dfm) && (
        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950/50">
          <div className="text-xs text-zinc-500 mb-2">MoldSim Results</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {simulationResults.dfm && (
              <div className="p-2 rounded bg-zinc-800/50">
                <div className="text-zinc-400">DFM Score</div>
                <div className={`font-medium ${
                  simulationResults.dfm.dfm_score >= 70 ? 'text-emerald-400' :
                  simulationResults.dfm.dfm_score >= 50 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {simulationResults.dfm.dfm_score}/100
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
                  {simulationResults.cooling.cycle_time_breakdown.total_cycle_time_s.toFixed(1)}s
                </div>
              </div>
            )}
            {simulationResults.cost && (
              <div className="p-2 rounded bg-zinc-800/50">
                <div className="text-zinc-400">Tooling</div>
                <div className="font-medium text-zinc-100">
                  ${(simulationResults.cost.tooling.total_tooling_cost / 1000).toFixed(1)}k
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
        
        {/* Show DFM issues from simulation */}
        {simulationResults.dfm?.issues.map((issue, i) => (
          <div key={`dfm-issue-${i}`} className={`border rounded-lg overflow-hidden ${issueBgColors.error}`}>
            <div className="flex items-start gap-3 p-3">
              {issueIcons.error}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-zinc-400 mb-0.5 capitalize">{issue.severity}</div>
                <div className="text-sm font-medium">{issue.type.replace('_', ' ')}</div>
                <div className="text-xs text-zinc-400 mt-1">{issue.message}</div>
              </div>
            </div>
          </div>
        ))}
        
        {simulationResults.dfm?.warnings.map((warning, i) => (
          <div key={`dfm-warn-${i}`} className={`border rounded-lg overflow-hidden ${issueBgColors.warning}`}>
            <div className="flex items-start gap-3 p-3">
              {issueIcons.warning}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-zinc-400 mb-0.5 capitalize">{warning.severity}</div>
                <div className="text-sm font-medium">{warning.type.replace('_', ' ')}</div>
                <div className="text-xs text-zinc-400 mt-1">{warning.message}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-zinc-800 space-y-2">
        <button 
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
