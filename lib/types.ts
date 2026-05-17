// Operation types for AI suggestions
export type OperationType = 'modify' | 'add' | 'delete'

export interface Operation {
  id: string
  type: OperationType
  feature: string
  description: string
  parameters?: Record<string, unknown>
  preview?: boolean
}

// AI Suggestion types
export type SuggestionStatus = 'pending' | 'previewing' | 'accepted' | 'rejected'

export interface AISuggestion {
  id: string
  title: string
  description: string
  operations: Operation[]
  status: SuggestionStatus
}

// Parameter types
export interface Parameter {
  id: string
  name: string
  value: number
  unit: string
  locked?: boolean
  constraint?: string
}

// Panel types
export type RightPanelType = 'ai' | 'manufacturing'

// Chat

/** Fields the AI assistant is allowed to modify on the part.
 *  Intentionally limited to manufacturing-side parameters (wall, draft)
 *  — part length / width / height are the customer's spec and stay
 *  under direct user control via the Parameters panel only. */
export type DesignField = 'wallThickness' | 'minDraftAngle'

export interface DesignChange {
  field: DesignField
  /** Target value. Units are implied by the field: mm for
   *  wallThickness, degrees for minDraftAngle. */
  value: number
}

export type ProposalStatus = 'pending' | 'accepted' | 'rejected'

/** An inline action card the AI can drop into chat. The user clicks
 *  Accept or Reject; Accept fan-outs into one `updateSimulationParams`
 *  per change and the 3D geometry rebuilds. */
export interface DesignProposal {
  id: string
  title: string
  rationale: string
  changes: DesignChange[]
  status: ProposalStatus
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  /** Optional inline proposal rendered as an action card next to the
   *  assistant's text. Only ever set on assistant messages. */
  proposal?: DesignProposal
}

// ---------------------------------------------------------------------------
// MoldLocal results dashboard types
// Shape mirrors the future backend response so the frontend can be wired
// directly to backend AI / scraping / CAD output later.
// ---------------------------------------------------------------------------

export type MoldIssueSeverity = 'high' | 'medium' | 'low'

export interface MoldIssueHotspot {
  top: string
  left: string
  label: string
}

/**
 * Axis-aligned bounding box in viewport world coordinates. Triangles
 * whose centroid falls inside this box are painted with the issue's
 * severity color by the 3D viewport's heatmap renderer.
 */
export interface MoldIssueRegion {
  min: [number, number, number]
  max: [number, number, number]
}

export interface MoldIssue {
  id: string
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
  hotspot: MoldIssueHotspot
  /** Region of the 3D mesh to highlight in the heatmap. Optional —
   *  issues without a region show only the SVG hotspot. */
  region?: MoldIssueRegion
}

export interface MoldRiskMetric {
  label: string
  value: string
  description: string
}

export interface MoldSupplierReadiness {
  region: string
  status: string
  notes: string
}

export type MoldChecklistStatus = 'good' | 'attention' | 'action'

export interface MoldChecklistItem {
  id: string
  label: string
  status: MoldChecklistStatus
}

export type PartId = 'bracket' | 'phoneCase' | 'droneArm' | 'bumper'

export interface MoldAnalysisResult {
  partId: PartId
  partName: string
  partSummary: string
  overallScore: number
  improvedScore: number
  riskSummary: MoldRiskMetric[]
  issues: MoldIssue[]
  supplierReadiness: MoldSupplierReadiness
  checklist: MoldChecklistItem[]
}
