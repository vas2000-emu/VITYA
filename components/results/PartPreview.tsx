'use client'

import { useResultsStore } from '@/store/useResultsStore'
import { useAppStore } from '@/store/useAppStore'
import type { MoldIssue, MoldIssueSeverity } from '@/lib/types'
import { PartSilhouette } from './PartSilhouette'

const SEVERITY_RING: Record<MoldIssueSeverity, string> = {
  high: 'bg-rose-500 shadow-[0_0_0_8px_rgba(244,63,94,0.18)]',
  medium: 'bg-amber-400 shadow-[0_0_0_8px_rgba(251,191,36,0.18)]',
  low: 'bg-emerald-400 shadow-[0_0_0_8px_rgba(52,211,153,0.18)]',
}

const SEVERITY_LABEL: Record<MoldIssueSeverity, string> = {
  high: 'border-rose-500/60 text-rose-200 bg-rose-500/15',
  medium: 'border-amber-400/60 text-amber-100 bg-amber-400/15',
  low: 'border-emerald-400/60 text-emerald-100 bg-emerald-400/15',
}

function Hotspot({ issue }: { issue: MoldIssue }) {
  const { selectedIssueId, selectIssue, fixedIssueIds } = useResultsStore()
  const isSelected = selectedIssueId === issue.id
  const isFixed = fixedIssueIds.includes(issue.id)

  return (
    <button
      onClick={() => selectIssue(issue.id)}
      className="absolute -translate-x-1/2 -translate-y-1/2 group focus:outline-none"
      style={{ top: issue.hotspot.top, left: issue.hotspot.left }}
      aria-label={`Open issue: ${issue.title}`}
    >
      <span
        className={`block size-4 rounded-full transition-all duration-200 ${
          isFixed
            ? 'bg-emerald-500 shadow-[0_0_0_8px_rgba(52,211,153,0.18)]'
            : SEVERITY_RING[issue.severity]
        } ${isSelected ? 'scale-125 ring-2 ring-white/70' : 'group-hover:scale-110'}`}
      >
        <span
          className={`absolute inset-0 rounded-full ${
            isFixed ? '' : 'motion-safe:animate-ping'
          } ${isFixed ? '' : SEVERITY_RING[issue.severity].split(' ')[0]}`}
        />
      </span>
      <span
        className={`absolute left-5 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px] font-medium rounded-md border whitespace-nowrap ${
          SEVERITY_LABEL[issue.severity]
        } ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
      >
        {issue.hotspot.label}
      </span>
    </button>
  )
}

export function PartPreview() {
  const { analysis } = useResultsStore()
  // For AI-generated parts the partId is a `user-...` slug; look up the
  // matching UserPart so the silhouette can render the actual primitive
  // (torus, hex prism, etc.) instead of a generic rectangle.
  const userPart = useAppStore((s) => s.userParts.find((p) => p.id === analysis.partId))
  const customSpec = userPart?.kind === 'ai-created' ? userPart.spec : null

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div>
          <h2 className="text-sm font-medium text-zinc-100">Part Preview</h2>
          <p className="text-xs text-zinc-500">
            Click a highlighted area to inspect the issue
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-rose-500" /> High
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-400" /> Medium
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-400" /> Fixed
          </span>
        </div>
      </div>

      <div className="relative aspect-[4/3] bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
        <PartSilhouette partId={analysis.partId} customSpec={customSpec} />
        {analysis.issues.map((issue) => (
          <Hotspot key={issue.id} issue={issue} />
        ))}
      </div>

      <div className="px-4 py-2 border-t border-zinc-800 text-xs text-zinc-500 flex items-center justify-between">
        <span className="font-mono">{analysis.partName}</span>
        <span>{analysis.issues.length} issues detected</span>
      </div>
    </div>
  )
}

