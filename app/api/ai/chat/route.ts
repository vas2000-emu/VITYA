import { NextRequest, NextResponse } from 'next/server'
import type { AISuggestion } from '@/lib/types'

// Server-side route — OPENAI_API_KEY is never sent to the browser.
// The frontend POSTs the conversation history + live part context here
// and gets back { reply, suggestions[] }.

interface Parameter {
  id: string
  name: string
  value: number
  unit: string
}

interface ManufacturingIssue {
  category: string
  title: string
  type: string
  location?: string
}

interface PartContext {
  partId: string
  parameters: Parameter[]
  manufacturingIssues: ManufacturingIssue[]
  dfmScore?: number
  material?: string
  wallThickness?: number
}

interface ChatRequestBody {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  context?: PartContext
}

function buildSystemPrompt(ctx?: PartContext): string {
  let prompt = `You are MoldLocal's AI design assistant. MoldLocal helps users evaluate whether a plastic part is realistic and affordable to manufacture through Michigan-based injection molding shops.`

  if (ctx) {
    const params = ctx.parameters
      .map((p) => `${p.name}: ${p.value}${p.unit}`)
      .join(', ')

    const issues = ctx.manufacturingIssues
      .filter((i) => i.type === 'error' || i.type === 'warning')
      .map((i) => `${i.category} — ${i.title}${i.location ? ` (${i.location})` : ''}`)
      .join('; ')

    prompt += `\n\nCurrent part: ${ctx.partId}. Material: ${ctx.material ?? 'ABS'}.`
    if (params) prompt += `\nParameters: ${params}.`
    if (ctx.dfmScore !== undefined) prompt += `\nDFM score: ${ctx.dfmScore}/100.`
    if (issues) prompt += `\nActive issues: ${issues}.`
  }

  prompt += `

When you want to suggest a design change, respond with a JSON block in this exact format (alongside your plain text reply):

\`\`\`json
{
  "reply": "Your plain English explanation here.",
  "suggestions": [
    {
      "id": "sug-001",
      "title": "Short title",
      "description": "What this change does and why.",
      "operations": [
        {
          "type": "modify",
          "feature": "wallThickness",
          "description": "Increase wall thickness to 3mm",
          "parameters": { "wallThickness": 3 }
        }
      ]
    }
  ]
}
\`\`\`

Valid feature IDs for operations: width, length, height, holeDiameter, wallThickness, filletRadius.
If you have no specific change to suggest, just reply in plain text — no JSON needed.
Answer in 2-3 sentences. Focus on undercuts, draft angles, wall thickness, tooling complexity, lead time. Be direct and conversational.`

  return prompt
}

function parseReply(raw: string): { reply: string; suggestions: AISuggestion[] } {
  const jsonMatch = raw.match(/```json\s*([\s\S]*?)```/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1])
      const suggestions: AISuggestion[] = (parsed.suggestions ?? []).map(
        (s: AISuggestion, i: number) => ({
          ...s,
          id: s.id ?? `sug-${Date.now()}-${i}`,
          status: 'pending' as const,
        })
      )
      return {
        reply: parsed.reply ?? raw.replace(jsonMatch[0], '').trim(),
        suggestions,
      }
    } catch {
      // malformed JSON — fall through to plain text
    }
  }
  return { reply: raw, suggestions: [] }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not set. Add it to .env.local and restart `pnpm dev`.' },
      { status: 500 }
    )
  }

  let body: ChatRequestBody
  try {
    body = (await req.json()) as ChatRequestBody
    if (!Array.isArray(body.messages)) throw new Error('messages must be an array')
  } catch {
    return NextResponse.json(
      { error: 'Request body must include a `messages` array.' },
      { status: 400 }
    )
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: buildSystemPrompt(body.context) },
          ...body.messages,
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      return NextResponse.json(
        { error: `OpenAI returned ${res.status}.`, detail: detail.slice(0, 400) },
        { status: 502 }
      )
    }

    const data = await res.json()
    const raw: string = data?.choices?.[0]?.message?.content?.trim() ?? '(no response)'
    const { reply, suggestions } = parseReply(raw)
    return NextResponse.json({ reply, suggestions })
  } catch {
    return NextResponse.json(
      { error: 'Failed to reach OpenAI — check that the dev server has internet access.' },
      { status: 502 }
    )
  }
}
