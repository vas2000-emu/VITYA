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
import { partsLibrary } from '@/lib/mockMoldAnalysis'
import type {
  AISuggestion,
  ChatMessage,
  DesignChange,
  DesignField,
  DesignProposal,
  Operation,
  OperationType,
  PartId,
} from '@/lib/types'

/** Human-readable labels for the parameter fields the AI can propose
 *  changes to. Keep these in sync with DesignField in lib/types.ts.
 *  Part length / width / height are intentionally excluded so the AI
 *  can only propose manufacturing-side changes. */
const FIELD_LABELS: Record<DesignField, string> = {
  wallThickness: 'Wall thickness',
  minDraftAngle: 'Min draft angle',
}

const FIELD_UNITS: Record<DesignField, string> = {
  wallThickness: 'mm',
  minDraftAngle: 'deg',
}

/** Inverse of ParameterPanel's paramToSimulationKey. simulationParams is
 *  the source of truth for the 3D geometry / DFM scoring, but the
 *  left-hand Parameters panel reads from the separate `parameters[]`
 *  array, so an accepted proposal has to write to both. */
const FIELD_TO_PARAM_ID: Record<DesignField, string> = {
  wallThickness: 'p-wall',
  minDraftAngle: 'p-draft',
}

const QUICK_PROMPTS: { label: string; prompt: string }[] = [
  {
    label: 'Add fillet',
    prompt: 'How should I add fillets to the sharp edges of this part?',
  },
  {
    label: 'Check draft',
    prompt: 'Are the draft angles on this part sufficient for clean ejection?',
  },
  {
    label: 'Explain the mold',
    prompt:
      'Walk me through the mold for this part — cavity, core, parting line, and gate. What should I be thinking about?',
  },
  {
    label: 'Find local shops',
    prompt:
      'Once this part is design-ready, which local shops could build it? My ZIP is 49503.',
  },
]

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
    chatMessages,
    isAiThinking,
    addChatMessage,
    updateChatMessage,
    setAiThinking,
    simulationParams,
    updateSimulationParams,
    updateParameterValue,
    currentPartId,
    uploadedSTL,
  } = useAppStore()

  // Friendly part identity for the AI context. partsLibrary has hero
  // names + a one-line summary for each of the 4 demo parts; uploaded
  // STLs aren't in the library so we fall back to a generic label.
  const partEntry = partsLibrary[currentPartId as PartId]
  const partName = uploadedSTL
    ? 'User-uploaded STL'
    : partEntry?.partName ?? currentPartId
  const partSummary = uploadedSTL ? undefined : partEntry?.partSummary

  /** Apply a proposal's changes. simulationParams drives the 3D
   *  geometry, the live DFM score, and the analysis pages — one
   *  updateSimulationParams call fans out to all of those. But the
   *  left-hand Parameters panel reads from the separate `parameters[]`
   *  array, so we also have to call updateParameterValue per change so
   *  the panel's displayed number matches what was actually applied
   *  downstream. */
  const handleAcceptProposal = (messageId: string, proposal: DesignProposal) => {
    const patch: Record<string, number> = {}
    for (const change of proposal.changes) {
      patch[change.field] = change.value
      updateParameterValue(FIELD_TO_PARAM_ID[change.field], change.value)
    }
    updateSimulationParams(patch)
    updateChatMessage(messageId, {
      proposal: { ...proposal, status: 'accepted' },
    })
  }

  const handleRejectProposal = (messageId: string, proposal: DesignProposal) => {
    updateChatMessage(messageId, {
      proposal: { ...proposal, status: 'rejected' },
    })
  }

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? message).trim()
    if (!text || isAiThinking) return
    setMessage('')

    const userMsg = { role: 'user' as const, content: text }
    addChatMessage(userMsg)
    setAiThinking(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...chatMessages.map(({ role, content }) => ({ role, content })),
            userMsg,
          ],
          // Snapshot the part state so the model can quote real numbers
          // (e.g. "your bumper's wall is 3 mm; drop to 2.5 mm to...").
          // partName + partSummary give the model identity so it can
          // refer to the part by name instead of "the part".
          context: {
            partId: currentPartId,
            partName,
            partSummary,
            material: simulationParams.material,
            wallThickness: simulationParams.wallThickness,
            minDraftAngle: simulationParams.minDraftAngle,
            partLength: simulationParams.partLength,
            partWidth: simulationParams.partWidth,
            partHeight: simulationParams.partHeight,
            numUndercuts: simulationParams.numUndercuts,
          },
        }),
      })
      const data = await res.json() as { reply?: string; proposal?: DesignProposal; error?: string }
      if (!res.ok) {
        addChatMessage({
          role: 'assistant',
          content: `Couldn't reach the model: ${data.error ?? res.statusText}`,
        })
      } else {
        addChatMessage({
          role: 'assistant',
          content: data.reply ?? '(no response)',
          proposal: data.proposal,
        })
      }
    } catch {
      addChatMessage({
        role: 'assistant',
        content: 'Network error — try again in a moment.',
      })
    } finally {
      setAiThinking(false)
    }
  }

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

        {chatMessages.length === 0 && !isAiThinking ? (
          <div className="border border-dashed border-zinc-700 rounded-lg p-6 text-center">
            <div className="text-sm text-zinc-500">
              AI will suggest optimizations as you work
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {chatMessages.map((m) => (
              <ChatBubble
                key={m.id}
                message={m}
                onAcceptProposal={handleAcceptProposal}
                onRejectProposal={handleRejectProposal}
              />
            ))}
            {isAiThinking && (
              <ChatBubble
                message={{ id: 'thinking', role: 'assistant', content: 'Thinking…' }}
                muted
              />
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-zinc-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void sendMessage()
              }
            }}
            placeholder="Ask AI to modify the design..."
            disabled={isAiThinking}
            className="flex-1 px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded outline-none focus:border-blue-500 disabled:opacity-60"
          />
          <button
            onClick={() => void sendMessage()}
            disabled={isAiThinking || !message.trim()}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded"
          >
            {isAiThinking ? '…' : 'Send'}
          </button>
        </div>
        <div className="flex gap-2 mt-2">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q.label}
              onClick={() => void sendMessage(q.prompt)}
              disabled={isAiThinking}
              className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed rounded"
              title={q.prompt}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ChatBubble({
  message,
  muted,
  onAcceptProposal,
  onRejectProposal,
}: {
  message: ChatMessage
  muted?: boolean
  onAcceptProposal?: (messageId: string, proposal: DesignProposal) => void
  onRejectProposal?: (messageId: string, proposal: DesignProposal) => void
}) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[85%] px-3 py-2 rounded-lg text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-blue-600 text-white'
            : muted
            ? 'bg-zinc-800 text-zinc-500 italic'
            : 'bg-zinc-800 text-zinc-100'
        }`}
      >
        {message.content}
      </div>
      {message.proposal && (
        <ProposalCard
          proposal={message.proposal}
          onAccept={() => onAcceptProposal?.(message.id, message.proposal!)}
          onReject={() => onRejectProposal?.(message.id, message.proposal!)}
        />
      )}
    </div>
  )
}

/** Inline action card rendered under an assistant message that came
 *  with a propose_design_change tool call. Accept dispatches the
 *  changes into simulationParams (which rebuilds the geometry); reject
 *  just marks the proposal dismissed so the buttons disable. */
function ProposalCard({
  proposal,
  onAccept,
  onReject,
}: {
  proposal: DesignProposal
  onAccept: () => void
  onReject: () => void
}) {
  const isResolved = proposal.status !== 'pending'
  const statusBadge =
    proposal.status === 'accepted' ? (
      <span className="px-2 py-0.5 text-[10px] uppercase tracking-wide bg-green-500/20 text-green-300 rounded">
        Applied
      </span>
    ) : proposal.status === 'rejected' ? (
      <span className="px-2 py-0.5 text-[10px] uppercase tracking-wide bg-zinc-700 text-zinc-400 rounded">
        Dismissed
      </span>
    ) : null

  return (
    <div className="mt-2 max-w-[85%] w-full border border-blue-500/40 bg-blue-500/5 rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-blue-500/30 flex items-center justify-between gap-2">
        <div className="text-sm font-medium text-blue-200">{proposal.title}</div>
        {statusBadge}
      </div>
      <div className="px-3 py-2 space-y-2">
        <div className="text-xs text-zinc-400 leading-relaxed">{proposal.rationale}</div>
        <ul className="text-xs font-mono space-y-1">
          {proposal.changes.map((c) => (
            <ProposalChangeRow key={c.field} change={c} />
          ))}
        </ul>
      </div>
      {!isResolved && (
        <div className="px-3 py-2 border-t border-blue-500/30 flex gap-2">
          <button
            type="button"
            onClick={onReject}
            className="flex-1 px-2 py-1.5 text-xs bg-red-600/10 hover:bg-red-600/20 text-red-300 rounded flex items-center justify-center gap-1"
          >
            <X className="size-3" />
            Reject
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 px-2 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded flex items-center justify-center gap-1"
          >
            <Check className="size-3" />
            Accept
          </button>
        </div>
      )}
    </div>
  )
}

function ProposalChangeRow({ change }: { change: DesignChange }) {
  const label = FIELD_LABELS[change.field]
  const unit = FIELD_UNITS[change.field]
  return (
    <li className="flex items-center justify-between">
      <span className="text-zinc-400">{label}</span>
      <span className="text-blue-300">
        {change.value} {unit}
      </span>
    </li>
  )
}
