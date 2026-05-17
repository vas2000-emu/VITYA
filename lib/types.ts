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
  /** Single inline proposal (AI returned one propose_design_change call). */
  proposal?: DesignProposal
  /** Multiple proposals when the AI made several propose_design_change
   *  calls in one turn (e.g. user asked "suggest improvements"). */
  proposals?: DesignProposal[]
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
export type CustomPartShape =
  | 'box'
  | 'cylinder'
  | 'plate'
  | 'shell'
  | 'torus'
  | 'cone'
  | 'sphere'
  | 'dome'
  | 'hex_prism'
  | 'ring'

/** Constructive solid geometry tree. Each node is either a primitive
 *  (leaf) or a boolean operation on two child trees. The AI can emit
 *  these via the create_part_from_description tool's optional `csg`
 *  field to compose parts that can't be expressed as a single
 *  primitive (e.g. "block with a cylindrical hole"). */
export type CsgPrimitive = {
  kind: 'primitive'
  shape: CustomPartShape
  /** Bounding-box dimensions in mm. */
  length: number
  width: number
  height: number
  /** Translation along world X / Y / Z in mm, applied after shaping. */
  translate?: { x?: number; y?: number; z?: number }
  /** Wall thickness in mm. Only used by the 'shell' primitive. */
  wallThickness?: number
}

export type CsgOperation = {
  kind: 'operation'
  op: 'union' | 'subtract' | 'intersect'
  a: CsgNode
  b: CsgNode
}

export type CsgNode = CsgPrimitive | CsgOperation

/** Spec emitted by the AI's create_part_from_description tool and held
 *  in useAppStore.customPartSpec. Dimensions are all mm; the geometry
 *  builder scales the primitive (or CSG tree) into those exact
 *  dimensions.
 *
 *  The optional DFM-trigger fields below let the model deliberately
 *  build a part with manufacturing issues (for demos / testing). When
 *  omitted, applyCustomPart / runUserPartAnalysis fall back to safe
 *  defaults that score well. */
export interface CustomPartSpec {
  /** Single-primitive shape. Ignored if `csg` is set. */
  shape: CustomPartShape
  /** Optional CSG tree. When present, the geometry is built by
   *  applying the boolean ops; `shape` is treated as a fallback. */
  csg?: CsgNode
  /** Human label, e.g. "iPhone 15 case" or "5x3 mounting plate". */
  label: string
  /** One-sentence description for context / display. */
  description?: string
  partLength: number
  partWidth: number
  partHeight: number
  wallThickness: number
  material: string
  /** Minimum mold draft angle in degrees. < 1° flags low-draft DFM
   *  issues; omit for the safe 2° default. */
  minDraftAngle?: number
  /** True if the part has unfilleted inside corners — drives stress
   *  riser warnings. Defaults to false. */
  hasSharpCorners?: boolean
  /** False if wall thickness varies across the part — drives sink /
   *  warp warnings. Defaults to true (uniform). */
  hasUniformWall?: boolean
  /** Number of features that require lifters / side actions in the
   *  mold. 0 keeps tooling simple; higher values flag tooling cost
   *  issues. Defaults to 0. */
  numUndercuts?: number
  /** Overall geometric complexity bucket fed to the cost / DFM model.
   *  Higher values raise cycle time and tooling estimates. Defaults to
   *  'moderate'. */
  complexity?: 'simple' | 'moderate' | 'complex' | 'very_complex'
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
