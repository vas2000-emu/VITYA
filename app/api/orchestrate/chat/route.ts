// ---------------------------------------------------------------------------
// POST /api/orchestrate/chat
// ---------------------------------------------------------------------------
// Drop-in replacement for /api/ai/chat. When IBM Orchestrate is configured
// this route sends the conversation to the agent and returns:
//   { reply: string, suggestions: AISuggestion[] }
//
// To switch the UI to this route, change the fetch URL in
// components/AIAssistantPanel.tsx from '/api/ai/chat' to '/api/orchestrate/chat'.
//
// If ORCHESTRATE_API_KEY is not set the route returns a clear error so the
// panel can surface it rather than silently failing.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { sendToOrchestrate } from '@/lib/orchestrate/client'
import { parseIBMResponse, toAISuggestion } from '@/lib/orchestrate/adapter'
import type { OrchestrateMessage } from '@/lib/orchestrate/types'

export async function POST(req: NextRequest) {
  console.log('[orchestrate] API_KEY starts with:', process.env.ORCHESTRATE_API_KEY?.slice(0, 6))
  const { messages } = (await req.json()) as { messages: OrchestrateMessage[] }

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages array is required' }, { status: 400 })
  }

  try {
    const raw = await sendToOrchestrate(messages)
    const { reply, suggestions } = parseIBMResponse(raw)
    const aiSuggestions = suggestions.map(toAISuggestion)

    return NextResponse.json({ reply, suggestions: aiSuggestions })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Orchestrate request failed'
    console.error('[orchestrate/chat]', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
