'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, Cpu, RotateCcw, RefreshCw } from 'lucide-react'
import { useResultsStore } from '@/store/useResultsStore'
import { ScoreOverview } from './ScoreOverview'
import { PartPreview } from './PartPreview'
import { IssueDetailPanel } from './IssueDetailPanel'
import { ScoreImprovement } from './ScoreImprovement'
import { ReadinessChecklist } from './ReadinessChecklist'
import { LoadingScreen } from './LoadingScreen'
import { PartsSidebar } from './PartsSidebar'

export function ResultsDashboard() {
  const {
    analysis,
    fixedIssueIds,
    resetFixes,
    loading,
    simulateAnalysis,
    selectIssue,
  } = useResultsStore()

  // Pre-select an issue when the dashboard is opened via a ribbon link
  // like /results?focus=undercut-1. Falls through silently if no match.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const focusId = new URLSearchParams(window.location.search).get('focus')
    if (focusId && analysis.issues.some((i) => i.id === focusId)) {
      selectIssue(focusId)
    }
  }, [analysis.issues, selectIssue])

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
      {/* Toolbar — styled to match the main-page Toolbar */}
      <header className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className="flex items-center gap-1 px-2 py-1.5 text-sm hover:bg-zinc-800 rounded"
            title="Back to editor"
          >
            <ChevronLeft className="size-4" />
            <span>Back</span>
          </Link>

          <div className="h-6 w-px bg-zinc-700 mx-1" />

          <span className="flex items-center gap-2 px-2 py-1.5">
            <span className="size-6 rounded-md bg-blue-500/15 border border-blue-500/40 flex items-center justify-center">
              <Cpu className="size-3.5 text-blue-300" />
            </span>
            <span className="text-sm font-medium">MoldLocal Report</span>
            <span className="text-xs text-zinc-500 font-mono">
              {analysis.partName}
            </span>
          </span>
        </nav>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 px-2">
            {fixedIssueIds.length}/{analysis.issues.length} fixes applied
          </span>

          <div className="h-6 w-px bg-zinc-700" />

          <button
            onClick={resetFixes}
            disabled={fixedIssueIds.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded disabled:opacity-40 disabled:cursor-not-allowed"
            title="Reset all applied fixes"
          >
            <RotateCcw className="size-4" />
            <span className="text-sm">Reset</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              if (loading) return
              await simulateAnalysis()
            }}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-40 disabled:cursor-not-allowed"
            title="Re-run analysis on the part"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-sm">Re-analyze</span>
          </button>
        </div>
      </header>

      {loading ? (
        <LoadingScreen />
      ) : (
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
            <ScoreOverview />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 space-y-6">
                <PartPreview />
                <ScoreImprovement />
              </div>
              <div className="lg:col-span-2 space-y-6">
                <PartsSidebar />
                <IssueDetailPanel />
                <ReadinessChecklist />
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  )
}
