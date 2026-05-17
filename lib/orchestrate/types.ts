// ---------------------------------------------------------------------------
// IBM Orchestrate — type definitions
// ---------------------------------------------------------------------------
// These types describe:
//   1. What we SEND to IBM Orchestrate
//   2. What we EXPECT the agent to return (the agent is pre-prompted to
//      follow this schema when suggesting DFM changes)
//   3. The internal VITYA shape used by the adapter + UI
// ---------------------------------------------------------------------------

// ── Outbound ────────────────────────────────────────────────────────────────

export interface OrchestrateMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface OrchestrateRequest {
  messages: OrchestrateMessage[]
}

// ── Inbound (raw IBM API response) ──────────────────────────────────────────
// Update this once you have a real sample response from your deployment.
// The adapter in adapter.ts normalises this into OrchestrateAgentResponse.

export interface IBMRawResponse {
  // OpenAI-compatible completions format (watsonx Orchestrate /chat/completions)
  choices?: Array<{
    message?: {
      role: string
      content: string | Array<{ type: string; text?: string }>
    }
    delta?: { content?: string }
  }>
  // Watson Assistant / watsonx Orchestrate generic text output
  output?: {
    generic?: Array<{
      response_type: string
      text?: string
    }>
  }
  // Some IBM deployments return a top-level `result` object
  result?: {
    message?: string
    [key: string]: unknown
  }
  // Fallback — some agents return plain `{ text: "..." }`
  text?: string
}

// ── Agent structured suggestion (agent is prompted to return this JSON) ──────
// When the agent wants to propose a change it wraps its reply in JSON like:
//
//   {
//     "reply": "I suggest thickening the side walls to prevent sink marks.",
//     "suggestions": [
//       {
//         "id": "sug-001",
//         "title": "Increase wall thickness",
//         "description": "Raise side-wall thickness from 2mm to 3mm.",
//         "operations": [
//           {
//             "type": "modify",
//             "feature": "wallThickness",
//             "description": "Set wall thickness to 3mm",
//             "parameters": { "wallThickness": 3 }
//           }
//         ]
//       }
//     ]
//   }
//
// If the agent is just chatting (no change proposed) it returns:
//   { "reply": "That's a good question…" }

export interface OrchestrateOperation {
  type: 'modify' | 'add' | 'delete'
  // Must match a parameter ID in the store (width, wallThickness, filletRadius, etc.)
  feature: string
  description: string
  parameters?: Record<string, number | string>
}

export interface OrchestrateSuggestion {
  id: string
  title: string
  description: string
  operations: OrchestrateOperation[]
}

// Normalised shape returned by the adapter to the API route + UI
export interface OrchestrateAgentResponse {
  reply: string
  suggestions: OrchestrateSuggestion[]
}
