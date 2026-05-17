'use client'

import { useEffect, useState } from 'react'
import { DollarSign, TrendingUp, TrendingDown, Loader2 } from 'lucide-react'
import {
  AnalysisPageLayout,
  Section,
  StatBlock,
} from '@/components/analysis/AnalysisPageLayout'
import { useAppStore } from '@/store/useAppStore'
import moldSimApi, { type CostResponse } from '@/lib/moldsim-api'

interface CostDriver {
  label: string
  delta: string
  detail: string
  direction: 'up' | 'down'
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatCurrencyDecimal(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function getCostDrivers(costData: CostResponse, numUndercuts: number, complexity: string): CostDriver[] {
  const drivers: CostDriver[] = []
  
  if (numUndercuts > 0) {
    drivers.push({
      label: 'Side actions for undercuts',
      delta: `+$${(numUndercuts * 3500).toLocaleString()} tooling`,
      detail: 'Undercuts require side-action cores for part ejection. Adds machining complexity.',
      direction: 'up',
    })
  }
  
  if (complexity !== 'simple') {
    const complexityMultipliers: Record<string, number> = {
      moderate: 0.5,
      complex: 1.2,
      very_complex: 2.5,
    }
    const adder = 15000 * (complexityMultipliers[complexity] || 0)
    if (adder > 0) {
      drivers.push({
        label: 'Mold complexity premium',
        delta: `+${formatCurrency(adder)} tooling`,
        detail: 'Part geometry requires additional machining and tuning.',
        direction: 'up',
      })
    }
  }
  
  if (costData.cost_breakdown.material_percentage > 25) {
    drivers.push({
      label: 'Material-intensive design',
      delta: `${costData.cost_breakdown.material_percentage.toFixed(0)}% of cost`,
      detail: 'Consider reducing wall thickness or using a less expensive material.',
      direction: 'up',
    })
  }
  
  if (costData.cycle_time > 30) {
    drivers.push({
      label: 'Extended cooling time',
      delta: `+${costData.cycle_time.toFixed(0)}s cycle`,
      detail: 'Wall thickness requires longer cooling before ejection. Reduces throughput.',
      direction: 'up',
    })
  }
  
  if (costData.parts_per_hour > 100) {
    drivers.push({
      label: 'High throughput potential',
      delta: `${costData.parts_per_hour} pcs/hr`,
      detail: 'Good cycle time enables efficient production.',
      direction: 'down',
    })
  }
  
  return drivers
}

function getCostRisk(costData: CostResponse, quantity: number): { value: string; tone: 'good' | 'warn' | 'bad' } {
  const toolingCost = costData.total_tooling_cost
  const breakEven = costData.breakeven_quantity
  
  if (quantity < breakEven * 0.5 && breakEven > 0) {
    return { value: 'High', tone: 'bad' }
  } else if (quantity < breakEven && breakEven > 0) {
    return { value: 'Medium', tone: 'warn' }
  } else if (toolingCost > 50000) {
    return { value: 'Medium', tone: 'warn' }
  }
  return { value: 'Low', tone: 'good' }
}

export default function CostingPage() {
  const { simulationParams, setSimulationResults } = useAppStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [costData, setCostData] = useState<CostResponse | null>(null)

  useEffect(() => {
    async function fetchCostData() {
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await moldSimApi.estimateCost({
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
        })
        
        setCostData(response)
        setSimulationResults({ cost: response })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch cost data'
        setError(message)
        setSimulationResults({ error: message })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchCostData()
  }, [simulationParams, setSimulationResults])

  if (isLoading && !costData) {
    return (
      <AnalysisPageLayout
        title="Costing"
        subtitle="Calculating cost estimates based on MoldSim physics models..."
        icon={DollarSign}
        accent="emerald"
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <span className="ml-3 text-zinc-400">Running cost simulation...</span>
        </div>
      </AnalysisPageLayout>
    )
  }

  if (error || !costData) {
    return (
      <AnalysisPageLayout
        title="Costing"
        subtitle="Cost estimation based on Michigan injection-molding norms"
        icon={DollarSign}
        accent="emerald"
      >
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4">
          <p className="text-rose-300">
            {error || 'Unable to calculate costs. Please check your parameters.'}
          </p>
        </div>
      </AnalysisPageLayout>
    )
  }

  const costDrivers = getCostDrivers(costData, simulationParams.numUndercuts, simulationParams.complexity)
  const riskAssessment = getCostRisk(costData, simulationParams.productionQuantity)
  const recommendation = costData.recommendations[0] || 'Cost structure looks reasonable for this volume.'

  return (
    <AnalysisPageLayout
      title="Costing"
      subtitle="Estimated tooling and per-part cost for this geometry, based on Michigan injection-molding norms and MoldSim physics models."
      icon={DollarSign}
      accent="emerald"
      isRefetching={isLoading}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatBlock
          label="Tooling investment"
          value={formatCurrency(costData.total_tooling_cost)}
          hint={`${simulationParams.numCavities}-cavity ${simulationParams.complexity} mold`}
          tone={costData.total_tooling_cost > 40000 ? 'warn' : undefined}
        />
        <StatBlock
          label="Per-part cost"
          value={formatCurrencyDecimal(costData.total_cost_per_part)}
          hint={`At ${simulationParams.productionQuantity.toLocaleString()} pieces, ${simulationParams.material}`}
        />
        <StatBlock
          label="Cost risk"
          value={riskAssessment.value}
          hint={recommendation}
          tone={riskAssessment.tone}
        />
      </div>

      <Section
        title="Cost breakdown"
        description="Per-part cost components"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-zinc-800/50">
            <div className="text-xs text-zinc-500 mb-1">Material</div>
            <div className="text-lg font-medium text-zinc-100">
              {formatCurrencyDecimal(costData.material_cost_per_part)}
            </div>
            <div className="text-xs text-zinc-600">{costData.cost_breakdown.material_percentage.toFixed(1)}%</div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-800/50">
            <div className="text-xs text-zinc-500 mb-1">Processing</div>
            <div className="text-lg font-medium text-zinc-100">
              {formatCurrencyDecimal(costData.processing_cost_per_part)}
            </div>
            <div className="text-xs text-zinc-600">{costData.cost_breakdown.processing_percentage.toFixed(1)}%</div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-800/50">
            <div className="text-xs text-zinc-500 mb-1">Labor + Overhead</div>
            <div className="text-lg font-medium text-zinc-100">
              {formatCurrencyDecimal(costData.labor_cost_per_part + costData.overhead_cost_per_part)}
            </div>
            <div className="text-xs text-zinc-600">{(costData.cost_breakdown.labor_percentage + costData.cost_breakdown.overhead_percentage).toFixed(1)}%</div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-800/50">
            <div className="text-xs text-zinc-500 mb-1">Tooling (amortized)</div>
            <div className="text-lg font-medium text-zinc-100">
              {formatCurrencyDecimal(costData.tooling_cost_per_part)}
            </div>
            <div className="text-xs text-zinc-600">{costData.cost_breakdown.tooling_percentage.toFixed(1)}%</div>
          </div>
        </div>
      </Section>

      {costDrivers.length > 0 && (
        <Section
          title="Cost drivers"
          description="What&apos;s pushing the quote up or down on this part"
        >
          <ul className="divide-y divide-zinc-800 -mx-5 -my-5">
            {costDrivers.map((d) => (
              <li
                key={d.label}
                className="flex items-start gap-3 px-5 py-3"
              >
                <span
                  className={`shrink-0 size-8 rounded-md border flex items-center justify-center ${
                    d.direction === 'up'
                      ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                      : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  }`}
                >
                  {d.direction === 'up' ? (
                    <TrendingUp className="size-4" />
                  ) : (
                    <TrendingDown className="size-4" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-zinc-100">{d.label}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{d.detail}</div>
                </div>
                <span
                  className={`shrink-0 text-sm tabular-nums ${
                    d.direction === 'up' ? 'text-rose-300' : 'text-emerald-300'
                  }`}
                >
                  {d.delta}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section
        title="Production metrics"
        description="Throughput and efficiency estimates from MoldSim"
      >
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {[
            ['Cycle time', `${costData.cycle_time.toFixed(1)} seconds`],
            ['Parts per hour', `${costData.parts_per_hour} pcs`],
            ['Machine rate', `${formatCurrency(costData.machine_hourly_rate)}/hr`],
            ['Break-even vs 3D printing', costData.breakeven_quantity > 0 ? `${costData.breakeven_quantity.toLocaleString()} pieces` : 'N/A'],
            ['Total tooling cost', formatCurrency(costData.total_tooling_cost)],
            ['Total project cost', formatCurrency(costData.total_tooling_cost + (costData.total_cost_per_part * simulationParams.productionQuantity))],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between border-b border-zinc-800 pb-2"
            >
              <dt className="text-zinc-500">{label}</dt>
              <dd className="text-zinc-200">{value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {costData.recommendations.length > 0 && (
        <Section
          title="Recommendations"
          description="Cost optimization suggestions"
        >
          <ul className="space-y-2">
            {costData.recommendations.map((rec, i) => (
              <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                <span className="text-emerald-400 mt-1">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section
        title="Assumptions"
        description="Input parameters used for this analysis"
      >
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {[
            ['Material', `${simulationParams.material}`],
            ['Part volume', `${simulationParams.partVolume} cm³`],
            ['Part weight', `${simulationParams.partWeight} g`],
            ['Wall thickness', `${simulationParams.wallThickness} mm`],
            ['Run size', `${simulationParams.productionQuantity.toLocaleString()} pieces`],
            ['Cavities', `${simulationParams.numCavities}`],
            ['Complexity', simulationParams.complexity],
            ['Quoting region', 'Michigan, USA'],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between border-b border-zinc-800 pb-2"
            >
              <dt className="text-zinc-500">{label}</dt>
              <dd className="text-zinc-200">{value}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </AnalysisPageLayout>
  )
}
