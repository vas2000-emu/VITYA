'use client'

import { useState } from 'react'
import {
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  PanelRightClose,
  PanelRight,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { AISuggestion, Operation, OperationType } from '@/lib/types'

const operationColors: Record<OperationType, string> = {
  add: 'text-green-400',
  modify: 'text-blue-400',
  delete: 'text-red-400',
}

const operationSymbols: Record<OperationType, string> = {
  add: '+',
  modify: '~',
  delete: '-',
}

interface OperationItemProps {
  operation: Operation
  onPreview: () => void
}

function OperationItem({ operation, onPreview }: OperationItemProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/50">
      <div
        className="flex items-start gap-2 p-3 cursor-pointer hover:bg-zinc-800/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`mt-0.5 font-mono text-sm ${operationColors[operation.type]}`}>
          {operationSymbols[operation.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{operation.feature}</div>
          <div className="text-xs text-zinc-400 mt-0.5">{operation.description}</div>
        </div>
        <button className="p-1 hover:bg-zinc-700 rounded">
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
      </div>

      {expanded && operation.parameters && (
        <div className="px-3 pb-3 pt-0 border-t border-zinc-800 bg-zinc-950/50">
          <div className="text-xs text-zinc-500 mb-2 mt-2">Parameters:</div>
          <div className="space-y-1">
            {Object.entries(operation.parameters).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400">{key}</span>
                <span className="text-blue-400">{JSON.stringify(value)}</span>
              </div>
            ))}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPreview()
            }}
            className="w-full mt-3 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 rounded"
          >
            Preview Change
          </button>
        </div>
      )}
    </div>
  )
}

interface SuggestionCardProps {
  suggestion: AISuggestion
  onAccept: (id: string) => void
  onReject: (id: string) => void
  onPreview: (id: string) => void
}

function SuggestionCard({ suggestion, onAccept, onReject, onPreview }: SuggestionCardProps) {
  const [expanded, setExpanded] = useState(true)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'previewing':
        return <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">Previewing</span>
      case 'accepted':
        return <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">Accepted</span>
      case 'rejected':
        return <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">Rejected</span>
      default:
        return null
    }
  }

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium">{suggestion.title}</h3>
              {getStatusBadge(suggestion.status)}
            </div>
            <p className="text-sm text-zinc-400">{suggestion.description}</p>
          </div>
          <button className="p-1 hover:bg-zinc-800 rounded">
            <MoreHorizontal className="size-4" />
          </button>
        </div>

        <div
          className="flex items-center gap-2 mb-3 text-xs text-zinc-400 cursor-pointer hover:text-zinc-300"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          <span>{suggestion.operations.length} operations</span>
        </div>

        {expanded && (
          <div className="space-y-2 mb-4">
            {suggestion.operations.map((op) => (
              <OperationItem
                key={op.id}
                operation={op}
                onPreview={() => onPreview(suggestion.id)}
              />
            ))}
          </div>
        )}

        <div className="flex gap-2">
          {suggestion.status === 'pending' && (
            <button
              onClick={() => onPreview(suggestion.id)}
              className="flex-1 px-3 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded"
            >
              Preview
            </button>
          )}
          {suggestion.status === 'previewing' && (
            <>
              <button
                onClick={() => onReject(suggestion.id)}
                className="flex-1 px-3 py-2 text-sm bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded flex items-center justify-center gap-2"
              >
                <X className="size-4" />
                Reject
              </button>
              <button
                onClick={() => onAccept(suggestion.id)}
                className="flex-1 px-3 py-2 text-sm bg-green-600 hover:bg-green-700 rounded flex items-center justify-center gap-2"
              >
                <Check className="size-4" />
                Accept
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function AIAssistantPanel() {
  const [message, setMessage] = useState('')
  const {
    aiSuggestions,
    acceptSuggestion,
    rejectSuggestion,
    previewSuggestion,
    rightCollapsed,
    setRightCollapsed,
  } = useAppStore()

  if (rightCollapsed) {
    return (
      <div className="h-full flex flex-col bg-zinc-900 w-12">
        <div className="flex flex-col items-center py-3 border-b border-zinc-800">
          <button
            onClick={() => setRightCollapsed(false)}
            className="p-2 hover:bg-zinc-800 rounded"
            title="Expand AI Assistant"
          >
            <PanelRight className="size-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-zinc-900">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h2 className="font-medium">AI Assistant</h2>
        <button
          onClick={() => setRightCollapsed(true)}
          className="p-1 hover:bg-zinc-800 rounded"
          title="Collapse AI Assistant"
        >
          <PanelRightClose className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-sm text-zinc-400 mb-4">
          AI suggestions based on design analysis and manufacturing requirements.
        </div>

        {aiSuggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            onAccept={acceptSuggestion}
            onReject={rejectSuggestion}
            onPreview={previewSuggestion}
          />
        ))}

        <div className="border border-dashed border-zinc-700 rounded-lg p-6 text-center">
          <div className="text-sm text-zinc-500">AI will suggest optimizations as you work</div>
        </div>
      </div>

      <div className="p-4 border-t border-zinc-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask AI to modify the design..."
            className="flex-1 px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded outline-none focus:border-blue-500"
          />
          <button className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded">
            Send
          </button>
        </div>
        <div className="flex gap-2 mt-2">
          <button className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded">
            Add fillet
          </button>
          <button className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded">
            Check draft
          </button>
          <button className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded">
            Optimize
          </button>
        </div>
      </div>
    </div>
  )
}
