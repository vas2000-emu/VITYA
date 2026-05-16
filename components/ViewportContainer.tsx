'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Move,
  RotateCw,
  Grid3x3,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { Feature } from '@/lib/types'

const VIEW_PRESETS = {
  home: { x: -20, y: 30 },
  isometric: { x: -20, y: 30 },
  front: { x: 0, y: 0 },
  top: { x: -90, y: 0 },
  right: { x: 0, y: -90 },
} as const

type ViewName = keyof typeof VIEW_PRESETS

// Which feature ids correspond to a canonical viewport orientation.
// Every entry in this map gives the user a visible reaction when they
// click that feature button — the camera snaps to the matching view.
const FEATURE_VIEW: Record<string, ViewName> = {
  origin: 'home',
  top: 'top',
  front: 'front',
  right: 'right',
  // Sketches conceptually live on a plane; orient the viewport to
  // that plane so the user is "looking at" the sketch.
  sketch1: 'front',
  sketch2: 'top',
  // Solid features look best from an isometric or top angle.
  baseBody: 'isometric',
  mountingHole: 'top',
  edgeRounds: 'isometric',
}

const PLANE_FEATURE_IDS = new Set(['top', 'front', 'right'])

function findFeature(features: Feature[], id: string | null): Feature | null {
  if (!id) return null
  for (const f of features) {
    if (f.id === id) return f
    if (f.children) {
      const found = findFeature(f.children, id)
      if (found) return found
    }
  }
  return null
}

type Tool = 'rotate' | 'pan'

export function ViewportContainer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [rotation, setRotation] = useState({ x: -20, y: 30 })
  const [activeView, setActiveView] = useState<ViewName | null>('home')
  const [isDragging, setIsDragging] = useState(false)
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 })
  // Viewport tool / zoom / pan / grid state — all driven by the right-
  // side icon row in the viewport header.
  const [tool, setTool] = useState<Tool>('rotate')
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [showGrid, setShowGrid] = useState(true)
  const { showManufacturing, selectedFeature, selectFeature, features } =
    useAppStore()

  const selectedFeatureObj = findFeature(features, selectedFeature)

  // Snap the viewport when any mapped feature is selected — planes,
  // sketches, and solid features all reorient the camera to a sensible
  // view so every Features / Sketch tab button has a visible effect.
  useEffect(() => {
    if (!selectedFeature) return
    const view = FEATURE_VIEW[selectedFeature]
    if (view) {
      setRotation(VIEW_PRESETS[view])
      setActiveView(view)
    }
  }, [selectedFeature])

  const setView = (view: ViewName) => {
    setRotation(VIEW_PRESETS[view])
    setActiveView(view)
    // Keep tree + ribbon in sync for the three named plane views.
    // Other presets (Home / Isometric) should not wipe a non-plane
    // feature selection the user made elsewhere.
    if (PLANE_FEATURE_IDS.has(view)) {
      selectFeature(view)
    } else if (selectedFeature && PLANE_FEATURE_IDS.has(selectedFeature)) {
      selectFeature(null)
    }
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, width, height)

    if (showGrid) drawGrid(ctx, width, height, pan)
    drawAxes(ctx, width, height)
    draw3DPart(
      ctx,
      width,
      height,
      rotation,
      showManufacturing,
      !!selectedFeature,
      scale,
      pan,
    )

    if (showManufacturing) {
      drawManufacturingAnalysis(ctx, width, height)
    }
  }, [rotation, showManufacturing, selectedFeature, scale, pan, showGrid])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resizeObserver = new ResizeObserver(() => {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      draw()
    })

    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [draw])

  useEffect(() => {
    draw()
  }, [draw])

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setLastPos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const dx = e.clientX - lastPos.x
    const dy = e.clientY - lastPos.y
    if (tool === 'pan') {
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }))
    } else {
      setRotation({
        x: rotation.x + dy * 0.5,
        y: rotation.y + dx * 0.5,
      })
      // Manual rotate no longer matches any named view preset.
      if (activeView !== null) setActiveView(null)
    }
    setLastPos({ x: e.clientX, y: e.clientY })
  }

  const zoomIn = () => setScale((s) => Math.min(s * 1.2, 4))
  const zoomOut = () => setScale((s) => Math.max(s / 1.2, 0.3))
  const fitView = () => {
    setScale(1)
    setPan({ x: 0, y: 0 })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900">
        <div className="flex gap-1">
          {(
            [
              ['home', 'Home'],
              ['isometric', 'Isometric'],
              ['front', 'Front'],
              ['top', 'Top'],
              ['right', 'Right'],
            ] as const
          ).map(([view, label]) => (
            <button
              key={view}
              onClick={() => setView(view)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                activeView === view
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-zinc-800 hover:bg-zinc-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setTool('pan')}
            className={`p-1.5 rounded ${
              tool === 'pan' ? 'bg-blue-600 text-white' : 'hover:bg-zinc-800'
            }`}
            title="Pan — drag to translate the view"
          >
            <Move className="size-4" />
          </button>
          <button
            onClick={() => setTool('rotate')}
            className={`p-1.5 rounded ${
              tool === 'rotate' ? 'bg-blue-600 text-white' : 'hover:bg-zinc-800'
            }`}
            title="Rotate — drag to orbit the view"
          >
            <RotateCw className="size-4" />
          </button>
          <button
            onClick={zoomIn}
            className="p-1.5 hover:bg-zinc-800 rounded"
            title="Zoom in"
          >
            <ZoomIn className="size-4" />
          </button>
          <button
            onClick={zoomOut}
            className="p-1.5 hover:bg-zinc-800 rounded"
            title="Zoom out"
          >
            <ZoomOut className="size-4" />
          </button>
          <button
            onClick={fitView}
            className="p-1.5 hover:bg-zinc-800 rounded"
            title="Fit view (reset zoom + pan)"
          >
            <Maximize2 className="size-4" />
          </button>
          <button
            onClick={() => setShowGrid((g) => !g)}
            className={`p-1.5 rounded ${
              showGrid ? 'bg-zinc-800 text-blue-300' : 'hover:bg-zinc-800'
            }`}
            title={showGrid ? 'Hide grid' : 'Show grid'}
          >
            <Grid3x3 className="size-4" />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-zinc-900/90 border border-zinc-800 rounded text-xs">
          {selectedFeatureObj
            ? `Selected: ${selectedFeatureObj.name}`
            : `Part 1 • ${features.length + features.flatMap((f) => f.children ?? []).length} features`}
        </div>

        {activeView && (
          <div className="absolute top-4 left-4 px-2.5 py-1 bg-zinc-900/90 border border-zinc-800 rounded text-[10px] uppercase tracking-wider text-zinc-400">
            {activeView} view
          </div>
        )}
      </div>
    </div>
  )
}

// Drawing utilities
function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pan: { x: number; y: number } = { x: 0, y: 0 },
) {
  const centerX = width / 2 + pan.x
  const centerY = height / 2 + pan.y
  const gridSize = 40
  const gridExtent = 10

  ctx.strokeStyle = '#1a1a1a'
  ctx.lineWidth = 1

  for (let i = -gridExtent; i <= gridExtent; i++) {
    ctx.beginPath()
    ctx.moveTo(centerX + i * gridSize, centerY - gridExtent * gridSize)
    ctx.lineTo(centerX + i * gridSize, centerY + gridExtent * gridSize)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(centerX - gridExtent * gridSize, centerY + i * gridSize)
    ctx.lineTo(centerX + gridExtent * gridSize, centerY + i * gridSize)
    ctx.stroke()
  }

  ctx.strokeStyle = '#2a2a2a'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(centerX, centerY - gridExtent * gridSize)
  ctx.lineTo(centerX, centerY + gridExtent * gridSize)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(centerX - gridExtent * gridSize, centerY)
  ctx.lineTo(centerX + gridExtent * gridSize, centerY)
  ctx.stroke()
}

function drawAxes(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const centerX = width / 2
  const centerY = height / 2
  const axisLength = 80

  ctx.lineWidth = 2

  ctx.strokeStyle = '#ef4444'
  ctx.beginPath()
  ctx.moveTo(centerX - 150, centerY + 150)
  ctx.lineTo(centerX - 150 + axisLength, centerY + 150)
  ctx.stroke()
  ctx.fillStyle = '#ef4444'
  ctx.fillText('X', centerX - 150 + axisLength + 10, centerY + 155)

  ctx.strokeStyle = '#22c55e'
  ctx.beginPath()
  ctx.moveTo(centerX - 150, centerY + 150)
  ctx.lineTo(centerX - 150, centerY + 150 - axisLength)
  ctx.stroke()
  ctx.fillStyle = '#22c55e'
  ctx.fillText('Y', centerX - 145, centerY + 150 - axisLength - 10)

  ctx.strokeStyle = '#3b82f6'
  ctx.beginPath()
  ctx.moveTo(centerX - 150, centerY + 150)
  ctx.lineTo(centerX - 150 - 40, centerY + 150 - 40)
  ctx.stroke()
  ctx.fillStyle = '#3b82f6'
  ctx.fillText('Z', centerX - 150 - 50, centerY + 150 - 50)
}

function draw3DPart(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rot: { x: number; y: number },
  showManufacturing: boolean,
  highlightSelected: boolean,
  zoom: number = 1,
  pan: { x: number; y: number } = { x: 0, y: 0 },
) {
  const centerX = width / 2 + pan.x
  const centerY = height / 2 + 20 + pan.y

  const rad = (deg: number) => (deg * Math.PI) / 180
  const rotX = rad(rot.x)
  const rotY = rad(rot.y)
  const baseScale = 1.8 * zoom

  function project(x: number, y: number, z: number) {
    let tempY = y * Math.cos(rotX) - z * Math.sin(rotX)
    let tempZ = y * Math.sin(rotX) + z * Math.cos(rotX)
    let tempX = x * Math.cos(rotY) - tempZ * Math.sin(rotY)
    tempZ = x * Math.sin(rotY) + tempZ * Math.cos(rotY)
    return {
      x: centerX + tempX * baseScale,
      y: centerY - tempY * baseScale,
      z: tempZ,
    }
  }

  // Plastic bracket assembled from four boxes. Coordinates: X width,
  // Y depth (back is -Y), Z height (up is +Z). Bottom of the part sits
  // at Z=0 so the bracket appears to rest on the grid plane.
  //   - basePlate: wide flat slab with two mounting holes
  //   - wall:      vertical wall along the back edge of the plate
  //   - hook:      horizontal arm extending forward from the wall top
  //   - catch:     small lip hanging down at the front of the hook —
  //                this is the undercut that /results flags as issue
  //                "undercut-1"
  const boxes = [
    { cx: 0, cy: 0, cz: 6, sx: 120, sy: 80, sz: 12, kind: 'base' },
    { cx: 0, cy: -36, cz: 44, sx: 120, sy: 8, sz: 64, kind: 'wall' },
    { cx: 36, cy: -12, cz: 72, sx: 48, sy: 40, sz: 8, kind: 'hook' },
    { cx: 36, cy: 4, cz: 62, sx: 48, sy: 8, sz: 12, kind: 'catch' },
  ] as const

  type Pt = { x: number; y: number; z: number }
  interface FaceDraw {
    pts: Pt[]
    color: string
    avgZ: number
  }
  const faces: FaceDraw[] = []

  const palette = showManufacturing
    ? { top: '#34d399', side: '#10b981', bottom: '#047857', catchTop: '#f87171', catchSide: '#dc2626' }
    : { top: '#52525b', side: '#3f3f46', bottom: '#27272a', catchTop: '#52525b', catchSide: '#3f3f46' }

  for (const b of boxes) {
    const hx = b.sx / 2,
      hy = b.sy / 2,
      hz = b.sz / 2
    const v: Pt[] = [
      project(b.cx - hx, b.cy - hy, b.cz - hz), // 0 bottom-back-left
      project(b.cx + hx, b.cy - hy, b.cz - hz), // 1 bottom-back-right
      project(b.cx + hx, b.cy + hy, b.cz - hz), // 2 bottom-front-right
      project(b.cx - hx, b.cy + hy, b.cz - hz), // 3 bottom-front-left
      project(b.cx - hx, b.cy - hy, b.cz + hz), // 4 top-back-left
      project(b.cx + hx, b.cy - hy, b.cz + hz), // 5 top-back-right
      project(b.cx + hx, b.cy + hy, b.cz + hz), // 6 top-front-right
      project(b.cx - hx, b.cy + hy, b.cz + hz), // 7 top-front-left
    ]

    // In manufacturing mode, the catch geometry is the offender — tint
    // it red so the user can see the undercut without reading any text.
    const isCatch = b.kind === 'catch'
    const topColor = isCatch && showManufacturing ? palette.catchTop : palette.top
    const sideColor = isCatch && showManufacturing ? palette.catchSide : palette.side

    const boxFaces: { idx: number[]; color: string }[] = [
      { idx: [4, 5, 6, 7], color: topColor }, // top
      { idx: [0, 3, 2, 1], color: palette.bottom }, // bottom
      { idx: [0, 1, 5, 4], color: sideColor }, // back  (Y-)
      { idx: [3, 7, 6, 2], color: sideColor }, // front (Y+)
      { idx: [0, 4, 7, 3], color: sideColor }, // left  (X-)
      { idx: [1, 2, 6, 5], color: sideColor }, // right (X+)
    ]

    for (const f of boxFaces) {
      const pts = f.idx.map((i) => v[i])
      const avgZ = pts.reduce((s, p) => s + p.z, 0) / pts.length
      faces.push({ pts, color: f.color, avgZ })
    }
  }

  // Painter's algorithm — farthest faces first
  faces.sort((a, b) => a.avgZ - b.avgZ)

  const edgeColor = highlightSelected ? '#3b82f6' : '#71717a'
  for (const f of faces) {
    ctx.fillStyle = f.color
    ctx.strokeStyle = edgeColor
    ctx.lineWidth = highlightSelected ? 2 : 1.4
    ctx.beginPath()
    ctx.moveTo(f.pts[0].x, f.pts[0].y)
    for (let i = 1; i < f.pts.length; i++) {
      ctx.lineTo(f.pts[i].x, f.pts[i].y)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  // Two mounting holes through the top of the base plate
  const holeZ = 12 // top of base plate
  const holes = [
    { x: -36, y: 16 },
    { x: 36, y: 16 },
  ]
  const holeRadius = 7
  const segments = 32
  ctx.fillStyle = '#09090b'
  ctx.strokeStyle = edgeColor
  ctx.lineWidth = 1.4
  for (const h of holes) {
    ctx.beginPath()
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      const px = h.x + Math.cos(angle) * holeRadius
      const py = h.y + Math.sin(angle) * holeRadius
      const p = project(px, py, holeZ)
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
}

function drawManufacturingAnalysis(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  ctx.font = '11px monospace'

  ctx.fillStyle = '#10b981'
  ctx.fillRect(width - 180, 20, 12, 12)
  ctx.fillStyle = '#d4d4d8'
  ctx.fillText('Draft angle OK (>3°)', width - 160, 30)

  ctx.fillStyle = '#eab308'
  ctx.fillRect(width - 180, 40, 12, 12)
  ctx.fillStyle = '#d4d4d8'
  ctx.fillText('Wall thickness OK', width - 160, 50)

  ctx.fillStyle = '#3b82f6'
  ctx.fillRect(width - 180, 60, 12, 12)
  ctx.fillStyle = '#d4d4d8'
  ctx.fillText('Parting line', width - 160, 70)

  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = 2
  ctx.setLineDash([5, 5])
  ctx.strokeRect(width / 2 + 20, height / 2 - 100, 80, 60)
  ctx.setLineDash([])

  ctx.fillStyle = '#ef4444'
  ctx.fillText('⚠ Undercut detected', width / 2 + 25, height / 2 - 110)
}
