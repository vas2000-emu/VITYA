'use client'

import { Box, Smartphone, Plane, Car, Check, Sparkles, Upload, X } from 'lucide-react'
import { useResultsStore, computeCurrentScore } from '@/store/useResultsStore'
import { partsLibrary } from '@/lib/mockMoldAnalysis'
import { useAppStore } from '@/store/useAppStore'
import type { DemoPartId, UserPart } from '@/lib/types'

// Icons for the four built-in demo parts. User-created parts
// (AI-generated / STL upload) get a different icon set below.
const ICONS: Record<DemoPartId, React.ReactNode> = {
  bracket: <Box className="size-5" />,
  phoneCase: <Smartphone className="size-5" />,
  droneArm: <Plane className="size-5" />,
  bumper: <Car className="size-5" />,
}

const USER_PART_ICONS: Record<UserPart['kind'], React.ReactNode> = {
  'ai-created': <Sparkles className="size-5" />,
  uploaded: <Upload className="size-5" />,
}

/**
 * Vertical list of the demo parts plus any user-registered parts
 * (AI-generated or STL-uploaded). Clicking a card swaps the
 * dashboard's analysis data and the workspace's 3D geometry in one
 * shot (see useResultsStore.selectPart for the cross-store sync;
 * selectUserPart for user-registered ones).
 */
export function PartsSidebar() {
  const analysis = useResultsStore((s) => s.analysis)
  const fixedIssueIds = useResultsStore((s) => s.fixedIssueIds)
  const selectPart = useResultsStore((s) => s.selectPart)
  const selectUserPart = useResultsStore((s) => s.selectUserPart)
  const userParts = useAppStore((s) => s.userParts)
  const removeUserPart = useAppStore((s) => s.removeUserPart)

  const demoIds = Object.keys(partsLibrary) as DemoPartId[]
  const totalParts = demoIds.length + userParts.length

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-100">Part library</h2>
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">
          {totalParts} parts
        </span>
      </div>
      <div className="divide-y divide-zinc-800">
        {userParts.map((part) => {
          const isActive = analysis.partId === part.id
          return (
            <button
              key={part.id}
              type="button"
              onClick={() => selectUserPart(part)}
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
                {USER_PART_ICONS[part.kind]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-100 truncate">
                    {part.label}
                  </span>
                  {isActive && (
                    <span className="text-[10px] uppercase tracking-wider text-blue-300">
                      Active
                    </span>
                  )}
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                    {part.kind === 'ai-created' ? 'AI part' : 'Upload'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 leading-snug mt-0.5 line-clamp-2">
                  {part.kind === 'ai-created' ? (part.description ?? '') : 'STL upload'}
                </p>
                <div className="mt-2 flex items-center gap-3 text-[11px]">
                  <span className="text-zinc-500">
                    {part.kind === 'ai-created' ? part.spec.material : part.material}
                  </span>
                </div>
              </div>
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  removeUserPart(part.id)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    removeUserPart(part.id)
                  }
                }}
                role="button"
                tabIndex={0}
                title="Remove from library"
                className="shrink-0 self-center p-1 text-zinc-500 hover:text-rose-300 hover:bg-zinc-800 rounded cursor-pointer"
              >
                <X className="size-3" />
              </span>
            </button>
          )
        })}
        {demoIds.map((id) => {
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
