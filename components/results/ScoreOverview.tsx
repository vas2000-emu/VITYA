'use client'

import { Factory, Layers3, DollarSign, Clock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useResultsStore, computeCurrentScore } from '@/store/useResultsStore'
import type { MoldRiskMetric } from '@/lib/types'

const ICONS: LucideIcon[] = [Factory, Layers3, DollarSign, Clock]
const ACCENTS = [
  'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  'text-blue-400 bg-blue-500/10 border-blue-500/30',
  'text-amber-400 bg-amber-500/10 border-amber-500/30',
  'text-rose-400 bg-rose-500/10 border-rose-500/30',
]

function MetricCard({ metric, index, liveValue }: {
  metric: MoldRiskMetric
  index: number
  liveValue?: string
}) {
  const Icon = ICONS[index % ICONS.length]
  const accent = ACCENTS[index % ACCENTS.length]
  const value = liveValue ?? metric.value

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 flex flex-col gap-3 hover:border-zinc-700 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-zinc-400">
          {metric.label}
        </span>
        <span className={`p-1.5 rounded-md border ${accent}`}>
          <Icon className="size-3.5" />
        </span>
      </div>
      <div className="text-2xl font-semibold text-zinc-100 tabular-nums">{value}</div>
      <div className="text-xs text-zinc-500 leading-relaxed">{metric.description}</div>
    </div>
  )
}

export function ScoreOverview() {
  const { analysis, fixedIssueIds } = useResultsStore()
  const currentScore = computeCurrentScore(
    analysis.overallScore,
    analysis.improvedScore,
    fixedIssueIds,
    analysis.issues,
  )

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {analysis.riskSummary.map((metric, i) => (
        <MetricCard
          key={metric.label}
          metric={metric}
          index={i}
          liveValue={
            i === 0 && fixedIssueIds.length > 0 ? `${currentScore}/100` : undefined
          }
        />
      ))}
    </div>
  )
}
