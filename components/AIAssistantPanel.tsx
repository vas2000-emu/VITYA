'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Check,
  X,
  PanelRightClose,
  PanelRight,
  Sparkles,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useLiveDfmScore } from './viewport/useLiveDfmScore'
import { getDashboardAnalysis } from '@/lib/mockMoldAnalysis'
import { runFullAnalysis } from '@/lib/moldsim-api'
import { generateCustomPartReport } from '@/lib/aiReport'
import { useResultsStore } from '@/store/useResultsStore'
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

type IssueHint = { severity: string; category: string; issue: string; recommendation: string }

/** Returns 4 chat quick-prompts tailored to the live DFM issues. The
 *  first prompt targets the worst current issue when one exists. */
function buildDynamicQuickPrompts(issues: IssueHint[]): { label: string; prompt: string }[] {
  const actionable = issues.filter((i) => i.severity !== 'info')
  const worst = actionable.find((i) => i.severity === 'critical') ?? actionable[0]

  const first: { label: string; prompt: string } = worst
    ? {
        label: `Fix ${worst.category}`,
        prompt: `The part has a ${worst.category} issue: "${worst.issue}". Recommendation: "${worst.recommendation}". Propose a concrete fix using the propose_design_change tool.`,
      }
    : {
        label: 'Suggest improvements',
        prompt:
          "Look at the current part and propose 2-3 specific changes that would improve moldability or cost. Use the propose_design_change tool — don't just describe.",
      }

  return [
    first,
    {
      label: 'Reduce cost',
      prompt: 'What single change would most reduce the per-part cost without hurting quality? Propose it.',
    },
    {
      label: 'Find shops',
      prompt: "I'm in 49503. Which local shops could build this part? Use the find_local_shops tool.",
    },
    {
      label: 'New part',
      prompt: 'Make me a new part — a [describe what you want].',
    },
  ]
}

/** Generates up to 3 DesignProposal cards from live DFM issues without
 *  an AI round-trip. Each proposal maps to a concrete DesignChange so
 *  the user can accept it immediately. Falls back to scale/material
 *  suggestions when no actionable issues exist. */
function generateRuleBasedSuggestions(
  issues: IssueHint[],
  sp: {
    wallThickness: number
    minDraftAngle: number
    numCavities: number
    productionQuantity: number
    material: string
    partLength: number
    partWidth: number
    partHeight: number
  },
): DesignProposal[] {
  const out: DesignProposal[] = []
  let n = Date.now()
  const uid = () => `rule-${n++}`

  const wallIssue = issues.find((i) => i.category === 'Wall Thickness')
  if (wallIssue) {
    if (wallIssue.issue.toLowerCase().includes('thin')) {
      out.push({
        id: uid(),
        title: 'Increase wall thickness',
        rationale: wallIssue.recommendation,
        changes: [{ field: 'wallThickness', value: Math.max(1.2, sp.wallThickness * 1.5) }],
        status: 'pending',
      })
    } else if (wallIssue.issue.toLowerCase().includes('thick')) {
      out.push({
        id: uid(),
        title: 'Core out thick walls',
        rationale: wallIssue.recommendation,
        changes: [{ field: 'wallThickness', value: Math.min(sp.wallThickness * 0.75, 4.5) }],
        status: 'pending',
      })
    } else {
      out.push({
        id: uid(),
        title: 'Optimize wall thickness',
        rationale: wallIssue.recommendation,
        changes: [{ field: 'wallThickness', value: 2.5 }],
        status: 'pending',
      })
    }
  }

  const draftIssue = issues.find((i) => i.category === 'Draft Angle')
  if (draftIssue) {
    out.push({
      id: uid(),
      title: 'Increase draft angle',
      rationale: draftIssue.recommendation,
      changes: [{ field: 'minDraftAngle', value: Math.max(2, sp.minDraftAngle + 1.5) }],
      status: 'pending',
    })
  }

  const sizeIssue = issues.find((i) => i.category === 'Part Size')
  if (sizeIssue && out.length < 3) {
    out.push({
      id: uid(),
      title: 'Reduce part dimensions',
      rationale: sizeIssue.recommendation,
      changes: [
        { field: 'partLength', value: Math.round(sp.partLength * 0.75) },
        { field: 'partWidth', value: Math.round(sp.partWidth * 0.75) },
      ],
      status: 'pending',
    })
  }

  const hasCostlyComplexity = issues.some(
    (i) =>
      ['Undercuts', 'Corner Radii', 'Wall Uniformity', 'Aspect Ratio'].includes(i.category) &&
      i.severity !== 'info',
  )
  if (hasCostlyComplexity && out.length < 3) {
    out.push({
      id: uid(),
      title: 'Scale production to offset tooling cost',
      rationale:
        'Geometric complexity raises tooling costs. Increasing cavity count and production volume spreads the fixed cost, reducing per-part price.',
      changes: [
        { field: 'numCavities', value: Math.max(sp.numCavities, 2) },
        { field: 'productionQuantity', value: Math.max(sp.productionQuantity, 50000) },
      ],
      status: 'pending',
    })
  }

  // Fallbacks for well-optimized parts
  if (out.length === 0) {
    if (sp.numCavities < 4) {
      out.push({
        id: uid(),
        title: 'Scale up production',
        rationale:
          'The part is well-optimized for molding. Adding cavities reduces per-part cost by running multiple parts per cycle.',
        changes: [
          { field: 'numCavities', value: 4 },
          { field: 'productionQuantity', value: 100000 },
        ],
        status: 'pending',
      })
    }
    out.push({
      id: uid(),
      title: sp.material !== 'ABS' ? 'Upgrade to ABS' : 'Switch to PP for lower cost',
      rationale:
        sp.material !== 'ABS'
          ? 'With strong moldability, upgrading to ABS adds impact resistance and a better surface finish without redesign.'
          : 'Polypropylene offers excellent chemical resistance at a lower material cost than ABS, with good moldability for this geometry.',
      changes: [{ field: 'material', value: sp.material !== 'ABS' ? 'ABS' : 'PP' }],
      status: 'pending',
    })
  }

  return out.slice(0, 3)
}

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
    setAiPartSuggestions,
    applyDesignProposal,
  } = useAppStore()

  const setAnalysis = useResultsStore((s) => s.setAnalysis)

  const { issues: liveIssues, score: liveScore } = useLiveDfmScore()

  // Friendly part identity for the AI context.
  const partEntry = getDashboardAnalysis(currentPartId as PartId)
  const partName = uploadedSTL
    ? 'User-uploaded STL'
    : partEntry?.partName ?? currentPartId
  const partSummary = uploadedSTL ? undefined : partEntry?.partSummary

  const handleAcceptProposal = (messageId: string, proposal: DesignProposal) => {
    applyDesignProposal(proposal)
    const msg = chatMessages.find((m) => m.id === messageId)
    if (msg?.proposals) {
      updateChatMessage(messageId, {
        proposals: msg.proposals.map((p) =>
          p.id === proposal.id ? { ...p, status: 'accepted' as const } : p,
        ),
      })
    } else {
      updateChatMessage(messageId, { proposal: { ...proposal, status: 'accepted' } })
    }
  }

  const handleRejectProposal = (messageId: string, proposal: DesignProposal) => {
    const msg = chatMessages.find((m) => m.id === messageId)
    if (msg?.proposals) {
      updateChatMessage(messageId, {
        proposals: msg.proposals.map((p) =>
          p.id === proposal.id ? { ...p, status: 'rejected' as const } : p,
        ),
      })
    } else {
      updateChatMessage(messageId, { proposal: { ...proposal, status: 'rejected' } })
    }
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

      // Fire the rich-text report generator in the background. The
      // dashboard's MoldAnalysisResult gets replaced with AI-written
      // issues so the user can read concrete fixes in plain English
      // instead of seeing the previously-loaded demo part's content.
      const report = await generateCustomPartReport({
        partId,
        partName: spec.label,
        partDescription: spec.description,
        material: spec.material,
        partLength: spec.partLength,
        partWidth: spec.partWidth,
        partHeight: spec.partHeight,
        wallThickness: spec.wallThickness,
        minDraftAngle: 2,
        results,
      })
      if (report) setAnalysis(report)
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
            dfmScore: liveScore,
            dfmIssues: liveIssues.map((i) => ({
              severity: i.severity,
              category: i.category,
              issue: i.issue,
              recommendation: i.recommendation,
            })),
          },
        }),
      })
      const data = (await res.json()) as {
        reply?: string
        proposal?: DesignProposal
        proposals?: DesignProposal[]
        customPart?: CustomPartSpec
        error?: string
      }
      if (!res.ok) {
        addChatMessage({
          role: 'assistant',
          content: `Couldn't reach the model: ${data.error ?? res.statusText}`,
        })
      } else {
        const incomingProposals = data.proposals ?? (data.proposal ? [data.proposal] : [])
        addChatMessage({
          role: 'assistant',
          content: data.reply ?? '(no response)',
          // Single proposal stays on the message directly; multiple go in the
          // proposals array so ChatBubble can render a card per proposal.
          ...(incomingProposals.length === 1
            ? { proposal: incomingProposals[0] }
            : incomingProposals.length > 1
              ? { proposals: incomingProposals }
              : {}),
        })
        // Sync proposals to the toolbar ribbon so they're accessible
        // from the AI Optimizations tab without reopening the panel.
        if (incomingProposals.length > 0) {
          setAiPartSuggestions({ partId: currentPartId, items: incomingProposals, loading: false, error: null })
        }
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

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {chatMessages.length === 0 && !isAiThinking ? (
          <div className="border border-dashed border-zinc-700 rounded-lg p-6 text-center mt-4">
            <Sparkles className="size-5 text-blue-300/60 mx-auto mb-2" />
            <div className="text-sm text-zinc-500">
              Ask the AI to suggest improvements, reduce cost, or create a new part
            </div>
          </div>
        ) : (
          <>
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
          </>
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
          {buildDynamicQuickPrompts(liveIssues).map((q) => (
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
      {message.proposals?.map((p) => (
        <ProposalCard
          key={p.id}
          proposal={p}
          onAccept={() => onAcceptProposal?.(message.id, p)}
          onReject={() => onRejectProposal?.(message.id, p)}
        />
      ))}
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
