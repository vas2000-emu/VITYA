import { NextRequest, NextResponse } from 'next/server'
import { findLocalShops } from '@/lib/localShops'
import type { DesignChange, DesignField, DesignProposal } from '@/lib/types'

// Server-side route — process.env.OPENAI_API_KEY is never sent to the
// browser. The frontend POSTs the conversation history here and gets
// back the assistant's reply. If you want to swap models, change the
// `model` string below; gpt-4o-mini is cheap and fast enough for demo.

const SYSTEM_PROMPT_BASE = `You are MoldLocal's AI design assistant. MoldLocal is a design-aid tool that helps people iterate on plastic parts toward something that's actually moldable — without paying for expert DFM consulting.

Your job is to help the designer understand and improve their part. Focus on injection-molding fundamentals: undercuts, draft angles, wall thickness, parting line, gate placement, cooling, ejection, tooling complexity, and how design choices affect cost and lead time. Be direct and conversational — no lecturing.

When the designer asks how to improve the part, or describes a problem you can fix by adjusting wall thickness or the minimum draft angle, call the propose_design_change tool with a short title, a one-sentence rationale, and the specific value(s) to set. Do NOT use it to change part length / width / height — those are the customer's spec and stay under direct user control. Do not call it for problems you cannot fix with wall or draft (sharp corners, material switching, gate placement, dimensions). Include 1-3 changes per proposal. Always pair the tool call with a brief text reply explaining what you proposed.

If the designer's request is ambiguous or missing information you need to recommend a specific value (e.g. "make it stronger" without saying which dimension, or "is this thick enough?" without naming a material grade), ask one focused follow-up question first instead of guessing.

If the designer asks about local manufacturing options (e.g. "who can make this near me", "find a local shop", "where can I get this molded"), call the find_local_shops tool. Only call it on explicit request — don't push shops unprompted.

Answer in 2-3 sentences of plain English unless the user asks for more detail.`

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
}

function buildSystemPrompt(ctx: PartContext | undefined): string {
  if (!ctx) return SYSTEM_PROMPT_BASE

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

  if (identity.length === 0 && params.length === 0) return SYSTEM_PROMPT_BASE

  const sections: string[] = [SYSTEM_PROMPT_BASE]
  if (identity.length > 0) sections.push(`Current part:\n${identity.join(' ')}`)
  if (params.length > 0) {
    const bullets = params.map((l) => '- ' + l).join('\n')
    sections.push(`Current parameter values:\n${bullets}`)
  }
  return sections.join('\n\n')
}

const ALLOWED_FIELDS: DesignField[] = ['wallThickness', 'minDraftAngle']

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
        'Propose a concrete change to the part\'s manufacturing parameters (wall thickness and / or minimum draft angle) that the designer can Accept or Reject. The accepted change is applied to the 3D model and re-runs DFM. Do NOT propose changes to part length, width, or height — those are the customer\'s spec.',
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
                  description: 'Which simulationParams field to set.',
                },
                value: {
                  type: 'number',
                  description: 'Target value. Units: mm for wallThickness, degrees for minDraftAngle.',
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
    if (typeof c !== 'object' || c === null) continue
    const field = (c as { field?: unknown }).field
    const value = (c as { value?: unknown }).value
    if (typeof value !== 'number' || !Number.isFinite(value)) continue
    if (!ALLOWED_FIELDS.includes(field as DesignField)) continue
    changes.push({ field: field as DesignField, value })
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
 *  short-circuit; continue the tool-loop normally". */
function maybeProposalResponse(toolCalls: ToolCall[], rawContent: string | null) {
  const proposalCall = toolCalls.find((c) => c.function.name === 'propose_design_change')
  if (!proposalCall) return null
  const replyText = rawContent?.trim() ?? ''
  const proposal = parseProposal(proposalCall.function.arguments || '{}', proposalCall.id)
  if (proposal) {
    return NextResponse.json({
      reply: replyText || `Proposed: ${proposal.title}`,
      proposal,
    })
  }
  return NextResponse.json({
    reply: replyText || '(proposal was malformed; please retry)',
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
  const conversation: Array<{
    role: string
    content?: string | null
    tool_calls?: unknown
    tool_call_id?: string
    name?: string
  }> = [
    { role: 'system', content: buildSystemPrompt(body.context) },
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
