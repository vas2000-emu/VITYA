'use client'

import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import {
  AnalysisPageLayout,
  Section,
  StatBlock,
} from '@/components/analysis/AnalysisPageLayout'

const COST_DRIVERS = [
  {
    label: 'Side actions for undercut',
    delta: '+$1,800 tooling',
    detail:
      'The snap-fit hook requires a side-action core to release. Adds machining and inspection.',
    direction: 'up' as const,
  },
  {
    label: 'Extra mold tuning for draft',
    delta: '+12% cycle time',
    detail:
      'Faces below 3 degrees of draft will scuff on ejection. Process tuning required.',
    direction: 'up' as const,
  },
  {
    label: 'Thicker side walls (planned fix)',
    delta: '+5% material cost',
    detail:
      'Going from 1.5 mm to 2.5 mm uses a little more resin but eliminates rejects.',
    direction: 'up' as const,
  },
  {
    label: 'Removing the undercut',
    delta: '-$1,800 tooling',
    detail:
      'Redesigning the snap-fit eliminates the need for side actions entirely.',
    direction: 'down' as const,
  },
]

export default function CostingPage() {
  return (
    <AnalysisPageLayout
      title="Costing"
      subtitle="Estimated tooling and per-part cost for this geometry, based on Michigan injection-molding norms for similar part complexity and volume."
      icon={DollarSign}
      accent="emerald"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatBlock
          label="Tooling investment"
          value="$24,500"
          hint="Steel single-cavity mold with 1 side action"
          tone="warn"
        />
        <StatBlock
          label="Per-part cost"
          value="$1.42"
          hint="At 10,000-piece run, ABS resin"
        />
        <StatBlock
          label="Cost risk"
          value="High"
          hint="Driven by tooling complexity. Resolvable via design fixes below."
          tone="bad"
        />
      </div>

      <Section
        title="Cost drivers"
        description="What's pushing the quote up or down on this part"
      >
        <ul className="divide-y divide-zinc-800 -mx-5 -my-5">
          {COST_DRIVERS.map((d) => (
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

      <Section
        title="Assumptions"
        description="Swap these out when the real backend quoting model lands"
      >
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {[
            ['Material', 'ABS, virgin'],
            ['Run size', '10,000 pieces'],
            ['Cavities', '1 (single-cavity prototype tool)'],
            ['Cycle time est.', '34 seconds'],
            ['Quoting region', 'Michigan, USA'],
            ['Confidence', 'Indicative — refine after DFM review'],
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
