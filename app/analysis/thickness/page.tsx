'use client'

import { useEffect, useState } from 'react'
import { Layers3, Loader2, ThermometerSun, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import {
  AnalysisPageLayout,
  Section,
  StatBlock,
} from '@/components/analysis/AnalysisPageLayout'
import { useAppStore } from '@/store/useAppStore'
import {
  calculateCooling,
  calculateFilling,
  type CoolingResponse,
  type FillingResponse,
} from '@/lib/moldsim-api'

// Engine returns flow_ratio = flowLength / maxFlowLength (dimensionless,
// ~0–1+). It marks the part is_fillable when ratio < 0.8 (SAFETY_FACTOR in
// lib/moldsim/filling.ts). Anything above 1 means the cavity physically
// can't fill from a single gate with the material's flow capability.
const FILL_SAFETY_THRESHOLD = 0.8

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

  if (isLoading && (!coolingData || !fillingData)) {
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
  const hasFlowIssues = !fillingData.is_fillable || fillingData.flow_ratio > FILL_SAFETY_THRESHOLD
  const hasCoolingRecs = coolingData.recommendations.length > 0
  const flowUtilizationPct = fillingData.flow_ratio * 100

  let overallStatus: { label: string; tone: 'good' | 'warn' | 'bad' }
  if (hasThicknessIssues || hasFlowIssues) overallStatus = { label: 'Warning', tone: 'warn' }
  else if (hasCoolingRecs) overallStatus = { label: 'Attention', tone: 'warn' }
  else overallStatus = { label: 'Good', tone: 'good' }

  // Mirror the breakdown used inside lib/moldsim/cooling.ts so the
  // numbers shown here reconcile with the engine's cycle_time exactly.
  // (cooling.ts: fill 2.0s, pack = cooling*0.3, openClose 3.0s, eject 1.5s.)
  const fillTime = 2.0
  const packTime = coolingData.cooling_time * 0.3
  const coolingPortion = coolingData.cooling_time
  const cyclesPerHour = coolingData.cycle_time > 0 ? 3600 / coolingData.cycle_time : 0

  return (
    <AnalysisPageLayout
      title="Thickness Analysis"
      subtitle="Analyze wall thickness impact on fill behavior, cooling time, and cycle time. Wall thickness should usually stay between 2.0 mm and 3.5 mm for most materials."
      icon={Layers3}
      accent="sky"
      isRefetching={isLoading}
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
          value={`${coolingData.cooling_time.toFixed(1)}s`}
          hint="Time for center to reach ejection temp"
        />
        <StatBlock
          label="Flow utilization"
          value={`${flowUtilizationPct.toFixed(0)}%`}
          hint={`Safe-fill threshold: ${(FILL_SAFETY_THRESHOLD * 100).toFixed(0)}%`}
          tone={hasFlowIssues ? 'bad' : undefined}
        />
        <StatBlock label="Status" value={overallStatus.label} tone={overallStatus.tone} />
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
              <div className="text-lg font-medium text-zinc-100">{fillTime.toFixed(2)}s</div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                <Clock className="size-3" />
                Packing time
              </div>
              <div className="text-lg font-medium text-zinc-100">{packTime.toFixed(1)}s</div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                <ThermometerSun className="size-3" />
                Cooling time
              </div>
              <div className="text-lg font-medium text-zinc-100">{coolingPortion.toFixed(1)}s</div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50 border border-sky-500/30">
              <div className="flex items-center gap-2 text-xs text-sky-400 mb-1">
                <Clock className="size-3" />
                Total cycle
              </div>
              <div className="text-lg font-medium text-sky-300">
                {coolingData.cycle_time.toFixed(1)}s
              </div>
            </div>
          </div>

          <div className="text-sm text-zinc-400">
            <span className="text-zinc-200">{cyclesPerHour.toFixed(0)}</span> cycles/hour
            achievable with current parameters
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
                {(fillingData.estimated_fill_time * 1000).toFixed(0)} ms
              </div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <div className="text-xs text-zinc-500 mb-1">Recommended pressure</div>
              <div className="text-lg font-medium text-zinc-100">
                {fillingData.recommended_pressure.toFixed(1)} MPa
              </div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <div className="text-xs text-zinc-500 mb-1">Average viscosity</div>
              <div className="text-lg font-medium text-zinc-100">
                {fillingData.average_viscosity.toFixed(0)} Pa·s
              </div>
            </div>
          </div>

          {fillingData.recommendations.length > 0 && (
            <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/30">
              <div className="text-xs text-sky-400 mb-2">Flow recommendations</div>
              <ul className="text-sm text-zinc-300 space-y-1">
                {fillingData.recommendations.map((rec) => (
                  <li key={rec} className="flex items-start gap-2">
                    <span className="text-sky-400 mt-0.5">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Section>

      {(hasFlowIssues || hasCoolingRecs) && (
        <Section title="Issues detected" description="Problems that may affect part quality">
          <ul className="space-y-2">
            {hasFlowIssues && (
              <li className="flex items-start gap-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30">
                <AlertTriangle className="size-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-rose-300">Flow length near material limit</div>
                  <div className="text-sm text-zinc-400">
                    Flow utilization at {flowUtilizationPct.toFixed(0)}% exceeds the{' '}
                    {(FILL_SAFETY_THRESHOLD * 100).toFixed(0)}% safe-fill threshold for{' '}
                    {coolingData.material}. Add a second gate or thicken walls.
                  </div>
                </div>
              </li>
            )}
            {coolingData.recommendations.map((rec) => (
              <li
                key={rec}
                className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30"
              >
                <AlertTriangle className="size-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm text-zinc-300">{rec}</div>
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
            ['Melt temperature', `${coolingData.melt_temp.toFixed(0)} °C`],
            ['Mold temperature', `${coolingData.mold_temp.toFixed(0)} °C`],
            ['Ejection temperature', `${coolingData.ejection_temp.toFixed(0)} °C`],
            ['Thermal diffusivity', `${coolingData.thermal_diffusivity.toExponential(2)} m²/s`],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <dt className="text-zinc-500">{label}</dt>
              <dd className="text-zinc-200">{value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {!hasFlowIssues && !hasCoolingRecs && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <CheckCircle2 className="size-6 text-emerald-400" />
          <div>
            <div className="font-medium text-emerald-300">Wall thickness analysis passed</div>
            <div className="text-sm text-zinc-400">
              Current wall thickness of {simulationParams.wallThickness}mm is within recommended
              range for {coolingData.material}.
            </div>
          </div>
        </div>
      )}
    </AnalysisPageLayout>
  )
}
