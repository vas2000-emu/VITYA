import { NextRequest, NextResponse } from 'next/server'
import type { MoldIssue, MoldIssueSeverity } from '@/lib/types'

// Generates a rich-text issue report for a custom part (AI-created or
// STL-uploaded) by calling gpt-4o-mini with the part's bbox / material
// / moldsim results and asking for 3-6 structured issues. The AI is
// asked to write in plain English — consumer-friendly, no jargon.

interface GenerateReportRequest {
  partName: string
  partDescription?: string
  material: string
  partLength: number
  partWidth: number
  partHeight: number
  wallThickness: number
  minDraftAngle: number
  // Moldsim API output (already computed before this endpoint is called).
  dfmScore: number
  cycleTimeSec: number
  perPartCost: number
  toolingCost: number
  isManufacturable: boolean
  // Optional raw issues from the moldsim manufacturing module that the
  // AI can paraphrase / expand on.
  rawIssues?: Array<{ category: string; issue: string; severity: string; recommendation?: string }>
}

const ALLOWED_HOTSPOT_KEYWORDS = ['center', 'top', 'bottom', 'left', 'right', 'corner'] as const

interface AiIssue {
  id?: string
  title: string
  severity: MoldIssueSeverity
  location: string
  whyItMatters: string
  costImpact: string
  leadTimeImpact: string
  recommendation: string
  scoreImpact: string
  beforeScore: number
  afterScore: number
  hotspotKeyword?: (typeof ALLOWED_HOTSPOT_KEYWORDS)[number]
}

const SYSTEM_PROMPT = `You write plain-English moldability reports for plastic parts. The audience is a designer who knows their part but doesn't know injection-molding jargon. Write like a friendly senior engineer explaining things — no acronyms without context, no marketing fluff.

Given the part's dimensions, material, and the simulator's output, emit a JSON object with an "issues" array of 3-6 issues. Each issue MUST follow this shape:
{
  "title": "Short sentence, max 10 words. Avoid jargon.",
  "severity": "high" | "medium" | "low",
  "location": "Plain-English location like 'top of the part' or 'around the cylindrical hole'",
  "whyItMatters": "One sentence the designer can read out loud. Explain the consequence.",
  "costImpact": "Concrete dollar / percentage statement.",
  "leadTimeImpact": "Concrete time statement.",
  "recommendation": "One concrete action the designer can take. Mention specific values (mm, in, degrees).",
  "scoreImpact": "+N where N is the DFM score points this fix earns back (1-15 typical)",
  "beforeScore": <current dfm score, integer>,
  "afterScore": <beforeScore + scoreImpact>,
  "hotspotKeyword": "center" | "top" | "bottom" | "left" | "right" | "corner"
}

Severity guidance:
- high = will cause first-shot rejects or tool damage
- medium = will affect cosmetic / dimensional quality, fixable in design
- low = good practice to address, won't block production

Mix severities. Aim for 1-2 high, 2-3 medium, 0-2 low. If the DFM score is high (>80) and the part looks fine, you can return fewer issues focused on optimization, not problems.

Return ONLY a valid JSON object. No prose around it.`

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 })
  }

  let body: GenerateReportRequest
  try {
    body = (await req.json()) as GenerateReportRequest
  } catch {
    return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 })
  }

  const userMsg = buildUserPrompt(body)
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMsg },
        ],
        temperature: 0.5,
        max_tokens: 1200,
      }),
    })
    if (!res.ok) {
      const detail = await res.text()
      return NextResponse.json(
        { error: `OpenAI returned ${res.status}`, detail: detail.slice(0, 400) },
        { status: 502 },
      )
    }
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'Empty completion' }, { status: 502 })
    }
    let parsed: { issues?: unknown }
    try {
      parsed = JSON.parse(content)
    } catch {
      return NextResponse.json({ error: 'Model returned invalid JSON', raw: content }, { status: 502 })
    }
    if (!Array.isArray(parsed.issues)) {
      return NextResponse.json({ error: 'No issues in response' }, { status: 502 })
    }
    const issues = parsed.issues
      .map((i: unknown, idx: number) => normalizeIssue(i, idx))
      .filter((i): i is MoldIssue => i !== null)
    return NextResponse.json({ issues })
  } catch {
    return NextResponse.json({ error: 'Failed to reach OpenAI' }, { status: 502 })
  }
}

function buildUserPrompt(body: GenerateReportRequest): string {
  const lines = [
    `Part: ${body.partName}`,
    body.partDescription ? `Description: ${body.partDescription}` : '',
    `Material: ${body.material}`,
    `Dimensions: ${body.partLength.toFixed(0)} x ${body.partWidth.toFixed(0)} x ${body.partHeight.toFixed(0)} mm (length x width x height)`,
    `Wall thickness: ${body.wallThickness.toFixed(2)} mm`,
    `Minimum draft angle: ${body.minDraftAngle.toFixed(1)} degrees`,
    '',
    `Simulator output:`,
    `- Moldability score (DFM): ${body.dfmScore}/100`,
    `- Cycle time: ${body.cycleTimeSec.toFixed(1)} seconds`,
    `- Cost per part: $${body.perPartCost.toFixed(2)}`,
    `- Tooling cost: $${body.toolingCost.toFixed(0)}`,
    `- Manufacturable as-is: ${body.isManufacturable ? 'yes' : 'no'}`,
  ]
  if (body.rawIssues && body.rawIssues.length > 0) {
    lines.push('', `Raw issues from rule-based check:`)
    for (const issue of body.rawIssues) {
      lines.push(`- [${issue.severity}] ${issue.category}: ${issue.issue}${issue.recommendation ? ` (rec: ${issue.recommendation})` : ''}`)
    }
  }
  lines.push('', 'Generate the report now.')
  return lines.filter(Boolean).join('\n')
}

const SEVERITIES: ReadonlySet<MoldIssueSeverity> = new Set(['high', 'medium', 'low'])

// Map hotspot keyword -> {top, left} percent strings. The dashboard's
// PartPreview overlays these on top of a generic procedural silhouette
// (or a "no preview" placeholder for AI / uploaded parts).
const KEYWORD_POSITIONS: Record<(typeof ALLOWED_HOTSPOT_KEYWORDS)[number], { top: string; left: string }> = {
  center: { top: '50%', left: '50%' },
  top: { top: '20%', left: '50%' },
  bottom: { top: '80%', left: '50%' },
  left: { top: '50%', left: '20%' },
  right: { top: '50%', left: '80%' },
  corner: { top: '25%', left: '25%' },
}

function normalizeIssue(raw: unknown, idx: number): MoldIssue | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Partial<AiIssue>
  if (typeof r.title !== 'string' || typeof r.recommendation !== 'string') return null
  const severity: MoldIssueSeverity = SEVERITIES.has(r.severity as MoldIssueSeverity)
    ? (r.severity as MoldIssueSeverity)
    : 'medium'
  const keyword = ALLOWED_HOTSPOT_KEYWORDS.includes(
    r.hotspotKeyword as (typeof ALLOWED_HOTSPOT_KEYWORDS)[number],
  )
    ? (r.hotspotKeyword as (typeof ALLOWED_HOTSPOT_KEYWORDS)[number])
    : 'center'
  const pos = KEYWORD_POSITIONS[keyword]
  return {
    id: r.id ?? `ai-${idx}`,
    title: r.title.slice(0, 140),
    severity,
    location: typeof r.location === 'string' ? r.location.slice(0, 80) : 'across the part',
    whyItMatters: typeof r.whyItMatters === 'string' ? r.whyItMatters.slice(0, 400) : '',
    costImpact: typeof r.costImpact === 'string' ? r.costImpact.slice(0, 200) : 'Unknown.',
    leadTimeImpact: typeof r.leadTimeImpact === 'string' ? r.leadTimeImpact.slice(0, 200) : 'Unknown.',
    recommendation: r.recommendation.slice(0, 400),
    scoreImpact: typeof r.scoreImpact === 'string' ? r.scoreImpact.slice(0, 8) : '+5',
    beforeScore: typeof r.beforeScore === 'number' ? Math.round(r.beforeScore) : 60,
    afterScore: typeof r.afterScore === 'number' ? Math.round(r.afterScore) : 65,
    hotspot: { ...pos, label: r.title.slice(0, 14) },
  }
}
