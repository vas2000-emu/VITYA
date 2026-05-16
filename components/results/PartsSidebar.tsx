'use client'

import { Box, Smartphone, Plane, Check } from 'lucide-react'
import { useResultsStore, computeCurrentScore } from '@/store/useResultsStore'
import { partsLibrary } from '@/lib/mockMoldAnalysis'
import type { PartId } from '@/lib/types'

const ICONS: Record<PartId, React.ReactNode> = {
  bracket: <Box className="size-5" />,
  phoneCase: <Smartphone className="size-5" />,
  droneArm: <Plane className="size-5" />,
}

/**
 * Vertical list of the three demo parts. Clicking a card swaps the
 * dashboard's analysis data and the workspace's 3D geometry in one shot
 * (see useResultsStore.selectPart for the cross-store sync).
 */
export function PartsSidebar() {
  const analysis = useResultsStore((s) => s.analysis)
  const fixedIssueIds = useResultsStore((s) => s.fixedIssueIds)
  const selectPart = useResultsStore((s) => s.selectPart)

  const partIds = Object.keys(partsLibrary) as PartId[]

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-100">Part library</h2>
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">
          {partIds.length} parts
        </span>
      </div>
      <div className="divide-y divide-zinc-800">
        {partIds.map((id) => {
          const p = partsLibrary[id]
          const isActive = analysis.partId === id
          const liveScore = isActive
            ? computeCurrentScore(p.overallScore, p.improvedScore, fixedIssueIds, p.issues)
            : p.overallScore
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectPart(id)}
              className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                isActive ? 'bg-blue-500/10' : 'hover:bg-zinc-800/60'
              }`}
            >
              <span
                className={`shrink-0 size-9 rounded-md border flex items-center justify-center ${
                  isActive
                    ? 'border-blue-500/40 bg-blue-500/15 text-blue-300'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                }`}
              >
                {ICONS[id]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-100 truncate">
                    {p.partName}
                  </span>
                  {isActive && (
                    <span className="text-[10px] uppercase tracking-wider text-blue-300">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 leading-snug mt-0.5 line-clamp-2">
                  {p.partSummary}
                </p>
                <div className="mt-2 flex items-center gap-3 text-[11px]">
                  <ScorePill value={liveScore} target={p.improvedScore} />
                  <span className="text-zinc-500">{p.issues.length} issues</span>
                  {isActive && fixedIssueIds.length > 0 && (
                    <span className="text-emerald-400 inline-flex items-center gap-1">
                      <Check className="size-3" />
                      {fixedIssueIds.length}/{p.issues.length} fixed
                    </span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ScorePill({ value, target }: { value: number; target: number }) {
  const tone =
    value >= target - 5
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
      : value >= 60
        ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
        : 'bg-rose-500/15 text-rose-300 border-rose-500/40'
  return (
    <span
      className={`px-1.5 py-0.5 rounded border font-mono ${tone}`}
      title={`Current ${value} / target ${target}`}
    >
      {value}
    </span>
  )
}
