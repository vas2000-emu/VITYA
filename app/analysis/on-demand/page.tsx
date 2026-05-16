'use client'

import { useEffect, useState } from 'react'
import { Factory, MapPin, Clock, Phone, Loader2, CheckCircle2 } from 'lucide-react'
import {
  AnalysisPageLayout,
  Section,
  StatBlock,
} from '@/components/analysis/AnalysisPageLayout'
import { useAppStore } from '@/store/useAppStore'
import {
  checkManufacturing,
  calculateCost,
  type ManufacturingCheckResponse,
  type CostResponse,
} from '@/lib/moldsim-api'
import { QuoteModal } from '@/components/analysis/QuoteModal'

const SHOPS = [
  {
    name: 'Great Lakes Plastics',
    location: 'Grand Rapids, MI',
    zip: '49503',
    capability: 'Single-cavity prototype + bridge tooling',
    leadTime: '4-5 weeks',
    notes: 'Strong on small-to-medium snap-fit parts. Comfortable with side actions.',
    minScore: 60,
  },
  {
    name: 'Detroit Mold & Tool',
    location: 'Sterling Heights, MI',
    zip: '48312',
    capability: 'Production tooling, multi-cavity',
    leadTime: '8-10 weeks',
    notes: 'Best fit once volumes pass 25k pieces and the geometry is fixed.',
    minScore: 70,
  },
  {
    name: 'Lakeshore IM',
    location: 'Holland, MI',
    zip: '49423',
    capability: 'Engineering grade resins, glass-filled',
    leadTime: '5-6 weeks',
    notes: 'Pick this shop if the part switches to glass-filled nylon later.',
    minScore: 65,
  },
  {
    name: 'Midwest Precision Molding',
    location: 'Kalamazoo, MI',
    zip: '49001',
    capability: 'Low-volume production, rapid prototyping',
    leadTime: '3-4 weeks',
    notes: 'Great for fast turnaround on simpler geometries. Limited side-action capability.',
    minScore: 75,
  },
]

// Distance proxy: first 3 digits of a ZIP cluster geographically in the
// US. Without a real geocoder we rank by the absolute integer
// difference of the prefix — close enough for "show me nearby molders"
// in a Michigan-only marketplace.
function rankByZipProximity<T extends { zip: string }>(shops: T[], userZip: string): T[] {
  const target = parseInt(userZip.slice(0, 3), 10)
  if (Number.isNaN(target)) return shops
  return [...shops].sort((a, b) => {
    const da = Math.abs(parseInt(a.zip.slice(0, 3), 10) - target)
    const db = Math.abs(parseInt(b.zip.slice(0, 3), 10) - target)
    return da - db
  })
}

export default function OnDemandManufacturingPage() {
  const { simulationParams, setSimulationResults } = useAppStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dfmData, setDfmData] = useState<ManufacturingCheckResponse | null>(null)
  const [costData, setCostData] = useState<CostResponse | null>(null)
  const [quoteShop, setQuoteShop] = useState<(typeof SHOPS)[number] | null>(null)
  const [userZip, setUserZip] = useState('')

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      setError(null)

      try {
        const [dfm, cost] = await Promise.all([
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

  const dfmScore = dfmData.overall_score
  let readiness: { status: string; tone: 'good' | 'warn' | 'bad' }
  if (dfmScore >= 80) readiness = { status: 'Ready for quotes', tone: 'good' }
  else if (dfmScore >= 60) readiness = { status: 'Needs improvement', tone: 'warn' }
  else readiness = { status: 'Not quote-ready', tone: 'bad' }

  const rankedShops = /^\d{5}$/.test(userZip) ? rankByZipProximity(SHOPS, userZip) : SHOPS
  const eligibleShops = rankedShops.filter((shop) => dfmScore >= shop.minScore)
  const bestLeadTime =
    eligibleShops.length > 0
      ? eligibleShops.reduce((best, shop) => {
          const weeks = parseInt(shop.leadTime.split('-')[0])
          const bestWeeks = parseInt(best.leadTime.split('-')[0])
          return weeks < bestWeeks ? shop : best
        })
      : null

  const actionItems = [
    ...dfmData.issues.map((issue) => ({
      severity: issue.severity === 'critical' ? ('critical' as const) : issue.severity === 'warning' ? ('warning' as const) : ('info' as const),
      text: issue.issue,
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
          hint={dfmData.summary}
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
                ${(costData.total_tooling_cost / 1000).toFixed(1)}k
              </div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <div className="text-xs text-zinc-500 mb-1">
                Per part ({simulationParams.productionQuantity.toLocaleString()} pcs)
              </div>
              <div className="text-lg font-medium text-zinc-100">
                ${costData.total_cost_per_part.toFixed(2)}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <div className="text-xs text-zinc-500 mb-1">Total project</div>
              <div className="text-lg font-medium text-zinc-100">
                $
                {(
                  (costData.total_cost_per_part * simulationParams.productionQuantity +
                    costData.total_tooling_cost) /
                  1000
                ).toFixed(1)}
                k
              </div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <div className="text-xs text-zinc-500 mb-1">Parts/hour</div>
              <div className="text-lg font-medium text-zinc-100">
                {costData.parts_per_hour.toFixed(0)}
              </div>
            </div>
          </div>
        </Section>
      )}

      <Section
        title="Candidate shops"
        description={
          eligibleShops.length > 0
            ? 'Click a shop to request a quote for the current design'
            : 'Improve DFM score to unlock shops'
        }
      >
        <div className="flex items-center gap-2 mb-4 -mx-1">
          <MapPin className="size-4 text-zinc-500" />
          <input
            type="text"
            inputMode="numeric"
            maxLength={5}
            placeholder="Your ZIP (e.g. 49503)"
            value={userZip}
            onChange={(e) => setUserZip(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
            className="px-2 py-1 text-xs bg-zinc-900 border border-zinc-700 rounded font-mono w-32 outline-none focus:border-violet-500"
          />
          <span className="text-[11px] text-zinc-500">
            {/^\d{5}$/.test(userZip)
              ? 'Sorted by distance from your ZIP.'
              : 'Add a ZIP to sort by distance.'}
          </span>
        </div>
        <ul className="divide-y divide-zinc-800 -mx-5 -my-5">
          {rankedShops.map((shop) => {
            const isEligible = dfmScore >= shop.minScore
            return (
              <li
                key={shop.name}
                className={`px-5 py-4 flex items-start gap-4 ${!isEligible ? 'opacity-50' : ''}`}
              >
                <span
                  className={`shrink-0 size-9 rounded-md border flex items-center justify-center ${
                    isEligible
                      ? 'border-violet-500/40 bg-violet-500/10 text-violet-300'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-500'
                  }`}
                >
                  <Factory className="size-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-medium text-zinc-100 flex items-center gap-2">
                      {shop.name}
                      {isEligible ? (
                        <CheckCircle2 className="size-4 text-emerald-400" />
                      ) : (
                        <span className="text-xs text-zinc-500">
                          (requires {shop.minScore}+ DFM)
                        </span>
                      )}
                    </h3>
                    <span className="text-xs text-zinc-500 inline-flex items-center gap-1">
                      <MapPin className="size-3" />
                      {shop.location}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">{shop.capability}</div>
                  <div className="text-xs text-zinc-500 mt-2 leading-relaxed">{shop.notes}</div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-2">
                  <span className="text-xs text-zinc-300 inline-flex items-center gap-1">
                    <Clock className="size-3.5 text-zinc-500" />
                    {shop.leadTime}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuoteShop(shop)}
                    disabled={!isEligible}
                    className="px-2.5 py-1 text-[11px] bg-violet-600 hover:bg-violet-500 text-white rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title={isEligible ? `Request a quote from ${shop.name}` : `Improve DFM score to ${shop.minScore}+ to unlock`}
                  >
                    Request Quote
                  </button>
                </div>
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
            {actionItems.map((item) => (
              <li key={`${item.severity}-${item.text}`} className="flex gap-3">
                <span
                  className={`size-1.5 rounded-full mt-2 shrink-0 ${
                    item.severity === 'critical'
                      ? 'bg-rose-400'
                      : item.severity === 'warning'
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                  }`}
                />
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
              <>
                Your design is ready for quotes. Click <strong>Request Quote</strong> on any
                eligible shop above to start the handshake.
              </>
            ) : (
              <>
                Apply the recommended design fixes to reach a DFM score of 70+, then request
                quotes from the candidate shops above.
              </>
            )}
          </div>
        </div>
      </Section>

      <QuoteModal
        open={quoteShop !== null}
        onClose={() => setQuoteShop(null)}
        shop={quoteShop}
        estimate={{
          tooling: costData?.total_tooling_cost ?? 24500,
          perPart: costData?.total_cost_per_part ?? 1.42,
          leadWeeks: quoteShop ? parseInt(quoteShop.leadTime.split('-')[0]) : 4,
        }}
      />
    </AnalysisPageLayout>
  )
}
