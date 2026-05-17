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

/** Fields the AI assistant is allowed to modify on the part. Covers
 *  geometry (L/W/H/wall), manufacturing (draft), material, and the
 *  production-side levers (cavities, quantity). The accept handler
 *  fans these out to the right destinations: numeric/dimension fields
 *  go through both updateSimulationParams AND updateParameterValue;
 *  material / cavities / quantity go through updateSimulationParams
 *  only (they have no entry in the Parameters panel). */
export type DesignField =
  | 'wallThickness'
  | 'minDraftAngle'
  | 'partLength'
  | 'partWidth'
  | 'partHeight'
  | 'material'
  | 'numCavities'
  | 'productionQuantity'

/** Allowed material values for `material` proposals. Mirrors the
 *  options the moldsim engine knows about (lib/moldsim/materials.ts). */
export const ALLOWED_MATERIALS = ['ABS', 'PP', 'PE-HD', 'PA6', 'PC'] as const
export type AllowedMaterial = (typeof ALLOWED_MATERIALS)[number]

export interface DesignChange {
  field: DesignField
  /** Target value. Units implied by the field:
   *   - wallThickness / partLength / partWidth / partHeight: mm
   *   - minDraftAngle: degrees
   *   - numCavities / productionQuantity: integer count
   *   - material: AllowedMaterial string */
  value: number | string
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

/** Built-in demo part IDs that have hand-authored rich-text fields
 *  in partsLibrary + partSimInputs. Used to type the exhaustive
 *  Record<DemoPartId, ...> lookup tables. */
export type DemoPartId = 'bracket' | 'phoneCase' | 'droneArm' | 'bumper'

/** Runtime part ID. Demo IDs are preserved as literals (autocomplete /
 *  hover shows them), but ANY string is accepted so user-registered
 *  parts can use generated IDs like 'user-<timestamp>'. Code that
 *  needs to branch should use the safe accessors getDashboardAnalysis
 *  / getPartSimInputs (return null for non-demo IDs) or check
 *  membership against the UserPart registry. */
export type PartId = DemoPartId | 'custom' | (string & {})

/** Allowed primitive shapes for AI-generated parts. Strict enum so the
 *  renderer never receives a shape it can't build. */
export type CustomPartShape = 'box' | 'cylinder' | 'plate' | 'shell'

/** Spec emitted by the AI's create_part_from_description tool and held
 *  in useAppStore.customPartSpec. Dimensions are all mm; the geometry
 *  builder scales the primitive into those exact dimensions. */
export interface CustomPartSpec {
  shape: CustomPartShape
  /** Human label, e.g. "iPhone 15 case" or "5x3 mounting plate". */
  label: string
  /** One-sentence description for context / display. */
  description?: string
  partLength: number
  partWidth: number
  partHeight: number
  wallThickness: number
  material: string
}

/** A user-created part registered in the workspace's parts library.
 *  Either AI-generated from a CustomPartSpec or imported from a
 *  user-uploaded STL. Lives alongside the four hardcoded demo parts in
 *  the sidebar / parts ribbon. Persists in-memory for the session. */
export type UserPart =
  | {
      id: string
      kind: 'ai-created'
      label: string
      description?: string
      spec: CustomPartSpec
      createdAt: number
    }
  | {
      id: string
      kind: 'uploaded'
      label: string
      stlUrl: string
      /** Original STL bounding-box dimensions in mm (user-confirmed
       *  via UploadAnalyzeModal). Used to scale the camera + drive
       *  the simulation params when this part is re-selected. */
      partLength: number
      partWidth: number
      partHeight: number
      wallThickness: number
      material: string
      createdAt: number
    }

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
