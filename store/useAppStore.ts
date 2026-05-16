import { create } from 'zustand'
import type {
  Feature,
  AISuggestion,
  Parameter,
  ManufacturingIssue,
  RightPanelType,
  ChatMessage,
} from '@/lib/types'

// Mock data — feature names kept in plain English so non-CAD users can
// read the toolbar without translating CAD jargon ("Extrude 1" -> "Base
// Body", "Hole 1" -> "Mounting Hole", etc).
const initialFeatures: Feature[] = [
  {
    id: 'origin',
    name: 'Origin',
    type: 'origin',
    children: [
      { id: 'top', name: 'Top Plane', type: 'plane' },
      { id: 'front', name: 'Front Plane', type: 'plane' },
      { id: 'right', name: 'Right Plane', type: 'plane' },
    ],
  },
  { id: 'sketch1', name: 'Sketch 1', type: 'sketch' },
  { id: 'sketch2', name: 'Sketch 2', type: 'sketch' },
  { id: 'baseBody', name: 'Base Body', type: 'extrude' },
  { id: 'mountingHole', name: 'Mounting Hole', type: 'hole' },
  { id: 'edgeRounds', name: 'Edge Rounds', type: 'fillet' },
]

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

const initialParameters: Parameter[] = [
  { id: 'p1', name: 'Base Width', value: 120, unit: 'mm', locked: true, constraint: 'width' },
  { id: 'p2', name: 'Base Length', value: 120, unit: 'mm', locked: false },
  { id: 'p3', name: 'Height', value: 40, unit: 'mm', locked: false },
  { id: 'p4', name: 'Hole Diameter', value: 30, unit: 'mm', locked: false, constraint: 'diameter' },
  { id: 'p5', name: 'Wall Thickness', value: 2.5, unit: 'mm', locked: false },
  { id: 'p6', name: 'Fillet Radius', value: 2, unit: 'mm', locked: false },
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
  // Feature state
  features: Feature[]
  selectedFeature: string | null
  selectFeature: (id: string | null) => void

  // AI suggestions state
  aiSuggestions: AISuggestion[]
  acceptSuggestion: (id: string) => void
  rejectSuggestion: (id: string) => void
  previewSuggestion: (id: string) => void

  // Parameters state
  parameters: Parameter[]
  toggleParameterLock: (id: string) => void
  updateParameterValue: (id: string, value: number) => void

  // Manufacturing issues
  manufacturingIssues: ManufacturingIssue[]

  // Preview mode
  previewMode: boolean
  setPreviewMode: (mode: boolean) => void

  // UI state
  showDiff: boolean
  setShowDiff: (show: boolean) => void
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
  addChatMessage: (msg: ChatMessage) => void
  setAiThinking: (thinking: boolean) => void
  clearChat: () => void
}

export const useAppStore = create<AppState>((set) => ({
  // Feature state
  features: initialFeatures,
  selectedFeature: null,
  selectFeature: (id) => set({ selectedFeature: id }),

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

  // Manufacturing issues
  manufacturingIssues: initialIssues,

  // Preview mode
  previewMode: false,
  setPreviewMode: (mode) => set({ previewMode: mode }),

  // UI state
  showDiff: false,
  setShowDiff: (show) => set({ showDiff: show }),
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
    set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  setAiThinking: (thinking) => set({ isAiThinking: thinking }),
  clearChat: () => set({ chatMessages: [], isAiThinking: false }),
}))
