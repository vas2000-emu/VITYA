'use client'

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  MapPin,
  Wrench,
} from 'lucide-react'
import { moldAnalysisData } from '@/lib/mockMoldAnalysis'
import { Section, StatBlock } from './AnalysisPageLayout'
import type { MoldIssue } from '@/lib/types'

const SEVERITY_BADGE: Record<MoldIssue['severity'], string> = {
  high: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
  medium: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  low: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
}

export function IssueAnalysisDetail({ issueId }: { issueId: string }) {
  const issue = moldAnalysisData.issues.find((i) => i.id === issueId)

  if (!issue) {
    return (
      <Section title="Issue not found">
        <p className="text-sm text-zinc-400">
          No analysis exists for issue id <code>{issueId}</code>.
        </p>
      </Section>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatBlock
          label="Severity"
          value={issue.severity.toUpperCase()}
          tone={
            issue.severity === 'high'
              ? 'bad'
              : issue.severity === 'medium'
              ? 'warn'
              : 'good'
          }
        />
        <StatBlock label="Location" value={issue.location} />
        <StatBlock
          label="Baseline score"
          value={`${issue.beforeScore}`}
          hint="Michigan readiness before any fix"
          tone="bad"
        />
        <StatBlock
          label="After fix"
          value={`${issue.afterScore}`}
          hint={`Estimated gain ${issue.scoreImpact}`}
          tone="good"
        />
      </div>

      <Section
        title="What's wrong"
        description="Plain-English explanation of the manufacturing concern"
      >
        <div className="flex gap-3">
          <span className="shrink-0 size-9 rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-300 flex items-center justify-center">
            <AlertTriangle className="size-4" />
          </span>
          <p className="text-sm text-zinc-200 leading-relaxed">
            {issue.whyItMatters}
          </p>
        </div>
      </Section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Cost impact">
          <div className="flex gap-3">
            <span className="shrink-0 size-9 rounded-md border border-rose-500/40 bg-rose-500/10 text-rose-300 flex items-center justify-center">
              <DollarSign className="size-4" />
            </span>
            <p className="text-sm text-zinc-200 leading-relaxed">
              {issue.costImpact}
            </p>
          </div>
        </Section>

        <Section title="Lead time impact">
          <div className="flex gap-3">
            <span className="shrink-0 size-9 rounded-md border border-sky-500/40 bg-sky-500/10 text-sky-300 flex items-center justify-center">
              <Clock className="size-4" />
            </span>
            <p className="text-sm text-zinc-200 leading-relaxed">
              {issue.leadTimeImpact}
            </p>
          </div>
        </Section>
      </div>

      <Section
        title="Recommended fix"
        description="Apply this change to bring the part within Michigan molder norms"
      >
        <div className="flex gap-3">
          <span className="shrink-0 size-9 rounded-md border border-blue-500/40 bg-blue-500/10 text-blue-300 flex items-center justify-center">
            <Wrench className="size-4" />
          </span>
          <p className="text-sm text-zinc-200 leading-relaxed">
            {issue.recommendation}
          </p>
        </div>

        <div className="mt-4 flex items-center gap-3 text-sm">
          <span className="px-2 py-1 rounded-md border border-rose-500/40 bg-rose-500/10 text-rose-300 tabular-nums">
            {issue.beforeScore}/100
          </span>
          <ArrowRight className="size-4 text-zinc-600" />
          <span className="px-2 py-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 tabular-nums">
            {issue.afterScore}/100
          </span>
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-emerald-300">
            <CheckCircle2 className="size-3.5" />
            Estimated improvement {issue.scoreImpact}
          </span>
        </div>
      </Section>

      <Section title="Reviewed by">
        <div className="flex items-center gap-3 text-sm text-zinc-300">
          <span className="size-8 rounded-md border border-zinc-700 bg-zinc-800 flex items-center justify-center">
            <MapPin className="size-4 text-blue-300" />
          </span>
          <div className="leading-tight">
            <div>Michigan-based injection molders</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              Aggregated tooling guidelines from local shops within ~150 mi.
            </div>
          </div>
        </div>
      </Section>

      <span
        className={`inline-block px-2 py-1 rounded-md text-[10px] uppercase tracking-wider border ${
          SEVERITY_BADGE[issue.severity]
        }`}
      >
        {issue.title}
      </span>
    </>
  )
}
