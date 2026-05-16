// ---------------------------------------------------------------------------
// Backend response adapter
//
// The MoldLocal dashboard renders an internal `MoldAnalysisResult` shape
// (see lib/types.ts). The backend team (CAD parsing + AI suggestions +
// supplier readiness RAG) is expected to return a slightly different
// JSON shape. This file maps from that backend shape to our internal one.
//
// To wire a real backend in later:
//   1. Fetch the JSON from your endpoint (e.g. /api/analyze).
//   2. Pass the response through `adaptBackendResponse`.
//   3. Hand the result to `useResultsStore.setState({ analysis: result })`.
//
// Keep this adapter as the ONLY place where the backend shape is decoded.
// Components should never read raw backend fields.
// ---------------------------------------------------------------------------

import type {
  MoldAnalysisResult,
  MoldChecklistStatus,
  MoldIssue,
  MoldIssueSeverity,
} from './types'

// Expected backend response shape (mirrors team spec).
export interface BackendAnalysisResponse {
  partName: string
  overallScore: number
  improvedScore: number
  moldabilityScore: number
  costRisk: string
  leadTimeRisk: string
  region: string
  issues: BackendIssue[]
  readinessChecklist: BackendChecklistItem[]
  supplierNotes?: string
}

export interface BackendIssue {
  id: string
  title: string
  severity: MoldIssueSeverity
  location: string
  /** Hotspot x position in percent of part-preview width (0–100). */
  x: number
  /** Hotspot y position in percent of part-preview height (0–100). */
  y: number
  whyItMatters: string
  costImpact: string
  recommendation: string
  beforeScore: number
  afterScore: number
  scoreImpact: number
  leadTimeImpact?: string
  hotspotLabel?: string
}

export interface BackendChecklistItem {
  label: string
  status: 'pass' | 'needs_work' | 'attention'
}

function mapChecklistStatus(
  status: BackendChecklistItem['status'],
): MoldChecklistStatus {
  switch (status) {
    case 'pass':
      return 'good'
    case 'attention':
      return 'attention'
    case 'needs_work':
    default:
      return 'action'
  }
}

function mapIssue(issue: BackendIssue): MoldIssue {
  return {
    id: issue.id,
    title: issue.title,
    severity: issue.severity,
    location: issue.location,
    whyItMatters: issue.whyItMatters,
    costImpact: issue.costImpact,
    leadTimeImpact:
      issue.leadTimeImpact ??
      'Additional mold validation iterations may extend lead time.',
    recommendation: issue.recommendation,
    scoreImpact: `+${issue.scoreImpact}`,
    beforeScore: issue.beforeScore,
    afterScore: issue.afterScore,
    hotspot: {
      top: `${issue.y}%`,
      left: `${issue.x}%`,
      label: issue.hotspotLabel ?? issue.title.split(' ')[0],
    },
  }
}

export function adaptBackendResponse(
  response: BackendAnalysisResponse,
): MoldAnalysisResult {
  return {
    partName: response.partName,
    overallScore: response.overallScore,
    improvedScore: response.improvedScore,
    riskSummary: [
      {
        label: `${response.region} readiness`,
        value: `${response.overallScore}/100`,
        description: 'Local molders prefer simpler geometry and proven tooling.',
      },
      {
        label: 'Moldability',
        value: `${response.moldabilityScore}/100`,
        description: 'Aggregate of undercut, draft, and wall-thickness checks.',
      },
      {
        label: 'Cost risk',
        value: response.costRisk,
        description: 'Driven by tooling complexity and side-action requirements.',
      },
      {
        label: 'Lead time',
        value: response.leadTimeRisk,
        description: 'Reflects mold build cycles and validation iterations.',
      },
    ],
    issues: response.issues.map(mapIssue),
    supplierReadiness: {
      region: response.region,
      status:
        response.overallScore >= 80
          ? 'Ready for local quoting'
          : response.overallScore >= 65
          ? 'Mostly ready'
          : 'Needs improvement',
      notes:
        response.supplierNotes ??
        'Simpler tooling would make this part easier for local molders to quote quickly.',
    },
    checklist: response.readinessChecklist.map((item, idx) => ({
      id: `check-${idx + 1}`,
      label: item.label,
      status: mapChecklistStatus(item.status),
    })),
  }
}

// Example wiring (uncomment when the backend route exists):
//
// export async function fetchAnalysis(partId: string): Promise<MoldAnalysisResult> {
//   const res = await fetch(`/api/analyze/${partId}`)
//   if (!res.ok) throw new Error('Analysis fetch failed')
//   const data = (await res.json()) as BackendAnalysisResponse
//   return adaptBackendResponse(data)
// }
