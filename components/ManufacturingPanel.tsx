'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  PanelRightClose,
  PanelRight,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { ManufacturingIssue, IssueType } from '@/lib/types'

const issueIcons: Record<IssueType, React.ReactNode> = {
  error: <XCircle className="size-4 text-red-400" />,
  warning: <AlertTriangle className="size-4 text-yellow-400" />,
  success: <CheckCircle className="size-4 text-green-400" />,
  info: <AlertCircle className="size-4 text-blue-400" />,
}

const issueBgColors: Record<IssueType, string> = {
  error: 'bg-red-500/10 border-red-500/30',
  warning: 'bg-yellow-500/10 border-yellow-500/30',
  success: 'bg-green-500/10 border-green-500/30',
  info: 'bg-blue-500/10 border-blue-500/30',
}

interface IssueItemProps {
  issue: ManufacturingIssue
}

function IssueItem({ issue }: IssueItemProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`border rounded-lg overflow-hidden ${issueBgColors[issue.type]}`}>
      <div
        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-white/5"
        onClick={() => setExpanded(!expanded)}
      >
        {issueIcons[issue.type]}
        <div className="flex-1 min-w-0">
          <div className="text-xs text-zinc-400 mb-0.5">{issue.category}</div>
          <div className="text-sm font-medium">{issue.title}</div>
          {issue.location && (
            <div className="text-xs text-zinc-500 mt-1 font-mono">{issue.location}</div>
          )}
        </div>
        <button className="p-0.5">
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-white/10 space-y-2 mt-2">
          <div className="text-sm text-zinc-300">{issue.description}</div>
          {issue.suggestion && (
            <div className="px-3 py-2 bg-zinc-900/50 rounded text-xs">
              <div className="text-zinc-400 mb-1">Suggestion:</div>
              <div className="text-zinc-300">{issue.suggestion}</div>
            </div>
          )}
          <button className="w-full px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded">
            Highlight in 3D View
          </button>
        </div>
      )}
    </div>
  )
}

export function ManufacturingPanel() {
  const { manufacturingIssues, rightCollapsed, setRightCollapsed } = useAppStore()

  const errorCount = manufacturingIssues.filter((i) => i.type === 'error').length
  const warningCount = manufacturingIssues.filter((i) => i.type === 'warning').length
  const successCount = manufacturingIssues.filter((i) => i.type === 'success').length

  if (rightCollapsed) {
    return (
      <div className="h-full flex flex-col bg-zinc-900 w-12">
        <div className="flex flex-col items-center py-3 border-b border-zinc-800">
          <button
            onClick={() => setRightCollapsed(false)}
            className="p-2 hover:bg-zinc-800 rounded"
            title="Expand Manufacturing"
          >
            <PanelRight className="size-4 text-orange-400" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-zinc-900">
      <div className="px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-orange-400" />
            <h2 className="font-medium">Manufacturing Analysis</h2>
          </div>
          <button
            onClick={() => setRightCollapsed(true)}
            className="p-1 hover:bg-zinc-800 rounded"
            title="Collapse Manufacturing"
          >
            <PanelRightClose className="size-4" />
          </button>
        </div>
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span>{errorCount} errors</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <span>{warningCount} warnings</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span>{successCount} passed</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {manufacturingIssues.map((issue) => (
          <IssueItem key={issue.id} issue={issue} />
        ))}
      </div>

      <div className="p-4 border-t border-zinc-800 space-y-2">
        <button className="w-full px-3 py-2 text-sm bg-orange-600 hover:bg-orange-700 rounded">
          Generate Mold Design
        </button>
        <button className="w-full px-3 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded">
          Export Analysis Report
        </button>
      </div>
    </div>
  )
}
