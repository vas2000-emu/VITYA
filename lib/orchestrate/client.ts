// ---------------------------------------------------------------------------
// IBM Orchestrate — API client (server-side only)
// ---------------------------------------------------------------------------
// Required .env.local entries:
//
//   ORCHESTRATE_API_KEY=        ← your IBM Cloud API key
//   ORCHESTRATE_AGENT_ID=       ← your deployed agent ID
//   ORCHESTRATE_ENDPOINT=       ← base instance URL, e.g.
//                                  https://api.au-syd.watson-orchestrate.cloud.ibm.com/instances/YOUR_INSTANCE_ID
//   ORCHESTRATE_INSTANCE_ID=    ← same instance ID (used in request body)
//
// The chat URL is built as: ORCHESTRATE_ENDPOINT/v1/agents/ORCHESTRATE_AGENT_ID/chat
// The IAM token is cached for its lifetime so we don't re-auth every request.
// ---------------------------------------------------------------------------

import type { IBMRawResponse, OrchestrateMessage } from './types'

const API_KEY      = process.env.ORCHESTRATE_API_KEY
const AGENT_ID     = process.env.ORCHESTRATE_AGENT_ID
const ENDPOINT     = process.env.ORCHESTRATE_ENDPOINT   // base instance URL
const INSTANCE_ID  = process.env.ORCHESTRATE_INSTANCE_ID

let cachedIAM: { value: string; expiresAt: number } | null = null
let cachedWXO: { value: string; expiresAt: number } | null = null

async function getIAMToken(): Promise<string> {
  if (cachedIAM && Date.now() < cachedIAM.expiresAt) {
    return cachedIAM.value
  }

  const res = await fetch('https://iam.cloud.ibm.com/identity/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
      apikey: API_KEY!,
    }),
  })

  if (!res.ok) {
    throw new Error(`IBM IAM auth failed (${res.status}): ${await res.text()}`)
  }

  const data = await res.json()
  cachedIAM = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  }
  return cachedIAM.value
}

async function getWXOToken(): Promise<string> {
  if (cachedWXO && Date.now() < cachedWXO.expiresAt) {
    return cachedWXO.value
  }

  const iamToken = await getIAMToken()
  const base = ENDPOINT!
    .replace(/\/$/, '')
    .replace(/\/instances\/[^/]+$/, '')
    .replace('api.au-syd.watson-orchestrate', 'au-syd.watson-orchestrate')

  const res = await fetch(`${base}/api/v1/auth/sign_in`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${iamToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`WXO auth failed (${res.status}): ${await res.text()}`)
  }

  const data = await res.json()
  const wxoToken = data.token ?? data.access_token ?? data.jwt
  if (!wxoToken) throw new Error('WXO auth returned no token')

  cachedWXO = {
    value: wxoToken,
    expiresAt: Date.now() + 55 * 60 * 1000, // 55 min
  }
  return cachedWXO.value
}

export async function sendToOrchestrate(messages: OrchestrateMessage[]): Promise<IBMRawResponse> {
  if (!API_KEY || !AGENT_ID || !ENDPOINT) {
    throw new Error(
      'IBM Orchestrate is not configured. ' +
      'Add ORCHESTRATE_API_KEY, ORCHESTRATE_AGENT_ID, and ORCHESTRATE_ENDPOINT to .env.local'
    )
  }

  const token = await getIAMToken()
  const base = ENDPOINT!
    .replace(/\/$/, '')
    .replace(/\/instances\/[^/]+$/, '')
    .replace('api.au-syd.watson-orchestrate', 'au-syd.watson-orchestrate')
  const chatUrl = `${base}/api/v1/orchestrate/${AGENT_ID}/chat/completions`

  console.log('[orchestrate] POST', chatUrl)
  console.log('[orchestrate] token prefix', token.slice(0, 20) + '...')

  const body: Record<string, unknown> = {
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    stream: false,
  }

  const res = await fetch(chatUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Orchestrate API error ${res.status}: ${detail.slice(0, 300)}`)
  }

  return res.json() as Promise<IBMRawResponse>
}
