'use client'

import {
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Wrench,
  DollarSign,
  Clock,
  MapPin,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useResultsStore } from '@/store/useResultsStore'
import type { MoldIssue, MoldIssueSeverity } from '@/lib/types'

const SEVERITY_BADGE: Record<MoldIssueSeverity, string> = {
  high: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
  medium: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  low: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
}

function InfoRow({
  icon: Icon,
  title,
  body,
  tone,
}: {
  icon: LucideIcon
  title: string
  body: string
  tone: 'rose' | 'amber' | 'blue'
}) {
  const toneClass = {
    rose: 'text-rose-300 bg-rose-500/10 border-rose-500/30',
    amber: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
    blue: 'text-blue-300 bg-blue-500/10 border-blue-500/30',
  }[tone]
  return (
    <div className="flex gap-3">
      <span className={`shrink-0 size-8 rounded-md border ${toneClass} flex items-center justify-center`}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide text-zinc-500 mb-1">{title}</div>
        <p className="text-sm text-zinc-200 leading-relaxed">{body}</p>
      </div>
    </div>
  )
}

function IssueChip({ issue }: { issue: MoldIssue }) {
  const { selectedIssueId, selectIssue, fixedIssueIds } = useResultsStore()
  const isSelected = selectedIssueId === issue.id
  const isFixed = fixedIssueIds.includes(issue.id)

  return (
    <button
      onClick={() => selectIssue(issue.id)}
      className={`text-left text-xs px-3 py-2 rounded-md border transition-colors ${
        isSelected
          ? 'border-zinc-500 bg-zinc-800 text-zinc-100'
          : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`size-2 rounded-full ${
            isFixed
              ? 'bg-emerald-400'
              : issue.severity === 'high'
              ? 'bg-rose-500'
              : issue.severity === 'medium'
              ? 'bg-amber-400'
              : 'bg-emerald-400'
          }`}
        />
        <span className="font-medium truncate">{issue.title}</span>
      </div>
    </button>
  )
}

export function IssueDetailPanel() {
  const {
    analysis,
    selectedIssueId,
    fixedIssueIds,
    showFix,
    toggleShowFix,
    applyFix,
  } = useResultsStore()

  const selected = analysis.issues.find((i) => i.id === selectedIssueId)

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-blue-400" />
          <h2 className="text-sm font-medium text-zinc-100">AI Design Assistant</h2>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">
          {analysis.issues.length} issues
        </div>
      </div>

      <div className="px-4 py-3 border-b border-zinc-800 flex flex-wrap gap-2">
        {analysis.issues.map((issue) => (
          <IssueChip key={issue.id} issue={issue} />
        ))}
      </div>

      {!selected ? (
        <div className="p-6 text-center text-sm text-zinc-500">
          Select an issue from the part preview to view details.
        </div>
      ) : (
        <div className="p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="size-4 text-amber-400" />
                <h3 className="text-base font-semibold text-zinc-100 truncate">
                  {selected.title}
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <MapPin className="size-3" />
                <span>{selected.location}</span>
              </div>
            </div>
            <span
              className={`shrink-0 px-2 py-1 rounded-md text-[10px] uppercase tracking-wider border ${
                SEVERITY_BADGE[selected.severity]
              }`}
            >
              {selected.severity} severity
            </span>
          </div>

          <div className="space-y-3 pt-2">
            <InfoRow
              icon={AlertTriangle}
              title="Why it matters"
              body={selected.whyItMatters}
              tone="amber"
            />
            <InfoRow
              icon={DollarSign}
              title="Cost impact"
              body={selected.costImpact}
              tone="rose"
            />
            <InfoRow
              icon={Clock}
              title="Lead time impact"
              body={selected.leadTimeImpact}
              tone="blue"
            />
          </div>

          <div className="pt-1">
            {!showFix && !fixedIssueIds.includes(selected.id) ? (
              <button
                onClick={toggleShowFix}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white transition-colors"
              >
                <Wrench className="size-4" />
                How do I fix it?
              </button>
            ) : (
              <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 p-3 space-y-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="size-4 text-blue-300 mt-0.5" />
                  <div className="text-sm text-zinc-100 leading-relaxed">
                    <div className="text-xs uppercase tracking-wide text-blue-300 mb-1">
                      Recommended fix
                    </div>
                    {selected.recommendation}
                  </div>
                </div>

                {fixedIssueIds.includes(selected.id) ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-300">
                    <CheckCircle2 className="size-4" />
                    Fix applied — score updated.
                  </div>
                ) : (
                  <button
                    onClick={() => applyFix(selected.id)}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-sm font-medium text-white transition-colors"
                  >
                    <CheckCircle2 className="size-4" />
                    Apply fix ({selected.scoreImpact} score)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
