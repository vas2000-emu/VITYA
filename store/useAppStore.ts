import { create } from 'zustand'
import type {
  AISuggestion,
  Parameter,
  ManufacturingIssue,
  RightPanelType,
  ChatMessage,
} from '@/lib/types'
import type {
  CostResponse,
  CoolingResponse,
  ManufacturingCheckResponse,
  FillingResponse,
} from '@/lib/moldsim-api'

// Simulation state types
export interface SimulationParams {
  material: string
  wallThickness: number
  partVolume: number
  partWeight: number
  projectedArea: number
  partLength: number
  partWidth: number
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
// rebuild in components/viewport/Part.tsx also keys off these IDs.
const initialParameters: Parameter[] = [
  { id: 'p-len', name: 'Part Length', value: 120, unit: 'mm', locked: false },
  { id: 'p-wid', name: 'Part Width', value: 120, unit: 'mm', locked: false },
  { id: 'p-height', name: 'Height', value: 40, unit: 'mm', locked: false },
  { id: 'p-draft', name: 'Draft Angle', value: 2, unit: '°', locked: false },
  { id: 'p-wall', name: 'Wall Thickness', value: 2.5, unit: 'mm', locked: false },
  { id: 'p-fillet', name: 'Fillet Radius', value: 2, unit: 'mm', locked: false },
]

const initialIssues: ManufacturingIssue[] = [
  {
    id: '1',
    type: 'error',
    category: 'Undercuts',
    title: 'Undercut detected on side face',
    description: 'Geometry prevents part ejection from mold in the current parting direction.',
    location: 'Face 12',
    suggestion: 'Add draft angle or modify geometry to eliminate undercut.',
  },
  {
    id: '2',
    type: 'warning',
    category: 'Draft Angles',
    title: 'Insufficient draft angle',
    description: 'Draft angle is 1.5°, recommended minimum is 3° for this material.',
    location: 'Faces 4, 5, 6, 7',
    suggestion: 'Increase draft angle to 3° or greater.',
  },
  {
    id: '3',
    type: 'success',
    category: 'Wall Thickness',
    title: 'Wall thickness within range',
    description: 'Wall thickness is 2.5mm, within recommended range (2-4mm).',
    location: 'All walls',
  },
  {
    id: '4',
    type: 'success',
    category: 'Draft Angles',
    title: 'Top faces have adequate draft',
    description: 'Draft angles on top faces range from 3° to 5°.',
    location: 'Faces 8, 9, 10, 11',
  },
  {
    id: '5',
    type: 'info',
    category: 'Parting Line',
    title: 'Parting line location',
    description: 'Recommended parting line at mid-height of part.',
    location: 'Z = 20mm',
  },
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

  // Manufacturing issues
  manufacturingIssues: ManufacturingIssue[]

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

  // Simulation state (moldsim backend)
  simulationParams: SimulationParams
  simulationResults: SimulationResults
  updateSimulationParams: (params: Partial<SimulationParams>) => void
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

  // Manufacturing issues
  manufacturingIssues: initialIssues,

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

  // Simulation state (moldsim backend). Defaults match the bumper hero
  // demo case — keep these in sync with lib/partSimInputs.ts.bumper so
  // the analysis pages light up with bumper data on first load.
  simulationParams: {
    material: 'PP',
    wallThickness: 3,
    partVolume: 1200,
    partWeight: 1100,
    projectedArea: 6500,
    partLength: 1700,
    partWidth: 450,
    meltTemp: 230,
    moldTemp: 50,
    productionQuantity: 50_000,
    complexity: 'very_complex',
    numCavities: 1,
    numUndercuts: 3,
    minDraftAngle: 2,
    hasSharpCorners: false,
    hasUniformWall: false,
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
      simulationParams: { ...s.simulationParams, ...params },
    })),
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
