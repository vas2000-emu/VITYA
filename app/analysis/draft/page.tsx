'use client'

import { useEffect, useState } from 'react'
import { Triangle, Loader2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import {
  AnalysisPageLayout,
  Section,
  StatBlock,
} from '@/components/analysis/AnalysisPageLayout'
import { useAppStore } from '@/store/useAppStore'
import {
  checkManufacturing,
  type ManufacturingCheckResponse,
} from '@/lib/moldsim-api'

export default function DraftAnalysisPage() {
  const { simulationParams, setSimulationResults } = useAppStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dfmData, setDfmData] = useState<ManufacturingCheckResponse | null>(null)

  useEffect(() => {
    async function fetchDfmData() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await checkManufacturing({
          wall_thickness: simulationParams.wallThickness,
          min_draft_angle: simulationParams.minDraftAngle,
          num_undercuts: simulationParams.numUndercuts,
          material: simulationParams.material,
          has_sharp_corners: simulationParams.hasSharpCorners,
          has_uniform_wall: simulationParams.hasUniformWall,
          part_length: simulationParams.partLength,
          part_width: simulationParams.partWidth,
          part_height: simulationParams.partHeight,
        })

        setDfmData(response)
        setSimulationResults({ dfm: response })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch DFM data'
        setError(message)
        setSimulationResults({ error: message })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDfmData()
  }, [simulationParams, setSimulationResults])

  // Filter for draft-related issues by category (no `type` field on
  // the real API — we category-match on the human-readable category
  // string moldsim returns).
  const draftIssues =
    dfmData?.issues.filter((i) =>
      /draft|ejection/i.test(`${i.category} ${i.issue}`),
    ) ?? []
  const criticalDraft = draftIssues.filter((i) => i.severity === 'critical' || i.severity === 'warning')

  if (isLoading && !dfmData) {
    return (
      <AnalysisPageLayout
        title="Draft Analysis"
        subtitle="Checking draft angles..."
        icon={Triangle}
        accent="amber"
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <span className="ml-3 text-zinc-400">Analyzing draft angles for ejection...</span>
        </div>
      </AnalysisPageLayout>
    )
  }

  if (error || !dfmData) {
    return (
      <AnalysisPageLayout
        title="Draft Analysis"
        subtitle="Draft angle verification for mold ejection"
        icon={Triangle}
        accent="amber"
      >
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4">
          <p className="text-rose-300">
            {error || 'Unable to complete draft analysis. Please check your parameters.'}
          </p>
        </div>
      </AnalysisPageLayout>
    )
  }

  let status: { status: string; tone: 'good' | 'warn' | 'bad' }
  if (criticalDraft.some((i) => i.severity === 'critical')) status = { status: 'Critical', tone: 'bad' }
  else if (criticalDraft.length > 0) status = { status: 'Issues Found', tone: 'bad' }
  else if (draftIssues.length > 0) status = { status: 'Warnings', tone: 'warn' }
  else status = { status: 'Adequate', tone: 'good' }

  return (
    <AnalysisPageLayout
      title="Draft Analysis"
      subtitle="Check that vertical faces are tapered enough for the part to release cleanly from the mold cavity. Most Michigan molders look for at least 1-3 degrees of draft on shut-off surfaces."
      icon={Triangle}
      accent="amber"
      isRefetching={isLoading}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatBlock
          label="Minimum draft"
          value={`${simulationParams.minDraftAngle}°`}
          hint={simulationParams.minDraftAngle < 1 ? 'Below minimum' : 'Measured draft angle'}
          tone={simulationParams.minDraftAngle < 1 ? 'bad' : simulationParams.minDraftAngle < 2 ? 'warn' : 'good'}
        />
        <StatBlock label="Recommended" value="1-3°" hint="Michigan molder standards" />
        <StatBlock
          label="DFM Score"
          value={`${dfmData.overall_score}/100`}
          hint={dfmData.summary}
          tone={dfmData.overall_score < 50 ? 'bad' : dfmData.overall_score < 70 ? 'warn' : 'good'}
        />
        <StatBlock label="Draft status" value={status.status} tone={status.tone} />
      </div>

      <Section
        title="Draft angle guidelines"
        description="Recommended draft angles by feature type"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-zinc-800/50">
            <h4 className="font-medium text-zinc-100 mb-3">Standard surfaces</h4>
            <dl className="space-y-2 text-sm">
              {[
                ['Smooth/polished', '0.5° - 1°'],
                ['Textured (light)', '1° - 2°'],
                ['Textured (medium)', '2° - 3°'],
                ['Textured (heavy)', '3° - 5°'],
              ].map(([surface, angle]) => (
                <div key={surface} className="flex justify-between">
                  <dt className="text-zinc-400">{surface}</dt>
                  <dd className="text-zinc-200 tabular-nums">{angle}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="p-4 rounded-lg bg-zinc-800/50">
            <h4 className="font-medium text-zinc-100 mb-3">Special features</h4>
            <dl className="space-y-2 text-sm">
              {[
                ['Ribs', '0.5° - 1° (per side)'],
                ['Bosses (outer)', '0.5° - 1°'],
                ['Bosses (inner)', '1° - 2°'],
                ['Deep cores', '2° - 3°'],
              ].map(([feature, angle]) => (
                <div key={feature} className="flex justify-between">
                  <dt className="text-zinc-400">{feature}</dt>
                  <dd className="text-zinc-200 tabular-nums">{angle}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Section>

      {draftIssues.length > 0 ? (
        <Section
          title="Draft issues detected"
          description="Problems that may cause ejection difficulties"
        >
          <ul className="space-y-2">
            {draftIssues.map((issue) => {
              const isCritical = issue.severity === 'critical' || issue.severity === 'warning'
              return (
                <li
                  key={`${issue.category}-${issue.issue}`}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    isCritical
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : 'bg-amber-500/10 border-amber-500/30'
                  }`}
                >
                  {isCritical ? (
                    <XCircle className="size-5 text-rose-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="size-5 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="text-sm font-medium text-zinc-200 capitalize">
                      {issue.category}
                    </div>
                    <div className="text-sm text-zinc-300">{issue.issue}</div>
                    <div className="text-xs text-zinc-500 mt-1">{issue.recommendation}</div>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <h4 className="font-medium text-amber-300 mb-2">Recommended fix</h4>
            <p className="text-sm text-zinc-300">
              Increase the draft angle on affected faces to at least 1° for smooth surfaces or
              2-3° for textured surfaces. This will allow the part to release cleanly from the
              mold without scuffing or sticking.
            </p>
          </div>
        </Section>
      ) : (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <CheckCircle2 className="size-6 text-emerald-400" />
          <div>
            <div className="font-medium text-emerald-300">Draft angles adequate</div>
            <div className="text-sm text-zinc-400">
              Current minimum draft of {simulationParams.minDraftAngle}° meets Michigan molder
              standards for clean ejection.
            </div>
          </div>
        </div>
      )}

      <Section title="Why draft matters" description="Impact on manufacturing and part quality">
        <ul className="text-zinc-300 space-y-2 text-sm">
          <li>
            <strong className="text-zinc-100">Ejection forces:</strong> Insufficient draft
            increases friction during ejection, potentially damaging the part surface or causing
            ejector pin marks.
          </li>
          <li>
            <strong className="text-zinc-100">Tool wear:</strong> Parts that stick require more
            force to eject, accelerating mold wear and reducing tool life.
          </li>
          <li>
            <strong className="text-zinc-100">Cycle time:</strong> Extra cooling time may be
            needed for parts with minimal draft to prevent deformation during ejection.
          </li>
          <li>
            <strong className="text-zinc-100">Surface quality:</strong> Dragging against the
            mold surface causes scratches and marks that affect cosmetic appearance.
          </li>
        </ul>
      </Section>
    </AnalysisPageLayout>
  )
}
