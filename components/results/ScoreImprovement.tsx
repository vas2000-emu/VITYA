'use client'

import { ArrowRight, TrendingUp } from 'lucide-react'
import { useResultsStore, computeCurrentScore } from '@/store/useResultsStore'
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber'

function scoreTone(score: number) {
  if (score >= 80) return 'text-emerald-300'
  if (score >= 65) return 'text-amber-300'
  return 'text-rose-300'
}

function ringTone(score: number) {
  if (score >= 80) return 'stroke-emerald-400'
  if (score >= 65) return 'stroke-amber-400'
  return 'stroke-rose-400'
}

function ScoreRing({ score, size = 96 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth="6"
          className="stroke-zinc-800"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
          className={`${ringTone(score)} transition-[stroke-dashoffset] duration-700 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold tabular-nums ${scoreTone(score)}`}>
          {score}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">/100</span>
      </div>
    </div>
  )
}

export function ScoreImprovement() {
  const { analysis, fixedIssueIds } = useResultsStore()
  const target = analysis.improvedScore
  const targetCurrent = computeCurrentScore(
    analysis.overallScore,
    analysis.improvedScore,
    fixedIssueIds,
    analysis.issues,
  )
  const animated = useAnimatedNumber(targetCurrent, 700)
  const current = Math.round(animated)
  const delta = current - analysis.overallScore

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
        <TrendingUp className="size-4 text-emerald-400" />
        <h2 className="text-sm font-medium text-zinc-100">Michigan Readiness</h2>
        {delta > 0 && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
            +{delta}
          </span>
        )}
      </div>

      <div className="p-4 grid grid-cols-3 items-center gap-3">
        <div className="flex flex-col items-center gap-2">
          <ScoreRing score={analysis.overallScore} />
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Baseline</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <ArrowRight className="size-5 text-zinc-500" />
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">
            {fixedIssueIds.length} fix{fixedIssueIds.length === 1 ? '' : 'es'} applied
          </span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <ScoreRing score={current} />
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">
            {current === target ? 'Target' : 'Current'}
          </span>
        </div>
      </div>

      <div className="px-4 pb-4 -mt-1">
        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-rose-400 via-amber-400 to-emerald-400 transition-[width] duration-700 ease-out"
            style={{ width: `${current}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] uppercase tracking-wider text-zinc-500 mt-2">
          <span>0</span>
          <span>Target {target}</span>
          <span>100</span>
        </div>
      </div>
    </div>
  )
}
