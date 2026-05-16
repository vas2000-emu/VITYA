'use client'

import { useEffect, useState } from 'react'
import { Box, Loader2, CheckCircle2, AlertTriangle, XCircle, DollarSign, Clock } from 'lucide-react'
import {
  AnalysisPageLayout,
  Section,
  StatBlock,
} from '@/components/analysis/AnalysisPageLayout'
import { useAppStore } from '@/store/useAppStore'
import moldSimApi, { type ManufacturingCheckResponse, type CostResponse } from '@/lib/moldsim-api'

export default function UndercutAnalysisPage() {
  const { simulationParams, setSimulationResults } = useAppStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dfmData, setDfmData] = useState<ManufacturingCheckResponse | null>(null)
  const [costData, setCostData] = useState<CostResponse | null>(null)

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      setError(null)
      
      try {
        const [dfm, cost] = await Promise.all([
          moldSimApi.checkManufacturability({
            wall_thickness_mm: simulationParams.wallThickness,
            min_draft_angle_deg: simulationParams.minDraftAngle,
            num_undercuts: simulationParams.numUndercuts,
            rib_thickness_ratio: 0.6,
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
        ])
        
        setDfmData(dfm)
        setCostData(cost)
        setSimulationResults({ dfm, cost })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch analysis data'
        setError(message)
        setSimulationResults({ error: message })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [simulationParams, setSimulationResults])

  // Filter for undercut-specific issues
  const undercutIssues = dfmData?.issues.filter(i => i.type === 'undercuts') || []
  const undercutWarnings = dfmData?.warnings.filter(w => w.type === 'undercuts') || []

  const hasUndercuts = simulationParams.numUndercuts > 0
  const undercutCost = costData?.tooling.undercut_cost || 0

  if (isLoading) {
    return (
      <AnalysisPageLayout
        title="Undercut Analysis"
        subtitle="Analyzing undercuts and tooling requirements..."
        icon={Box}
        accent="rose"
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          <span className="ml-3 text-zinc-400">Checking for undercuts and side actions...</span>
        </div>
      </AnalysisPageLayout>
    )
  }

  if (error || !dfmData) {
    return (
      <AnalysisPageLayout
        title="Undercut Analysis"
        subtitle="Undercut detection and tooling analysis"
        icon={Box}
        accent="rose"
      >
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4">
          <p className="text-rose-300">
            {error || 'Unable to complete undercut analysis. Please check your parameters.'}
          </p>
        </div>
      </AnalysisPageLayout>
    )
  }

  const getUndercutStatus = () => {
    if (simulationParams.numUndercuts === 0) return { status: 'None', tone: 'good' as const }
    if (simulationParams.numUndercuts > 4) return { status: 'Complex', tone: 'bad' as const }
    if (simulationParams.numUndercuts > 2) return { status: 'Multiple', tone: 'warn' as const }
    return { status: 'Present', tone: 'warn' as const }
  }
  const status = getUndercutStatus()

  return (
    <AnalysisPageLayout
      title="Undercut Analysis"
      subtitle="Find geometry that would trap a single-pull mold and require side actions, lifters, or tooling complications that drive up cost and lead time."
      icon={Box}
      accent="rose"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatBlock
          label="Undercuts detected"
          value={String(simulationParams.numUndercuts)}
          hint={hasUndercuts ? 'Side actions required' : 'No side actions needed'}
          tone={status.tone}
        />
        <StatBlock
          label="Tooling impact"
          value={hasUndercuts ? `+$${undercutCost.toLocaleString()}` : '$0'}
          hint="Cost of side actions"
          tone={undercutCost > 5000 ? 'bad' : undercutCost > 0 ? 'warn' : 'good'}
        />
        <StatBlock
          label="DFM Score"
          value={`${dfmData.dfm_score}/100`}
          hint={dfmData.overall_assessment}
          tone={dfmData.dfm_score < 50 ? 'bad' : dfmData.dfm_score < 70 ? 'warn' : 'good'}
        />
        <StatBlock
          label="Status"
          value={status.status}
          tone={status.tone}
        />
      </div>

      {hasUndercuts && (
        <Section
          title="Undercut impact"
          description="How undercuts affect your tooling and production"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-3 p-4 rounded-lg bg-rose-500/10 border border-rose-500/30">
              <DollarSign className="size-6 text-rose-400 shrink-0" />
              <div>
                <h4 className="font-medium text-rose-300">Cost impact</h4>
                <p className="text-sm text-zinc-400 mt-1">
                  Each undercut requires a side action mechanism adding approximately $3,000-5,000 to tooling costs. 
                  Current estimate: <span className="text-rose-300 font-medium">${undercutCost.toLocaleString()}</span>
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <Clock className="size-6 text-amber-400 shrink-0" />
              <div>
                <h4 className="font-medium text-amber-300">Lead time impact</h4>
                <p className="text-sm text-zinc-400 mt-1">
                  Side actions add 1-2 weeks to tool build time. More complex mechanisms may add additional time for testing and tuning.
                </p>
              </div>
            </div>
          </div>
        </Section>
      )}

      {(undercutIssues.length > 0 || undercutWarnings.length > 0) && (
        <Section
          title="Issues detected"
          description="Undercut-related manufacturing concerns"
        >
          <ul className="space-y-2">
            {undercutIssues.map((issue, i) => (
              <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30">
                <XCircle className="size-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-rose-300 capitalize">{issue.severity}</div>
                  <div className="text-sm text-zinc-300">{issue.message}</div>
                </div>
              </li>
            ))}
            {undercutWarnings.map((warning, i) => (
              <li key={`warn-${i}`} className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <AlertTriangle className="size-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm text-zinc-300">{warning.message}</div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section
        title="Undercut solutions"
        description="Ways to handle or eliminate undercuts"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-zinc-800/50">
            <h4 className="font-medium text-zinc-100 mb-2">Design modifications</h4>
            <ul className="text-sm text-zinc-300 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">1.</span>
                <span><strong>Redesign the feature</strong> - Can the undercut be converted to a snap-fit, living hinge, or pass-through hole?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">2.</span>
                <span><strong>Change parting line</strong> - Moving the parting line may allow the feature to release in the pull direction.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">3.</span>
                <span><strong>Split the part</strong> - For complex undercuts, consider making two parts that snap or bond together.</span>
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-zinc-800/50">
            <h4 className="font-medium text-zinc-100 mb-2">Tooling solutions</h4>
            <ul className="text-sm text-zinc-300 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-sky-400 mt-0.5">•</span>
                <span><strong>Side actions/slides</strong> - Mechanical cams that move laterally during ejection. Best for external undercuts.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-400 mt-0.5">•</span>
                <span><strong>Lifters</strong> - Angled pins that move in two directions simultaneously. Good for internal undercuts.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-400 mt-0.5">•</span>
                <span><strong>Collapsing cores</strong> - For internal threads or complex internal features. Most expensive option.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-400 mt-0.5">•</span>
                <span><strong>Bump-offs</strong> - For shallow, flexible undercuts that can flex over a mold feature. Material dependent.</span>
              </li>
            </ul>
          </div>
        </div>
      </Section>

      {!hasUndercuts && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <CheckCircle2 className="size-6 text-emerald-400" />
          <div>
            <div className="font-medium text-emerald-300">No undercuts detected</div>
            <div className="text-sm text-zinc-400">
              Part geometry allows for a simple straight-pull mold without side actions, reducing tooling cost and complexity.
            </div>
          </div>
        </div>
      )}
    </AnalysisPageLayout>
  )
}
