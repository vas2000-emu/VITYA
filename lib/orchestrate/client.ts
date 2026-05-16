// ---------------------------------------------------------------------------
// IBM Orchestrate — API client (server-side only)
// ---------------------------------------------------------------------------
// Required .env.local entries:
//
//   ORCHESTRATE_API_KEY=        ← your IBM Cloud API key
//   ORCHESTRATE_AGENT_ID=       ← your deployed agent/assistant ID
//   ORCHESTRATE_ENDPOINT=       ← full URL to your agent's inference endpoint
//   ORCHESTRATE_INSTANCE_ID=    ← IBM instance ID (if your endpoint needs it)
//
// The IAM token is cached for its lifetime so we don't re-auth every request.
// ---------------------------------------------------------------------------

import type { IBMRawResponse, OrchestrateMessage } from './types'

const API_KEY      = process.env.ORCHESTRATE_API_KEY
const AGENT_ID     = process.env.ORCHESTRATE_AGENT_ID
const ENDPOINT     = process.env.ORCHESTRATE_ENDPOINT
const INSTANCE_ID  = process.env.ORCHESTRATE_INSTANCE_ID

let cachedToken: { value: string; expiresAt: number } | null = null

async function getIAMToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value
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
  cachedToken = {
    value: data.access_token,
    // Subtract 60s so we refresh before the token actually expires
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  }
  return cachedToken.value
}

export async function sendToOrchestrate(messages: OrchestrateMessage[]): Promise<IBMRawResponse> {
  if (!API_KEY || !AGENT_ID || !ENDPOINT) {
    throw new Error(
      'IBM Orchestrate is not configured. ' +
      'Add ORCHESTRATE_API_KEY, ORCHESTRATE_AGENT_ID, and ORCHESTRATE_ENDPOINT to .env.local'
    )
  }

  const token = await getIAMToken()

  const body: Record<string, unknown> = { messages }
  if (AGENT_ID)    body.agent_id    = AGENT_ID
  if (INSTANCE_ID) body.instance_id = INSTANCE_ID

  const res = await fetch(ENDPOINT, {
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
