import { NextRequest, NextResponse } from 'next/server'
import { findLocalShops } from '@/lib/localShops'

// Server-side route — process.env.OPENAI_API_KEY is never sent to the
// browser. The frontend POSTs the conversation history here and gets
// back the assistant's reply. If you want to swap models, change the
// `model` string below; gpt-4o-mini is cheap and fast enough for demo.

const SYSTEM_PROMPT = `You are MoldLocal's AI design assistant. MoldLocal is a design-aid tool that helps people iterate on plastic parts toward something that's actually moldable — without paying for expert DFM consulting.

Your job is to help the designer understand and improve their part. Focus on injection-molding fundamentals: undercuts, draft angles, wall thickness, parting line, gate placement, cooling, ejection, tooling complexity, and how design choices affect cost and lead time. Be direct and conversational — no lecturing.

If the designer asks about local manufacturing options (e.g. "who can make this near me", "find a local shop", "where can I get this molded"), call the find_local_shops tool. Only call it on explicit request — don't push shops unprompted.

Answer in 2-3 sentences of plain English unless the user asks for more detail.`

interface ChatRequestBody {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
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
]

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
    { role: 'system', content: SYSTEM_PROMPT },
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

      // Push the assistant's tool-call message before the tool outputs.
      conversation.push(message)

      for (const call of toolCalls) {
        if (call.function.name !== 'find_local_shops') {
          conversation.push({
            role: 'tool',
            tool_call_id: call.id,
            name: call.function.name,
            content: JSON.stringify({ error: 'unknown tool' }),
          })
          continue
        }
        let args: { dfmScore?: number; zip?: string } = {}
        try {
          args = JSON.parse(call.function.arguments || '{}')
        } catch {
          /* leave args empty */
        }
        const shops = findLocalShops({ dfmScore: args.dfmScore, zip: args.zip, limit: 4 })
        conversation.push({
          role: 'tool',
          tool_call_id: call.id,
          name: 'find_local_shops',
          content: JSON.stringify({ shops }),
        })
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
