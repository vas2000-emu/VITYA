'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ThumbsUp,
  ThumbsDown,
  Check,
  X,
  PanelRightClose,
  PanelRight,
  Sparkles,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { getDashboardAnalysis } from '@/lib/mockMoldAnalysis'
import { runFullAnalysis } from '@/lib/moldsim-api'
import type {
  ChatMessage,
  CustomPartSpec,
  DesignChange,
  DesignField,
  DesignProposal,
  PartId,
} from '@/lib/types'

/** Human-readable labels for every field the AI can propose. Keep in
 *  sync with DesignField in lib/types.ts. */
const FIELD_LABELS: Record<DesignField, string> = {
  wallThickness: 'Wall thickness',
  minDraftAngle: 'Min draft angle',
  partLength: 'Length',
  partWidth: 'Width',
  partHeight: 'Height',
  material: 'Material',
  numCavities: 'Mold cavities',
  productionQuantity: 'Production qty',
}

/** Display units for the proposal card. The engine + system prompt +
 *  tool schema all speak mm internally; the card converts at render
 *  time only. Material / cavities / quantity have no unit. */
const FIELD_UNITS: Record<DesignField, string> = {
  wallThickness: 'in',
  minDraftAngle: 'deg',
  partLength: 'in',
  partWidth: 'in',
  partHeight: 'in',
  material: '',
  numCavities: '',
  productionQuantity: 'units',
}

const MM_PER_INCH_AI = 25.4
const INCH_FIELDS: ReadonlySet<DesignField> = new Set([
  'wallThickness',
  'partLength',
  'partWidth',
  'partHeight',
])

/** Convert the AI's underlying value to the format the proposal card
 *  shows. Length / wall in mm → inches, integer-style fields render
 *  without decimals, material renders as the raw string. */
function formatChangeValue(field: DesignField, value: number | string): string {
  if (field === 'material') return String(value)
  if (typeof value !== 'number') return String(value)
  if (INCH_FIELDS.has(field)) {
    const inches = value / MM_PER_INCH_AI
    return inches < 10 ? inches.toFixed(3) : inches.toFixed(1)
  }
  if (field === 'productionQuantity') return value.toLocaleString()
  return value.toString()
}

/** Inverse of ParameterPanel's paramToSimulationKey. Only the design
 *  parameters that have a row in the left-hand Parameters panel get a
 *  mapping; material / numCavities / productionQuantity are only in
 *  simulationParams (not in `parameters[]`), so the accept handler
 *  skips updateParameterValue for those. */
const FIELD_TO_PARAM_ID: Partial<Record<DesignField, string>> = {
  wallThickness: 'p-wall',
  minDraftAngle: 'p-draft',
  partLength: 'p-len',
  partWidth: 'p-wid',
  partHeight: 'p-height',
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

export function AIAssistantPanel() {
  const [message, setMessage] = useState('')
  const {
    rightCollapsed,
    setRightCollapsed,
    chatMessages,
    isAiThinking,
    addChatMessage,
    updateChatMessage,
    setAiThinking,
    simulationParams,
    updateSimulationParams,
    setSimulationBaseline,
    setSimulationResults,
    updateParameterValue,
    currentPartId,
    setCurrentPartId,
    uploadedSTL,
    setUploadedSTL,
    setCustomPartSpec,
    addUserPart,
  } = useAppStore()

  // Dynamic suggestion-card state. Populated on mount via a single
  // /api/ai/chat call with intent='suggestions'; the model emits 2-3
  // separate propose_design_change tool calls covering different
  // improvement angles, and we render each as a ProposalCard.
  const [suggestions, setSuggestions] = useState<DesignProposal[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null)
  // Guard the on-mount fetch so React StrictMode's double-invoke (or a
  // currentPartId effect re-fire) doesn't trigger two concurrent calls.
  const suggestionsFetchedFor = useRef<string | null>(null)

  // Friendly part identity for the AI context. partsLibrary has hero
  // names + a one-line summary for each of the 4 demo parts; uploaded
  // STLs aren't in the library so we fall back to a generic label.
  const partEntry = getDashboardAnalysis(currentPartId as PartId)
  const partName = uploadedSTL
    ? 'User-uploaded STL'
    : partEntry?.partName ?? currentPartId
  const partSummary = uploadedSTL ? undefined : partEntry?.partSummary

  // Snapshot the live part state into the AI context payload. Memoized
  // via the explicit dep list rather than useMemo since it's only
  // built at call-time inside sendMessage / fetchSuggestions.
  const buildContext = useCallback(
    () => ({
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
    }),
    [currentPartId, partName, partSummary, simulationParams],
  )

  const fetchSuggestions = useCallback(async () => {
    setSuggestionsLoading(true)
    setSuggestionsError(null)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content:
                'Generate 2-3 distinct design optimizations for the current part. Each one should target a different angle (e.g. moldability, cost, material). Return them as separate propose_design_change tool calls.',
            },
          ],
          context: buildContext(),
          intent: 'suggestions',
        }),
      })
      const data = (await res.json()) as {
        proposals?: DesignProposal[]
        proposal?: DesignProposal
        error?: string
      }
      if (!res.ok) {
        setSuggestionsError(data.error ?? `HTTP ${res.status}`)
        setSuggestions([])
        return
      }
      // Model may collapse to a single proposal; accept either shape.
      const next = data.proposals ?? (data.proposal ? [data.proposal] : [])
      setSuggestions(next)
    } catch (err) {
      setSuggestionsError(err instanceof Error ? err.message : 'Network error')
      setSuggestions([])
    } finally {
      setSuggestionsLoading(false)
    }
  }, [buildContext])

  // Fetch one set of suggestions per part. Switching parts re-fetches;
  // edits within the same part don't (user can hit Regenerate).
  useEffect(() => {
    if (suggestionsFetchedFor.current === currentPartId) return
    suggestionsFetchedFor.current = currentPartId
    void fetchSuggestions()
  }, [currentPartId, fetchSuggestions])

  const handleAcceptSuggestion = (proposal: DesignProposal) => {
    const patch: Record<string, number | string> = {}
    for (const change of proposal.changes) {
      patch[change.field] = change.value
      const paramId = FIELD_TO_PARAM_ID[change.field]
      if (paramId && typeof change.value === 'number') {
        updateParameterValue(paramId, change.value)
      }
    }
    updateSimulationParams(patch)
    setSuggestions((current) =>
      current.map((p) => (p.id === proposal.id ? { ...p, status: 'accepted' } : p)),
    )
  }

  const handleRejectSuggestion = (proposal: DesignProposal) => {
    setSuggestions((current) =>
      current.map((p) => (p.id === proposal.id ? { ...p, status: 'rejected' } : p)),
    )
  }

  /** Apply a proposal's changes. simulationParams drives the 3D
   *  geometry, the live DFM score, and the analysis pages — one
   *  updateSimulationParams call fans out to all of those. But the
   *  left-hand Parameters panel reads from the separate `parameters[]`
   *  array, so we also have to call updateParameterValue per change so
   *  the panel's displayed number matches what was actually applied
   *  downstream. */
  const handleAcceptProposal = (messageId: string, proposal: DesignProposal) => {
    // Accumulator covers both number-valued fields (dimensions, draft,
    // cavities, qty) and string-valued ones (material). Cast at the
    // dispatch boundary; updateSimulationParams takes Partial<SimulationParams>.
    const patch: Record<string, number | string> = {}
    for (const change of proposal.changes) {
      patch[change.field] = change.value
      const paramId = FIELD_TO_PARAM_ID[change.field]
      // Only mirror into parameters[] when there's a row for it in the
      // panel. material / numCavities / productionQuantity live only in
      // simulationParams and skip this step.
      if (paramId && typeof change.value === 'number') {
        updateParameterValue(paramId, change.value)
      }
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

  /** Apply a CustomPartSpec emitted by create_part_from_description.
   *  Registers the spec in the user-parts registry (so it shows up in
   *  the sidebar + part library), points the viewport at it, mirrors
   *  the spec's dimensions into simulationParams + the Parameters
   *  panel, then fires the moldsim API so every workspace surface
   *  lights up. */
  const applyCustomPart = async (spec: CustomPartSpec) => {
    // Clear any uploaded STL so the viewport shows the procedural part
    // we're about to register, not the stale STL geometry.
    if (uploadedSTL) {
      URL.revokeObjectURL(uploadedSTL)
      setUploadedSTL(null)
    }
    // Register the part in the library FIRST so it appears in the
    // sidebar / parts ribbon even if the analysis API call below fails.
    // currentPartId == the user-part id so the sidebar's "active"
    // highlight matches; the viewport branches on customPartSpec
    // presence (see Part.tsx) rather than the string id.
    const partId = `user-${Date.now()}`
    addUserPart({
      id: partId,
      kind: 'ai-created',
      label: spec.label,
      description: spec.description,
      spec,
      createdAt: Date.now(),
    })
    setCustomPartSpec(spec)
    setCurrentPartId(partId)

    // Thin-shell volume / weight proxy, same approach the upload modal uses.
    const volCm3 =
      (spec.partLength * spec.partWidth * spec.partHeight * spec.wallThickness) /
      1_000_000
    const partVolume = Math.max(1, volCm3)
    const partWeight = Math.max(1, volCm3 * 1)
    const projectedArea = Math.max(1, (spec.partLength * spec.partHeight) / 100)

    setSimulationBaseline({
      material: spec.material,
      wallThickness: spec.wallThickness,
      partVolume,
      partWeight,
      projectedArea,
      partLength: spec.partLength,
      partWidth: spec.partWidth,
      partHeight: spec.partHeight,
    })
    updateSimulationParams({
      material: spec.material,
      wallThickness: spec.wallThickness,
      partVolume,
      partWeight,
      projectedArea,
      partLength: spec.partLength,
      partWidth: spec.partWidth,
      partHeight: spec.partHeight,
      complexity: 'moderate',
      minDraftAngle: 2,
      productionQuantity: 10_000,
      meltTemp: 230,
      moldTemp: 50,
      numCavities: 1,
      numUndercuts: 0,
      hasSharpCorners: false,
      hasUniformWall: true,
    })
    updateParameterValue('p-len', spec.partLength)
    updateParameterValue('p-wid', spec.partWidth)
    updateParameterValue('p-height', spec.partHeight)
    updateParameterValue('p-wall', spec.wallThickness)
    updateParameterValue('p-draft', 2)

    setSimulationResults({ isLoading: true, error: null })
    try {
      const results = await runFullAnalysis({
        material: spec.material,
        wall_thickness: spec.wallThickness,
        part_volume: partVolume,
        part_weight: partWeight,
        projected_area: projectedArea,
        part_length: spec.partLength,
        part_width: spec.partWidth,
        part_height: spec.partHeight,
        melt_temp: 230,
        mold_temp: 50,
        production_quantity: 10_000,
        complexity: 'moderate',
        num_cavities: 1,
        num_undercuts: 0,
        min_draft_angle: 2,
        has_sharp_corners: false,
        has_uniform_wall: true,
      })
      setSimulationResults({
        cost: results.cost,
        cooling: results.cooling,
        dfm: results.manufacturing,
        filling: results.filling,
        isLoading: false,
        error: null,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to analyze new part'
      setSimulationResults({ isLoading: false, error: msg })
    }
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
      const data = (await res.json()) as {
        reply?: string
        proposal?: DesignProposal
        customPart?: CustomPartSpec
        error?: string
      }
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
        // create_part_from_description short-circuits on the server and
        // returns a CustomPartSpec. Apply it asynchronously so the chat
        // bubble paints before the geometry swap kicks off.
        if (data.customPart) {
          void applyCustomPart(data.customPart)
        }
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
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <Sparkles className="size-4 text-blue-300" />
            <span className="font-medium">Suggested optimizations</span>
            {suggestionsLoading && <Loader2 className="size-3 animate-spin text-zinc-500" />}
          </div>
          <button
            type="button"
            onClick={() => void fetchSuggestions()}
            disabled={suggestionsLoading}
            title="Regenerate optimizations"
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded disabled:opacity-40"
          >
            <RefreshCw className={`size-3 ${suggestionsLoading ? 'animate-spin' : ''}`} />
            Regenerate
          </button>
        </div>

        {suggestionsError && (
          <div className="text-xs px-3 py-2 rounded border border-rose-500/30 bg-rose-500/10 text-rose-200">
            Couldn&apos;t generate suggestions: {suggestionsError}
          </div>
        )}

        {!suggestionsLoading && !suggestionsError && suggestions.length === 0 && (
          <div className="border border-dashed border-zinc-700 rounded-lg p-4 text-center">
            <div className="text-xs text-zinc-500">
              No suggestions yet. Hit Regenerate to ask the AI.
            </div>
          </div>
        )}

        {suggestions.map((proposal) => (
          <ProposalCard
            key={proposal.id}
            proposal={proposal}
            onAccept={() => handleAcceptSuggestion(proposal)}
            onReject={() => handleRejectSuggestion(proposal)}
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
        {formatChangeValue(change.field, change.value)} {unit}
      </span>
    </li>
  )
}
