// Feature types
export type FeatureType = 'origin' | 'sketch' | 'extrude' | 'revolve' | 'fillet' | 'chamfer' | 'hole' | 'plane'

export interface Feature {
  id: string
  name: string
  type: FeatureType
  children?: Feature[]
  visible?: boolean
  suppressed?: boolean
}

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

// Manufacturing issue types
export type IssueType = 'error' | 'warning' | 'success' | 'info'

export interface ManufacturingIssue {
  id: string
  type: IssueType
  category: string
  title: string
  description: string
  location?: string
  suggestion?: string
}

// Panel types
export type RightPanelType = 'ai' | 'manufacturing'

// Chat
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
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

export type PartId = 'bracket' | 'phoneCase' | 'droneArm'

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
