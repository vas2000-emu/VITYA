import { NextRequest, NextResponse } from 'next/server'

// Server-side route — process.env.OPENAI_API_KEY is never sent to the
// browser. The frontend POSTs the conversation history here and gets
// back the assistant's reply. If you want to swap models, change the
// `model` string below; gpt-4o-mini is cheap and fast enough for demo.

const SYSTEM_PROMPT = `You are MoldLocal's AI design assistant. MoldLocal helps users evaluate whether a plastic part is realistic and affordable to manufacture through Michigan-based injection molding shops.

The current part is a plastic bracket made of a Base Body (the main housing), a Mounting Hole (centered through the top), and Edge Rounds (filleted top edges). Known concerns from earlier analysis: an undercut on the snap-fit hook, insufficient draft angle on vertical walls, and a thin-wall risk on the side walls.

Answer in 2-3 sentences of plain English. Focus on injection-molding fundamentals: undercuts, draft angles, wall thickness, tooling complexity, lead time, ejection. Recommend specific design changes when relevant. Be direct and conversational — no lecturing.`

interface ChatRequestBody {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
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
          { role: 'system', content: SYSTEM_PROMPT },
          ...body.messages,
        ],
        max_tokens: 280,
        temperature: 0.7,
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      return NextResponse.json(
        {
          error: `OpenAI returned ${res.status}.`,
          detail: detail.slice(0, 400),
        },
        { status: 502 },
      )
    }

    const data = await res.json()
    const reply: string =
      data?.choices?.[0]?.message?.content?.trim() ?? '(no response)'
    return NextResponse.json({ reply })
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
