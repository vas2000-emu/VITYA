// ---------------------------------------------------------------------------
// IBM Orchestrate — response adapter
// ---------------------------------------------------------------------------
// Converts a raw IBM API response into the shapes VITYA's UI understands:
//   - OrchestrateAgentResponse  →  used by the API route
//   - AISuggestion[]            →  dropped straight into the Zustand store
//   - applyOperation()          →  called on Accept to update store params
// ---------------------------------------------------------------------------

import type { IBMRawResponse, OrchestrateAgentResponse, OrchestrateSuggestion } from './types'
import type { AISuggestion, Operation } from '@/lib/types'

// ── Raw response → normalised agent response ─────────────────────────────────

export function parseIBMResponse(raw: IBMRawResponse): OrchestrateAgentResponse {
  // Try to extract plain text from the various IBM response shapes
  let rawText =
    raw.text ??
    raw.result?.message ??
    raw.output?.generic?.find((g) => g.response_type === 'text')?.text ??
    ''

  // The agent is prompted to embed a JSON block inside its reply when it has
  // suggestions. Try to parse it out.
  const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]) as Partial<OrchestrateAgentResponse>
      return {
        reply: parsed.reply ?? rawText.replace(jsonMatch[0], '').trim(),
        suggestions: parsed.suggestions ?? [],
      }
    } catch {
      // JSON was malformed — fall through to plain-text path
    }
  }

  // No JSON block found — plain chat reply, no suggestions
  return { reply: rawText, suggestions: [] }
}

// ── OrchestrateSuggestion → AISuggestion (Zustand store shape) ───────────────

export function toAISuggestion(s: OrchestrateSuggestion): AISuggestion {
  const operations: Operation[] = s.operations.map((op, i) => ({
    id: `${s.id}-op-${i}`,
    type: op.type,
    feature: op.feature,
    description: op.description,
    parameters: op.parameters,
  }))

  return {
    id: s.id,
    title: s.title,
    description: s.description,
    operations,
    status: 'pending',
  }
}

// ── Apply an accepted operation to the Zustand store ─────────────────────────
// Import and call this from AIAssistantPanel when the user clicks Accept.
//
// Parameter IDs that are currently in the store:
//   width, length, height, holeDiameter, wallThickness, filletRadius
//
// The agent is prompted to use these exact IDs in its operation.parameters.

export function applyOperation(
  operation: Operation,
  updateParameterValue: (id: string, value: number) => void
): void {
  if (!operation.parameters) return
  for (const [paramId, rawValue] of Object.entries(operation.parameters)) {
    const value = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue))
    if (!isNaN(value)) {
      updateParameterValue(paramId, value)
    }
  }
}
