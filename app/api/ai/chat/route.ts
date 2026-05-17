import { NextRequest, NextResponse } from 'next/server'
import { findLocalShops } from '@/lib/localShops'
import { ALLOWED_MATERIALS, type AllowedMaterial, type DesignChange, type DesignField, type DesignProposal } from '@/lib/types'

// Server-side route — process.env.OPENAI_API_KEY is never sent to the
// browser. The frontend POSTs the conversation history here and gets
// back the assistant's reply. If you want to swap models, change the
// `model` string below; gpt-4o-mini is cheap and fast enough for demo.

const SYSTEM_PROMPT_BASE = `You are MoldLocal's AI design assistant. MoldLocal is a design-aid tool that helps people iterate on plastic parts toward something that's actually moldable — without paying for expert DFM consulting.

Your job is to help the designer understand and improve their part. Focus on injection-molding fundamentals: undercuts, draft angles, wall thickness, parting line, gate placement, cooling, ejection, tooling complexity, and how design choices affect cost and lead time. Be direct and conversational — no lecturing.

When the designer asks how to improve the part, or describes a problem you can fix with one of the design parameters below, call the propose_design_change tool with a short title, a one-sentence rationale, and the specific value(s) to set. Levers you can propose:
  - wallThickness (mm), minDraftAngle (degrees) — manufacturing-side
  - partLength / partWidth / partHeight (mm) — dimensions; only propose if the user explicitly asks to resize, or if the part won't fit a standard press
  - material — must be one of: ${ALLOWED_MATERIALS.join(', ')}
  - numCavities (integer, 1-32) — mold layout / batch lever
  - productionQuantity (integer) — run-size lever; affects cost amortization, not geometry

Include 1-3 changes per proposal. Always pair the tool call with a brief text reply explaining what you proposed. Don't propose changes for things outside this list (sharp corners, fillets, gate placement, hole positions).

If the designer's request is ambiguous or missing information you need to recommend a specific value (e.g. "make it stronger" without saying which dimension), ask one focused follow-up question first instead of guessing.

If the designer asks about local manufacturing options (e.g. "who can make this near me", "find a local shop", "where can I get this molded"), call the find_local_shops tool. Only call it on explicit request — don't push shops unprompted.

Answer in 2-3 sentences of plain English unless the user asks for more detail.`

/** Appended to SYSTEM_PROMPT_BASE when ChatRequestBody.intent === 'suggestions'.
 *  Tells the model to emit MULTIPLE distinct propose_design_change tool calls
 *  rather than a single conversational reply, so the panel can render the
 *  result as a row of independent suggestion cards. */
const SUGGESTIONS_ADDENDUM = `\n\nYou are being asked to generate a panel of design optimizations, not to chat. Emit 2-3 SEPARATE propose_design_change tool calls covering DIFFERENT angles (e.g. one for moldability, one for cost, one for material). Each call should be self-contained with its own title and rationale. Do not produce conversational text alongside the tool calls — the panel only renders the proposals.`

interface PartContext {
  partId?: string
  partName?: string
  partSummary?: string
  material?: string
  wallThickness?: number
  minDraftAngle?: number
  partLength?: number
  partWidth?: number
  partHeight?: number
  numUndercuts?: number
}

interface ChatRequestBody {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  /** Optional snapshot of the current simulationParams so the model
   *  can reference real values when proposing changes. */
  context?: PartContext
  /** 'chat' (default): normal conversational reply, maybe one inline
   *   proposal as a single tool call.
   *  'suggestions': the model is being asked to populate the
   *   suggestion-cards panel — emit multiple propose_design_change
   *   calls at once. Response is `{proposals: DesignProposal[]}`. */
  intent?: 'chat' | 'suggestions'
}

function buildSystemPrompt(ctx: PartContext | undefined, intent?: 'chat' | 'suggestions'): string {
  const addendum = intent === 'suggestions' ? SUGGESTIONS_ADDENDUM : ''
  if (!ctx) return SYSTEM_PROMPT_BASE + addendum

  const identity: string[] = []
  if (ctx.partName) identity.push(`The designer is currently working on: ${ctx.partName}.`)
  if (ctx.partSummary) identity.push(ctx.partSummary)
  identity.push('Refer to this part by name when relevant instead of "the part".')

  const params: string[] = []
  if (ctx.material) params.push(`material: ${ctx.material}`)
  if (typeof ctx.wallThickness === 'number') params.push(`wallThickness: ${ctx.wallThickness} mm`)
  if (typeof ctx.minDraftAngle === 'number') params.push(`minDraftAngle: ${ctx.minDraftAngle} deg`)
  if (typeof ctx.partLength === 'number') params.push(`partLength: ${ctx.partLength} mm`)
  if (typeof ctx.partWidth === 'number') params.push(`partWidth: ${ctx.partWidth} mm`)
  if (typeof ctx.partHeight === 'number') params.push(`partHeight: ${ctx.partHeight} mm`)
  if (typeof ctx.numUndercuts === 'number') params.push(`numUndercuts: ${ctx.numUndercuts}`)

  if (identity.length === 0 && params.length === 0) return SYSTEM_PROMPT_BASE + addendum

  const sections: string[] = [SYSTEM_PROMPT_BASE]
  if (identity.length > 0) sections.push(`Current part:\n${identity.join(' ')}`)
  if (params.length > 0) {
    const bullets = params.map((l) => '- ' + l).join('\n')
    sections.push(`Current parameter values:\n${bullets}`)
  }
  return sections.join('\n\n') + addendum
}

const ALLOWED_FIELDS: DesignField[] = [
  'wallThickness',
  'minDraftAngle',
  'partLength',
  'partWidth',
  'partHeight',
  'material',
  'numCavities',
  'productionQuantity',
]

/** Per-field expected JSON-value type, used by parseProposal to drop
 *  any change whose value doesn't match (a malformed material change
 *  with a numeric value, etc.). */
const FIELD_VALUE_TYPE: Record<DesignField, 'number' | 'string'> = {
  wallThickness: 'number',
  minDraftAngle: 'number',
  partLength: 'number',
  partWidth: 'number',
  partHeight: 'number',
  material: 'string',
  numCavities: 'number',
  productionQuantity: 'number',
}

const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'find_local_shops',
      description:
        'Look up Michigan-area injection-molding shops the designer could hand the part off to. Call this when the user explicitly asks about local manufacturing options. Returns shop name, location, capability, lead time, and any caveats.',
      parameters: {
        type: 'object',
        properties: {
          dfmScore: {
            type: 'number',
            description:
              'Optional. If the designer mentioned their current DFM score (0-100), pass it to filter to shops that would accept the part as-is. Omit if unknown.',
          },
          zip: {
            type: 'string',
            description:
              'Optional 5-digit US ZIP code. If the user mentioned their location or ZIP, pass it to sort shops by proximity.',
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'propose_design_change',
      description:
        "Propose a concrete change to the part the designer can Accept or Reject. The accepted change applies to simulationParams (3D model + DFM + cost all re-derive). Covers manufacturing parameters (wallThickness, minDraftAngle), dimensions (partLength, partWidth, partHeight), material switching, and production levers (numCavities, productionQuantity).",
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Short label for the proposal (max ~8 words). Shown as the action-card heading.',
          },
          rationale: {
            type: 'string',
            description: 'One sentence explaining why this change helps. Shown under the title.',
          },
          changes: {
            type: 'array',
            minItems: 1,
            maxItems: 3,
            items: {
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                  enum: ALLOWED_FIELDS,
                  description:
                    'Which simulationParams field to set. Numeric fields take number values; material takes a string from the allowed list.',
                },
                value: {
                  // Schema accepts both (OpenAI tool schemas allow type unions);
                  // parseProposal on the server enforces the per-field type via
                  // FIELD_VALUE_TYPE so an unmatched-type change gets dropped.
                  type: ['number', 'string'],
                  description: `Target value. Units / domain per field:
- wallThickness, partLength, partWidth, partHeight: number, mm
- minDraftAngle: number, degrees (typically 1-5)
- numCavities: integer 1-32
- productionQuantity: integer (1000-1000000 typical)
- material: one of "${ALLOWED_MATERIALS.join('", "')}"`,
                },
              },
              required: ['field', 'value'],
              additionalProperties: false,
            },
          },
        },
        required: ['title', 'rationale', 'changes'],
        additionalProperties: false,
      },
    },
  },
]

interface RawProposalArgs {
  title?: unknown
  rationale?: unknown
  changes?: unknown
}

/** Validate a single raw change tuple. Numeric fields must be finite
 *  numbers; material must be one of ALLOWED_MATERIALS. Returns null
 *  for any mismatch so parseProposal can silently drop it. */
function parseChange(raw: unknown): DesignChange | null {
  if (typeof raw !== 'object' || raw === null) return null
  const field = (raw as { field?: unknown }).field
  const value = (raw as { value?: unknown }).value
  if (!ALLOWED_FIELDS.includes(field as DesignField)) return null
  const f = field as DesignField
  const expected = FIELD_VALUE_TYPE[f]
  if (expected === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null
    return { field: f, value }
  }
  // expected === 'string' (material only today)
  if (typeof value !== 'string') return null
  if (f === 'material' && !ALLOWED_MATERIALS.includes(value as AllowedMaterial)) return null
  return { field: f, value }
}

/** Validate a raw tool-call argument blob into a DesignProposal we can
 *  hand to the client. Returns null if the shape is wrong rather than
 *  throwing — a malformed proposal becomes a no-op the model can retry. */
function parseProposal(raw: string, idHint: string): DesignProposal | null {
  let parsed: RawProposalArgs
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof parsed.title !== 'string' || typeof parsed.rationale !== 'string') return null
  if (!Array.isArray(parsed.changes) || parsed.changes.length === 0) return null
  const changes: DesignChange[] = []
  for (const c of parsed.changes) {
    const parsedChange = parseChange(c)
    if (parsedChange) changes.push(parsedChange)
  }
  if (changes.length === 0) return null
  return {
    id: idHint,
    title: parsed.title.slice(0, 120),
    rationale: parsed.rationale.slice(0, 400),
    changes,
    status: 'pending',
  }
}

async function callOpenAI(
  apiKey: string,
  messages: Array<{ role: string; content?: string | null; tool_calls?: unknown; tool_call_id?: string; name?: string }>,
): Promise<Response> {
  return fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      max_tokens: 320,
      temperature: 0.7,
    }),
  })
}

interface ToolCall {
  id: string
  function: { name: string; arguments: string }
}

/** If any of the model's tool calls is a propose_design_change, build
 *  the final NextResponse here and return it. Returning null means "no
 *  short-circuit; continue the tool-loop normally".
 *
 *  Single proposal call -> `{reply, proposal}` (inline-chat shape).
 *  Multiple proposal calls -> `{reply, proposals: [...]}` (suggestion-panel shape).
 *  The client uses whichever key is present. */
function maybeProposalResponse(toolCalls: ToolCall[], rawContent: string | null) {
  const proposalCalls = toolCalls.filter((c) => c.function.name === 'propose_design_change')
  if (proposalCalls.length === 0) return null
  const replyText = rawContent?.trim() ?? ''
  const proposals = proposalCalls
    .map((c) => parseProposal(c.function.arguments || '{}', c.id))
    .filter((p): p is DesignProposal => p !== null)
  if (proposals.length === 0) {
    return NextResponse.json({
      reply: replyText || '(proposal was malformed; please retry)',
    })
  }
  if (proposals.length === 1) {
    return NextResponse.json({
      reply: replyText || `Proposed: ${proposals[0].title}`,
      proposal: proposals[0],
    })
  }
  return NextResponse.json({
    reply: replyText || `Generated ${proposals.length} optimizations`,
    proposals,
  })
}

/** Resolve a tool call to its tool-message reply that gets pushed back
 *  into the conversation. find_local_shops is the only real tool here;
 *  anything else returns an error so the model knows to back off. */
function runShopTool(call: ToolCall) {
  if (call.function.name !== 'find_local_shops') {
    return {
      role: 'tool',
      tool_call_id: call.id,
      name: call.function.name,
      content: JSON.stringify({ error: 'unknown tool' }),
    }
  }
  let args: { dfmScore?: number; zip?: string } = {}
  try {
    args = JSON.parse(call.function.arguments || '{}')
  } catch {
    /* leave args empty */
  }
  const shops = findLocalShops({ dfmScore: args.dfmScore, zip: args.zip, limit: 4 })
  return {
    role: 'tool',
    tool_call_id: call.id,
    name: 'find_local_shops',
    content: JSON.stringify({ shops }),
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'OPENAI_API_KEY is not set. Add it to .env.local and restart `pnpm dev`.',
      },
      { status: 500 },
    )
  }

  let body: ChatRequestBody
  try {
    body = (await req.json()) as ChatRequestBody
    if (!Array.isArray(body.messages)) {
      throw new Error('messages must be an array')
    }
  } catch {
    return NextResponse.json(
      { error: 'Request body must include a `messages` array.' },
      { status: 400 },
    )
  }

  // Conversation grows during tool-call loop; start with system + user history.
  // intent='suggestions' tells buildSystemPrompt to append the multi-proposal
  // addendum so the model emits 2-3 separate propose_design_change tool calls.
  const conversation: Array<{
    role: string
    content?: string | null
    tool_calls?: unknown
    tool_call_id?: string
    name?: string
  }> = [
    { role: 'system', content: buildSystemPrompt(body.context, body.intent) },
    ...body.messages,
  ]

  try {
    // Up to 3 round-trips to handle tool calls. Anything beyond that is
    // either a tool-loop bug or the model getting confused — bail out
    // with the latest text we have.
    for (let i = 0; i < 3; i++) {
      const res = await callOpenAI(apiKey, conversation)
      if (!res.ok) {
        const detail = await res.text()
        return NextResponse.json(
          { error: `OpenAI returned ${res.status}.`, detail: detail.slice(0, 400) },
          { status: 502 },
        )
      }
      const data = await res.json()
      const message = data?.choices?.[0]?.message
      if (!message) {
        return NextResponse.json({ reply: '(no response)' })
      }

      const toolCalls = message.tool_calls as
        | Array<{ id: string; function: { name: string; arguments: string } }>
        | undefined

      if (!toolCalls || toolCalls.length === 0) {
        return NextResponse.json({ reply: (message.content as string)?.trim() ?? '(no response)' })
      }

      // If the model proposed a design change, short-circuit the
      // tool-loop and return the proposal alongside any text the model
      // produced. The user's accept/reject is the next step.
      const shortCircuit = maybeProposalResponse(toolCalls, message.content as string | null)
      if (shortCircuit) return shortCircuit

      // Push the assistant's tool-call message before the tool outputs.
      conversation.push(message)
      for (const call of toolCalls) {
        conversation.push(runShopTool(call))
      }
    }

    return NextResponse.json({ reply: '(tool loop exceeded; please retry)' })
  } catch {
    return NextResponse.json(
      {
        error:
          'Failed to reach OpenAI — check that the dev server has internet access.',
      },
      { status: 502 },
    )
  }
}
