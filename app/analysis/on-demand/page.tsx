'use client'

import { useEffect, useState } from 'react'
import { Factory, MapPin, Clock, Phone, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import {
  AnalysisPageLayout,
  Section,
  StatBlock,
} from '@/components/analysis/AnalysisPageLayout'
import { useAppStore } from '@/store/useAppStore'
import moldSimApi, { type ManufacturingCheckResponse, type CostResponse } from '@/lib/moldsim-api'

const SHOPS = [
  {
    name: 'Great Lakes Plastics',
    location: 'Grand Rapids, MI',
    capability: 'Single-cavity prototype + bridge tooling',
    leadTime: '4-5 weeks',
    notes: 'Strong on small-to-medium snap-fit parts. Comfortable with side actions.',
    minScore: 60,
  },
  {
    name: 'Detroit Mold & Tool',
    location: 'Sterling Heights, MI',
    capability: 'Production tooling, multi-cavity',
    leadTime: '8-10 weeks',
    notes: 'Best fit once volumes pass 25k pieces and the geometry is fixed.',
    minScore: 70,
  },
  {
    name: 'Lakeshore IM',
    location: 'Holland, MI',
    capability: 'Engineering grade resins, glass-filled',
    leadTime: '5-6 weeks',
    notes: 'Pick this shop if the bracket switches to glass-filled nylon later.',
    minScore: 65,
  },
  {
    name: 'Midwest Precision Molding',
    location: 'Kalamazoo, MI',
    capability: 'Low-volume production, rapid prototyping',
    leadTime: '3-4 weeks',
    notes: 'Great for fast turnaround on simpler geometries. Limited side-action capability.',
    minScore: 75,
  },
]

export default function OnDemandManufacturingPage() {
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
        const message = err instanceof Error ? err.message : 'Failed to fetch data'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [simulationParams, setSimulationResults])

  if (isLoading) {
    return (
      <AnalysisPageLayout
        title="On Demand Manufacturing"
        subtitle="Checking quote readiness for Michigan-area injection molders..."
        icon={Factory}
        accent="violet"
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          <span className="ml-3 text-zinc-400">Analyzing manufacturing readiness...</span>
        </div>
      </AnalysisPageLayout>
    )
  }

  if (error || !dfmData) {
    return (
      <AnalysisPageLayout
        title="On Demand Manufacturing"
        subtitle="Quote readiness for Michigan-area injection molders"
        icon={Factory}
        accent="violet"
      >
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4">
          <p className="text-rose-300">
            {error || 'Unable to analyze manufacturing readiness. Please check your parameters.'}
          </p>
        </div>
      </AnalysisPageLayout>
    )
  }

  const dfmScore = dfmData.dfm_score
  const getReadinessStatus = () => {
    if (dfmScore >= 80) return { status: 'Ready for quotes', tone: 'good' as const }
    if (dfmScore >= 60) return { status: 'Needs improvement', tone: 'warn' as const }
    return { status: 'Not quote-ready', tone: 'bad' as const }
  }
  const readiness = getReadinessStatus()

  // Filter shops based on DFM score
  const eligibleShops = SHOPS.filter(shop => dfmScore >= shop.minScore)
  const bestLeadTime = eligibleShops.length > 0 
    ? eligibleShops.reduce((best, shop) => {
        const weeks = parseInt(shop.leadTime.split('-')[0])
        const bestWeeks = parseInt(best.leadTime.split('-')[0])
        return weeks < bestWeeks ? shop : best
      })
    : null

  // Generate action items based on DFM results
  const actionItems = [
    ...dfmData.issues.map(issue => ({
      severity: 'critical' as const,
      text: issue.message,
    })),
    ...dfmData.warnings.map(warning => ({
      severity: 'warning' as const,
      text: warning.message,
    })),
    {
      severity: 'info' as const,
      text: `Confirm material (${simulationParams.material}) and surface finish requirements with the shop.`,
    },
  ]

  return (
    <AnalysisPageLayout
      title="On Demand Manufacturing"
      subtitle="Quote-readiness for Michigan-area injection molders. Once the design fixes land, these shops can take the file and turn around tooling without an in-person DFM review."
      icon={Factory}
      accent="violet"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatBlock
          label="Readiness"
          value={readiness.status}
          hint={dfmData.overall_assessment}
          tone={readiness.tone}
        />
        <StatBlock
          label="DFM Score"
          value={`${dfmScore}/100`}
          hint="Michigan molder compatibility"
          tone={dfmScore >= 70 ? 'good' : dfmScore >= 50 ? 'warn' : 'bad'}
        />
        <StatBlock
          label="Eligible shops"
          value={String(eligibleShops.length)}
          hint={`Of ${SHOPS.length} in 150mi range`}
          tone={eligibleShops.length >= 3 ? 'good' : eligibleShops.length > 0 ? 'warn' : 'bad'}
        />
        <StatBlock
          label="Best lead time"
          value={bestLeadTime ? bestLeadTime.leadTime.split('-')[0] + ' wk' : 'N/A'}
          hint={bestLeadTime ? bestLeadTime.name : 'No eligible shops'}
          tone={bestLeadTime ? 'good' : 'bad'}
        />
      </div>

      {costData && (
        <Section
          title="Quote estimate"
          description="Based on MoldSim cost analysis"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <div className="text-xs text-zinc-500 mb-1">Tooling</div>
              <div className="text-lg font-medium text-zinc-100">
                ${(costData.tooling.total_tooling_cost / 1000).toFixed(1)}k
              </div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <div className="text-xs text-zinc-500 mb-1">Per part ({costData.production_quantity.toLocaleString()} pcs)</div>
              <div className="text-lg font-medium text-zinc-100">
                ${costData.total_cost_per_part.toFixed(2)}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <div className="text-xs text-zinc-500 mb-1">Total project</div>
              <div className="text-lg font-medium text-zinc-100">
                ${(costData.total_project_cost / 1000).toFixed(1)}k
              </div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <div className="text-xs text-zinc-500 mb-1">Parts/hour</div>
              <div className="text-lg font-medium text-zinc-100">
                {costData.per_part.parts_per_hour.toFixed(0)}
              </div>
            </div>
          </div>
        </Section>
      )}

      <Section
        title="Candidate shops"
        description={`${eligibleShops.length > 0 ? 'Shops compatible with your current design' : 'Improve DFM score to unlock shops'}`}
      >
        <ul className="divide-y divide-zinc-800 -mx-5 -my-5">
          {SHOPS.map((shop) => {
            const isEligible = dfmScore >= shop.minScore
            return (
              <li
                key={shop.name}
                className={`px-5 py-4 flex items-start gap-4 ${!isEligible ? 'opacity-50' : ''}`}
              >
                <span className={`shrink-0 size-9 rounded-md border flex items-center justify-center ${
                  isEligible 
                    ? 'border-violet-500/40 bg-violet-500/10 text-violet-300'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-500'
                }`}>
                  <Factory className="size-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-medium text-zinc-100 flex items-center gap-2">
                      {shop.name}
                      {isEligible ? (
                        <CheckCircle2 className="size-4 text-emerald-400" />
                      ) : (
                        <span className="text-xs text-zinc-500">(requires {shop.minScore}+ DFM)</span>
                      )}
                    </h3>
                    <span className="text-xs text-zinc-500 inline-flex items-center gap-1">
                      <MapPin className="size-3" />
                      {shop.location}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    {shop.capability}
                  </div>
                  <div className="text-xs text-zinc-500 mt-2 leading-relaxed">
                    {shop.notes}
                  </div>
                </div>
                <span className="shrink-0 text-xs text-zinc-300 inline-flex items-center gap-1">
                  <Clock className="size-3.5 text-zinc-500" />
                  {shop.leadTime}
                </span>
              </li>
            )
          })}
        </ul>
      </Section>

      {actionItems.length > 0 && (
        <Section
          title="What needs to happen before quoting"
          description="Items the shop will flag during their own DFM review"
        >
          <ul className="space-y-2 text-sm text-zinc-200">
            {actionItems.map((item, i) => (
              <li key={i} className="flex gap-3">
                <span className={`size-1.5 rounded-full mt-2 shrink-0 ${
                  item.severity === 'critical' ? 'bg-rose-400' :
                  item.severity === 'warning' ? 'bg-amber-400' : 'bg-emerald-400'
                }`} />
                {item.text}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Next step">
        <div className="flex items-center gap-3 text-sm text-zinc-300">
          <span className="size-8 rounded-md border border-zinc-700 bg-zinc-800 flex items-center justify-center">
            <Phone className="size-4 text-blue-300" />
          </span>
          <div>
            {dfmScore >= 70 ? (
              <>Your design is ready for quotes. Contact any of the eligible shops above to request tooling quotes.</>
            ) : (
              <>Apply the recommended design fixes to reach a DFM score of 70+, then request quotes from the candidate shops above.</>
            )}
          </div>
        </div>
      </Section>
    </AnalysisPageLayout>
  )
}
