'use client'

import { useEffect, useState } from 'react'
import { Layers3, Loader2, ThermometerSun, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import {
  AnalysisPageLayout,
  Section,
  StatBlock,
} from '@/components/analysis/AnalysisPageLayout'
import { useAppStore } from '@/store/useAppStore'
import moldSimApi, { type CoolingResponse, type FillingResponse } from '@/lib/moldsim-api'

export default function ThicknessAnalysisPage() {
  const { simulationParams, setSimulationResults } = useAppStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [coolingData, setCoolingData] = useState<CoolingResponse | null>(null)
  const [fillingData, setFillingData] = useState<FillingResponse | null>(null)

  useEffect(() => {
    async function fetchAnalysisData() {
      setIsLoading(true)
      setError(null)
      
      try {
        const [cooling, filling] = await Promise.all([
          moldSimApi.analyzeCooling({
            wall_thickness_mm: simulationParams.wallThickness,
            melt_temp_c: simulationParams.meltTemp,
            mold_temp_c: simulationParams.moldTemp,
            part_volume_cm3: simulationParams.partVolume,
            material: simulationParams.material,
            injection_speed: 'medium',
          }),
          moldSimApi.analyzeFilling({
            part_length_mm: simulationParams.partLength,
            wall_thickness_mm: simulationParams.wallThickness,
            part_width_mm: simulationParams.partWidth,
            injection_pressure_mpa: 80,
            melt_temp_c: simulationParams.meltTemp,
            mold_temp_c: simulationParams.moldTemp,
            material: simulationParams.material,
          }),
        ])
        
        setCoolingData(cooling)
        setFillingData(filling)
        setSimulationResults({ cooling, filling })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch analysis data'
        setError(message)
        setSimulationResults({ error: message })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchAnalysisData()
  }, [simulationParams, setSimulationResults])

  if (isLoading) {
    return (
      <AnalysisPageLayout
        title="Thickness Analysis"
        subtitle="Running thermal and flow simulations..."
        icon={Layers3}
        accent="sky"
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
          <span className="ml-3 text-zinc-400">Analyzing wall thickness effects...</span>
        </div>
      </AnalysisPageLayout>
    )
  }

  if (error || !coolingData || !fillingData) {
    return (
      <AnalysisPageLayout
        title="Thickness Analysis"
        subtitle="Wall thickness analysis for injection molding"
        icon={Layers3}
        accent="sky"
      >
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4">
          <p className="text-rose-300">
            {error || 'Unable to complete analysis. Please check your parameters.'}
          </p>
        </div>
      </AnalysisPageLayout>
    )
  }

  const hasThicknessIssues = simulationParams.wallThickness < 1.0 || simulationParams.wallThickness > 5.0
  const hasFlowIssues = fillingData.issues.length > 0
  const hasTempWarnings = coolingData.warnings.length > 0

  // Determine overall status
  const getOverallStatus = () => {
    if (hasThicknessIssues || hasFlowIssues) return { status: 'warning', tone: 'warn' as const }
    if (hasTempWarnings) return { status: 'attention', tone: 'warn' as const }
    return { status: 'good', tone: 'good' as const }
  }
  const overallStatus = getOverallStatus()

  return (
    <AnalysisPageLayout
      title="Thickness Analysis"
      subtitle="Analyze wall thickness impact on fill behavior, cooling time, and cycle time. Wall thickness should usually stay between 2.0 mm and 3.5 mm for most materials."
      icon={Layers3}
      accent="sky"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatBlock
          label="Wall thickness"
          value={`${simulationParams.wallThickness} mm`}
          hint={hasThicknessIssues ? 'Outside recommended range' : 'Within recommended range'}
          tone={hasThicknessIssues ? 'warn' : 'good'}
        />
        <StatBlock
          label="Cooling time"
          value={`${coolingData.cooling_time_s.toFixed(1)}s`}
          hint="Time for center to reach ejection temp"
        />
        <StatBlock
          label="Flow ratio"
          value={`${fillingData.flow_length_ratio.toFixed(0)}:1`}
          hint={`Max recommended: ${fillingData.max_recommended_ratio}:1`}
          tone={fillingData.flow_length_ratio > fillingData.max_recommended_ratio ? 'bad' : undefined}
        />
        <StatBlock
          label="Status"
          value={overallStatus.status.charAt(0).toUpperCase() + overallStatus.status.slice(1)}
          tone={overallStatus.tone}
        />
      </div>

      <Section
        title="Cooling analysis"
        description="Heat transfer simulation based on MoldSim thermal models"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                <Clock className="size-3" />
                Fill time
              </div>
              <div className="text-lg font-medium text-zinc-100">
                {coolingData.cycle_time_breakdown.fill_time_s.toFixed(2)}s
              </div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                <Clock className="size-3" />
                Packing time
              </div>
              <div className="text-lg font-medium text-zinc-100">
                {coolingData.cycle_time_breakdown.packing_time_s.toFixed(1)}s
              </div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                <ThermometerSun className="size-3" />
                Cooling time
              </div>
              <div className="text-lg font-medium text-zinc-100">
                {coolingData.cycle_time_breakdown.cooling_time_s.toFixed(1)}s
              </div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50 border border-sky-500/30">
              <div className="flex items-center gap-2 text-xs text-sky-400 mb-1">
                <Clock className="size-3" />
                Total cycle
              </div>
              <div className="text-lg font-medium text-sky-300">
                {coolingData.cycle_time_breakdown.total_cycle_time_s.toFixed(1)}s
              </div>
            </div>
          </div>

          <div className="text-sm text-zinc-400">
            <span className="text-zinc-200">{coolingData.cycle_time_breakdown.cycles_per_hour.toFixed(0)}</span> cycles/hour achievable with current parameters
          </div>
        </div>
      </Section>

      <Section
        title="Flow analysis"
        description="Filling behavior based on Cross-WLF viscosity model"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <div className="text-xs text-zinc-500 mb-1">Estimated fill time</div>
              <div className="text-lg font-medium text-zinc-100">
                {(fillingData.fill_time_s * 1000).toFixed(0)} ms
              </div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <div className="text-xs text-zinc-500 mb-1">Pressure drop</div>
              <div className="text-lg font-medium text-zinc-100">
                {fillingData.estimated_pressure_drop_mpa.toFixed(1)} MPa
              </div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <div className="text-xs text-zinc-500 mb-1">Viscosity at conditions</div>
              <div className="text-lg font-medium text-zinc-100">
                {fillingData.viscosity_at_conditions_pa_s.toFixed(0)} Pa·s
              </div>
            </div>
          </div>

          {fillingData.gate_recommendations.length > 0 && (
            <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/30">
              <div className="text-xs text-sky-400 mb-2">Gate recommendations</div>
              <ul className="text-sm text-zinc-300 space-y-1">
                {fillingData.gate_recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-sky-400 mt-0.5">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Section>

      {(hasFlowIssues || hasTempWarnings) && (
        <Section
          title="Issues detected"
          description="Problems that may affect part quality"
        >
          <ul className="space-y-2">
            {fillingData.issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30">
                <AlertTriangle className="size-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-rose-300">{issue.type}</div>
                  <div className="text-sm text-zinc-400">{issue.message}</div>
                </div>
              </li>
            ))}
            {coolingData.warnings.map((warning, i) => (
              <li key={`warn-${i}`} className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <AlertTriangle className="size-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm text-zinc-300">{warning}</div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section
        title="Recommended parameters"
        description={`Processing guidelines for ${coolingData.material}`}
      >
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {[
            ['Melt temperature range', `${coolingData.recommended_parameters.melt_temperature_range_c[0]}°C - ${coolingData.recommended_parameters.melt_temperature_range_c[1]}°C`],
            ['Mold temperature range', `${coolingData.recommended_parameters.mold_temperature_range_c[0]}°C - ${coolingData.recommended_parameters.mold_temperature_range_c[1]}°C`],
            ['Ejection temperature', `${coolingData.recommended_parameters.ejection_temperature_c}°C`],
            ['Thermal conductivity', `${coolingData.recommended_parameters.thermal_conductivity_w_mk} W/(m·K)`],
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

      {!hasFlowIssues && !hasTempWarnings && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <CheckCircle2 className="size-6 text-emerald-400" />
          <div>
            <div className="font-medium text-emerald-300">Wall thickness analysis passed</div>
            <div className="text-sm text-zinc-400">
              Current wall thickness of {simulationParams.wallThickness}mm is within recommended range for {coolingData.material}.
            </div>
          </div>
        </div>
      )}
    </AnalysisPageLayout>
  )
}
