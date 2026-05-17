import { create } from 'zustand'
import type {
  AISuggestion,
  Parameter,
  RightPanelType,
  ChatMessage,
} from '@/lib/types'
import type {
  CostResponse,
  CoolingResponse,
  ManufacturingCheckResponse,
  FillingResponse,
} from '@/lib/moldsim-api'
import { getMaterial } from '@/lib/moldsim/materials'

// Simulation state types
export interface SimulationParams {
  material: string
  wallThickness: number
  partVolume: number
  partWeight: number
  projectedArea: number
  partLength: number
  partWidth: number
  partHeight: number
  meltTemp: number
  moldTemp: number
  productionQuantity: number
  complexity: 'simple' | 'moderate' | 'complex' | 'very_complex'
  numCavities: number
  numUndercuts: number
  minDraftAngle: number
  hasSharpCorners: boolean
  hasUniformWall: boolean
}

/** Snapshot of the most recently loaded preset's dimensions, wall, and
 *  material. updateSimulationParams uses this as the reference point
 *  when scaling derived fields (volume/weight/projectedArea) in
 *  response to live edits, so the demo numbers stay near the curated
 *  baseline values when the user hasn't deviated. */
export interface SimulationBaseline {
  material: string
  wallThickness: number
  partVolume: number
  partWeight: number
  projectedArea: number
  partLength: number
  partWidth: number
  partHeight: number
}

export interface SimulationResults {
  cost: CostResponse | null
  cooling: CoolingResponse | null
  dfm: ManufacturingCheckResponse | null
  filling: FillingResponse | null
  isLoading: boolean
  error: string | null
}

const initialSuggestions: AISuggestion[] = [
  {
    id: '1',
    title: 'Add fillets to sharp edges',
    description:
      'Round the sharp top edges with a 2 mm radius so the part is easier to mold and the corners do not concentrate stress.',
    operations: [
      {
        id: 'op1',
        type: 'add',
        feature: 'Edge Rounds',
        description: 'Add 2 mm fillets to the top edges',
        parameters: { radius: 2, edges: ['edge1', 'edge2', 'edge3', 'edge4'] },
      },
    ],
    status: 'pending',
  },
  {
    id: '2',
    title: 'Thicken the side walls',
    description:
      'Bump the wall thickness from 1.5 mm up to 2.5 mm so the molder can fill the cavity reliably without sink marks.',
    operations: [
      {
        id: 'op2',
        type: 'modify',
        feature: 'Base Body',
        description: 'Increase body depth: 25 mm to 30 mm',
        parameters: { depth: 30 },
      },
      {
        id: 'op3',
        type: 'modify',
        feature: 'Base Body',
        description: 'Set wall thickness to 2.5 mm',
        parameters: { wall_thickness: 2.5 },
      },
    ],
    status: 'pending',
  },
]

// Parameter IDs must match the keys in ParameterPanel's paramToSimulationKey
// table so editing values syncs through to simulationParams. The geometry
// rebuild in components/viewport/Part.tsx also keys off these IDs. Initial
// values track the bumper baseline (the default current part) — these get
// overwritten by useResultsStore.selectPart() when the user switches parts.
// Values are stored in millimetres internally — the ParameterPanel
// converts L/W/H/wall to inches at the UI boundary. Keep these aligned
// with lib/partSimInputs.ts.bumper so the panel + simulationParams +
// geometry-scale baseline all start consistent on first load.
const initialParameters: Parameter[] = [
  { id: 'p-len', name: 'Part Length', value: 1700, unit: 'mm', locked: false },
  { id: 'p-wid', name: 'Part Width', value: 220, unit: 'mm', locked: false },
  { id: 'p-height', name: 'Height', value: 380, unit: 'mm', locked: false },
  { id: 'p-draft', name: 'Draft Angle', value: 1.5, unit: '°', locked: false },
  { id: 'p-wall', name: 'Wall Thickness', value: 2, unit: 'mm', locked: false },
]

interface AppState {
  // Auth (mock for the demo — no real OAuth, just a sign-in gate)
  isAuthenticated: boolean
  setAuthenticated: (auth: boolean) => void
  logout: () => void

  // AI suggestions state
  aiSuggestions: AISuggestion[]
  acceptSuggestion: (id: string) => void
  rejectSuggestion: (id: string) => void
  previewSuggestion: (id: string) => void

  // Parameters state
  parameters: Parameter[]
  toggleParameterLock: (id: string) => void
  updateParameterValue: (id: string, value: number) => void
  addParameter: () => void

  // Preview mode
  previewMode: boolean
  setPreviewMode: (mode: boolean) => void

  // UI state
  showManufacturing: boolean
  setShowManufacturing: (show: boolean) => void
  rightPanel: RightPanelType
  setRightPanel: (panel: RightPanelType) => void
  leftCollapsed: boolean
  setLeftCollapsed: (collapsed: boolean) => void
  rightCollapsed: boolean
  setRightCollapsed: (collapsed: boolean) => void

  // AI chat panel state
  chatMessages: ChatMessage[]
  isAiThinking: boolean
  addChatMessage: (msg: Omit<ChatMessage, 'id'> | ChatMessage) => void
  /** Patch a specific chat message in place. Used by the AI proposal
   *  flow to mark a proposal accepted / rejected without re-appending
   *  the whole message. */
  updateChatMessage: (id: string, patch: Partial<ChatMessage>) => void
  setAiThinking: (thinking: boolean) => void
  clearChat: () => void

  // Viewport state — lives in the store so renderer can be swapped
  // (canvas2D ↔ r3f) and so cross-component toolbar / feature-tree
  // can drive the camera without prop-drilling.
  viewportActiveView: ViewportPreset | null
  viewportTool: ViewportTool
  viewportGrid: boolean
  viewportHeatmap: boolean
  viewportZoomNudge: number // bump this to push camera closer (+) / farther (-)
  viewportMoldMode: MoldMode
  setViewportView: (view: ViewportPreset | null) => void
  setViewportTool: (tool: ViewportTool) => void
  toggleViewportGrid: () => void
  toggleViewportHeatmap: () => void
  nudgeZoom: (delta: number) => void
  setViewportMoldMode: (mode: MoldMode) => void

  // STL upload / current part
  uploadedSTL: string | null
  setUploadedSTL: (url: string | null) => void
  currentPartId: string
  setCurrentPartId: (id: string) => void

  // Current part's world-space AABB — published by Part.tsx so Mold.tsx
  // can size the cavity/core blocks around it without a parent prop.
  // Stored as flattened tuple [minX, minY, minZ, maxX, maxY, maxZ] so
  // we can do shallow-equality checks in zustand.
  partBounds: [number, number, number, number, number, number] | null
  setPartBounds: (b: [number, number, number, number, number, number] | null) => void

  // Bounding box of the most recently uploaded STL, in its ORIGINAL
  // file units (not the viewport-rescaled size). Published by Part.tsx
  // before the STL geometry is auto-scaled to fit the camera; consumed
  // by UploadAnalyzeModal to pre-fill L/W/H without distortion.
  // Tuple = [sizeX, sizeY, sizeZ]; null when no STL is loaded.
  uploadedSTLBbox: [number, number, number] | null
  setUploadedSTLBbox: (b: [number, number, number] | null) => void

  // Flag flipped to true when an STL load completes; UploadAnalyzeModal
  // watches this and opens. Reset to false once the modal is dismissed
  // or submitted. Decouples "STL finished loading" from "modal should
  // be open" so the modal can be reopened later via a button without
  // re-uploading.
  pendingUploadAnalysis: boolean
  setPendingUploadAnalysis: (pending: boolean) => void

  // Simulation state (moldsim backend)
  simulationParams: SimulationParams
  simulationBaseline: SimulationBaseline
  simulationResults: SimulationResults
  updateSimulationParams: (params: Partial<SimulationParams>) => void
  setSimulationBaseline: (b: SimulationBaseline) => void
  setSimulationResults: (results: Partial<SimulationResults>) => void
  resetSimulationResults: () => void
}

export type ViewportPreset = 'home' | 'isometric' | 'front' | 'top' | 'right'
export type ViewportTool = 'rotate' | 'pan'
/** Mold visualization mode controlled from ViewportToolbar:
 *   - 'part'  = part only (default; original behavior)
 *   - 'mold'  = mold blocks visible, part hidden
 *   - 'both'  = part + transparent mold blocks overlaid
 */
export type MoldMode = 'part' | 'mold' | 'both'

let chatIdCounter = 0
const nextChatId = () => `msg-${Date.now()}-${chatIdCounter++}`

let parameterIdCounter = 0
const nextParameterId = () => `param-${Date.now()}-${parameterIdCounter++}`

/** g/cm³ for a material name. melt_density is stored in kg/m³, divide by
 *  1000 to convert. Falls back to ABS-ish density if name is unknown. */
function densityGPerCm3(material: string): number {
  const mat = getMaterial(material)
  return mat ? mat.melt_density / 1000 : 1.05
}

/**
 * Apply scaling to derived fields (partVolume / partWeight /
 * projectedArea) whenever a dimension, wall thickness, or material
 * changes — relative to the current simulationBaseline. Without this,
 * editing Height in the Parameters panel would update the geometry
 * scale and the max-size DFM check but leave cost/cooling math at the
 * preset value.
 *
 * Volume scales with bbox volume × wall thickness (thin-shell proxy).
 * Weight scales with volume × density. Projected area scales with the
 * footprint (L × W) only — height doesn't change footprint.
 *
 * Anything explicitly supplied in `patch` overrides the derived value
 * — so loading a fresh preset (which sets all four directly) still
 * writes preset numbers verbatim.
 */
function deriveScaledSimParams(
  current: SimulationParams,
  patch: Partial<SimulationParams>,
  baseline: SimulationBaseline,
): SimulationParams {
  const merged: SimulationParams = { ...current, ...patch }

  const touchedDims =
    'partLength' in patch ||
    'partWidth' in patch ||
    'partHeight' in patch ||
    'wallThickness' in patch ||
    'material' in patch

  if (!touchedDims) return merged

  const sizeRatio =
    (merged.partLength * merged.partWidth * merged.partHeight) /
    Math.max(1, baseline.partLength * baseline.partWidth * baseline.partHeight)
  const wallRatio = merged.wallThickness / Math.max(0.01, baseline.wallThickness)
  const footprintRatio =
    (merged.partLength * merged.partWidth) /
    Math.max(1, baseline.partLength * baseline.partWidth)
  const densityRatio =
    densityGPerCm3(merged.material) / Math.max(0.01, densityGPerCm3(baseline.material))

  if (!('partVolume' in patch)) {
    merged.partVolume = baseline.partVolume * sizeRatio * wallRatio
  }
  if (!('partWeight' in patch)) {
    merged.partWeight = baseline.partWeight * sizeRatio * wallRatio * densityRatio
  }
  if (!('projectedArea' in patch)) {
    merged.projectedArea = baseline.projectedArea * footprintRatio
  }
  return merged
}

export const useAppStore = create<AppState>((set) => ({
  // Auth state
  isAuthenticated: false,
  setAuthenticated: (auth) => set({ isAuthenticated: auth }),
  logout: () => set({ isAuthenticated: false }),

  // AI suggestions state
  aiSuggestions: initialSuggestions,
  acceptSuggestion: (id) =>
    set((state) => ({
      aiSuggestions: state.aiSuggestions.map((s) =>
        s.id === id ? { ...s, status: 'accepted' } : s
      ),
    })),
  rejectSuggestion: (id) =>
    set((state) => ({
      aiSuggestions: state.aiSuggestions.map((s) =>
        s.id === id ? { ...s, status: 'rejected' } : s
      ),
    })),
  // Mutually exclusive: previewing one suggestion drops any other that
  // was in the previewing state back to pending. Keeps the Markup
  // ribbon honest — only one suggestion is ever "active" at a time.
  previewSuggestion: (id) =>
    set((state) => ({
      aiSuggestions: state.aiSuggestions.map((s) => {
        if (s.id === id) return { ...s, status: 'previewing' }
        if (s.status === 'previewing') return { ...s, status: 'pending' }
        return s
      }),
    })),

  // Parameters state
  parameters: initialParameters,
  toggleParameterLock: (id) =>
    set((state) => ({
      parameters: state.parameters.map((p) =>
        p.id === id ? { ...p, locked: !p.locked } : p
      ),
    })),
  updateParameterValue: (id, value) =>
    set((state) => ({
      parameters: state.parameters.map((p) =>
        p.id === id ? { ...p, value } : p
      ),
    })),
  addParameter: () =>
    set((state) => ({
      parameters: [
        ...state.parameters,
        {
          id: nextParameterId(),
          name: `Parameter ${state.parameters.length + 1}`,
          value: 0,
          unit: 'mm',
          locked: false,
        },
      ],
    })),

  // Preview mode
  previewMode: false,
  setPreviewMode: (mode) => set({ previewMode: mode }),

  // UI state
  showManufacturing: false,
  setShowManufacturing: (show) => set({ showManufacturing: show }),
  rightPanel: 'ai',
  setRightPanel: (panel) => set({ rightPanel: panel }),
  leftCollapsed: false,
  setLeftCollapsed: (collapsed) => set({ leftCollapsed: collapsed }),
  rightCollapsed: false,
  setRightCollapsed: (collapsed) => set({ rightCollapsed: collapsed }),

  chatMessages: [],
  isAiThinking: false,
  addChatMessage: (msg) =>
    set((s) => ({
      chatMessages: [
        ...s.chatMessages,
        'id' in msg && msg.id ? msg : { ...msg, id: nextChatId() },
      ],
    })),
  updateChatMessage: (id, patch) =>
    set((s) => ({
      chatMessages: s.chatMessages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
  setAiThinking: (thinking) => set({ isAiThinking: thinking }),
  clearChat: () => set({ chatMessages: [], isAiThinking: false }),

  // Viewport state — drives the r3f scene. Defaults match the previous
  // canvas-2D viewport so the visual baseline is unchanged.
  viewportActiveView: 'isometric',
  viewportTool: 'rotate',
  viewportGrid: true,
  viewportHeatmap: true,
  viewportZoomNudge: 0,
  viewportMoldMode: 'part',
  setViewportView: (view) => set({ viewportActiveView: view }),
  setViewportTool: (tool) => set({ viewportTool: tool }),
  toggleViewportGrid: () => set((s) => ({ viewportGrid: !s.viewportGrid })),
  toggleViewportHeatmap: () => set((s) => ({ viewportHeatmap: !s.viewportHeatmap })),
  nudgeZoom: (delta) => set((s) => ({ viewportZoomNudge: s.viewportZoomNudge + delta })),
  setViewportMoldMode: (mode) => set({ viewportMoldMode: mode }),

  // STL upload / current part library. Bumper is the hero demo part —
  // see lib/mockMoldAnalysis.ts moldAnalysisData for the matching
  // dashboard analysis default.
  uploadedSTL: null,
  setUploadedSTL: (url) => set({ uploadedSTL: url }),
  currentPartId: 'bumper',
  setCurrentPartId: (id) => set({ currentPartId: id }),
  partBounds: null,
  setPartBounds: (b) => set({ partBounds: b }),

  uploadedSTLBbox: null,
  setUploadedSTLBbox: (b) => set({ uploadedSTLBbox: b }),
  pendingUploadAnalysis: false,
  setPendingUploadAnalysis: (pending) => set({ pendingUploadAnalysis: pending }),

  // Simulation state (moldsim backend). Defaults match the bumper hero
  // demo case — keep these in sync with lib/partSimInputs.ts.bumper so
  // the analysis pages light up with bumper data on first load.
  simulationParams: {
    material: 'PP',
    wallThickness: 2,
    partVolume: 700,
    partWeight: 640,
    projectedArea: 6460,
    partLength: 1700,
    partWidth: 220,
    partHeight: 380,
    meltTemp: 230,
    moldTemp: 50,
    productionQuantity: 50_000,
    complexity: 'very_complex',
    numCavities: 1,
    numUndercuts: 3,
    minDraftAngle: 1.5,
    hasSharpCorners: false,
    hasUniformWall: false,
  },
  simulationBaseline: {
    material: 'PP',
    wallThickness: 2,
    partVolume: 700,
    partWeight: 640,
    projectedArea: 6460,
    partLength: 1700,
    partWidth: 220,
    partHeight: 380,
  },
  simulationResults: {
    cost: null,
    cooling: null,
    dfm: null,
    filling: null,
    isLoading: false,
    error: null,
  },
  updateSimulationParams: (params) =>
    set((s) => ({
      simulationParams: deriveScaledSimParams(
        s.simulationParams,
        params,
        s.simulationBaseline,
      ),
    })),
  setSimulationBaseline: (b) => set({ simulationBaseline: b }),
  setSimulationResults: (results) =>
    set((s) => ({
      simulationResults: { ...s.simulationResults, ...results },
    })),
  resetSimulationResults: () =>
    set({
      simulationResults: {
        cost: null,
        cooling: null,
        dfm: null,
        filling: null,
        isLoading: false,
        error: null,
      },
    }),
}))
