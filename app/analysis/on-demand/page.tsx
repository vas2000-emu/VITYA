'use client'

import { Factory, MapPin, Clock, Phone } from 'lucide-react'
import {
  AnalysisPageLayout,
  Section,
  StatBlock,
} from '@/components/analysis/AnalysisPageLayout'

const SHOPS = [
  {
    name: 'Great Lakes Plastics',
    location: 'Grand Rapids, MI',
    capability: 'Single-cavity prototype + bridge tooling',
    leadTime: '4-5 weeks',
    notes:
      'Strong on small-to-medium snap-fit parts. Comfortable with side actions.',
  },
  {
    name: 'Detroit Mold & Tool',
    location: 'Sterling Heights, MI',
    capability: 'Production tooling, multi-cavity',
    leadTime: '8-10 weeks',
    notes:
      'Best fit once volumes pass 25k pieces and the geometry is fixed.',
  },
  {
    name: 'Lakeshore IM',
    location: 'Holland, MI',
    capability: 'Engineering grade resins, glass-filled',
    leadTime: '5-6 weeks',
    notes:
      'Pick this shop if the bracket switches to glass-filled nylon later.',
  },
]

export default function OnDemandManufacturingPage() {
  return (
    <AnalysisPageLayout
      title="On Demand Manufacturing"
      subtitle="Quote-readiness for Michigan-area injection molders. Once the design fixes land, these shops can take the file and turn around tooling without an in-person DFM review."
      icon={Factory}
      accent="violet"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatBlock
          label="Readiness"
          value="Needs improvement"
          hint="Apply the recommended fixes before requesting quotes."
          tone="warn"
        />
        <StatBlock
          label="Shops in range"
          value="14"
          hint="Within 150 mi of Ann Arbor"
        />
        <StatBlock
          label="Best lead time"
          value="4 wk"
          hint="Great Lakes Plastics, single-cavity prototype tool"
          tone="good"
        />
      </div>

      <Section
        title="Candidate shops"
        description="Top three matches for this geometry and material"
      >
        <ul className="divide-y divide-zinc-800 -mx-5 -my-5">
          {SHOPS.map((shop) => (
            <li
              key={shop.name}
              className="px-5 py-4 flex items-start gap-4"
            >
              <span className="shrink-0 size-9 rounded-md border border-violet-500/40 bg-violet-500/10 text-violet-300 flex items-center justify-center">
                <Factory className="size-4" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium text-zinc-100">
                    {shop.name}
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
          ))}
        </ul>
      </Section>

      <Section
        title="What needs to happen before quoting"
        description="Items the shop will flag during their own DFM review"
      >
        <ul className="space-y-2 text-sm text-zinc-200">
          <li className="flex gap-3">
            <span className="size-1.5 rounded-full bg-rose-400 mt-2 shrink-0" />
            Resolve the undercut on the snap-fit hook so a side action is not
            required.
          </li>
          <li className="flex gap-3">
            <span className="size-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
            Add at least 3 degrees of draft to the vertical wall faces.
          </li>
          <li className="flex gap-3">
            <span className="size-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
            Bring side-wall thickness up to a consistent 2.5 mm.
          </li>
          <li className="flex gap-3">
            <span className="size-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
            Confirm material and finish (e.g. SPI A-2 vs A-3) with the shop.
          </li>
        </ul>
      </Section>

      <Section title="Next step">
        <div className="flex items-center gap-3 text-sm text-zinc-300">
          <span className="size-8 rounded-md border border-zinc-700 bg-zinc-800 flex items-center justify-center">
            <Phone className="size-4 text-blue-300" />
          </span>
          <div>
            Apply the recommended design fixes, then request a quote from any
            of the candidate shops above. The bracket should reach Michigan
            readiness 82/100 once the undercut is resolved.
          </div>
        </div>
      </Section>
    </AnalysisPageLayout>
  )
}
