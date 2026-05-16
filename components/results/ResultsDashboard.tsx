'use client'

import { Cpu, RotateCcw } from 'lucide-react'
import { useResultsStore } from '@/store/useResultsStore'
import { ScoreOverview } from './ScoreOverview'
import { PartPreview } from './PartPreview'
import { IssueDetailPanel } from './IssueDetailPanel'
import { ScoreImprovement } from './ScoreImprovement'
import { ReadinessChecklist } from './ReadinessChecklist'

export function ResultsDashboard() {
  const { analysis, fixedIssueIds, resetFixes } = useResultsStore()

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="size-8 rounded-md bg-blue-500/15 border border-blue-500/40 flex items-center justify-center">
              <Cpu className="size-4 text-blue-300" />
            </span>
            <div>
              <h1 className="text-sm font-semibold text-zinc-100">MoldLocal</h1>
              <p className="text-xs text-zinc-500">
                Analysis result for{' '}
                <span className="text-zinc-300 font-mono">{analysis.partName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">
              {fixedIssueIds.length}/{analysis.issues.length} fixes applied
            </span>
            <button
              onClick={resetFixes}
              disabled={fixedIssueIds.length === 0}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-zinc-800 hover:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw className="size-3" />
              Reset demo
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <ScoreOverview />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <PartPreview />
            <ScoreImprovement />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <IssueDetailPanel />
            <ReadinessChecklist />
          </div>
        </div>
      </main>
    </div>
  )
}
