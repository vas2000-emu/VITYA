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
