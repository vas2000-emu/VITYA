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

export function ViewportContainer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [rotation, setRotation] = useState({ x: -20, y: 30 })
  const [isDragging, setIsDragging] = useState(false)
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 })
  const { showManufacturing } = useAppStore()

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, width, height)

    drawGrid(ctx, width, height)
    drawAxes(ctx, width, height)
    draw3DPart(ctx, width, height, rotation, showManufacturing)

    if (showManufacturing) {
      drawManufacturingAnalysis(ctx, width, height)
    }
  }, [rotation, showManufacturing])

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
    setRotation({
      x: rotation.x + dy * 0.5,
      y: rotation.y + dx * 0.5,
    })
    setLastPos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900">
        <div className="flex gap-1">
          <button className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded">
            Home
          </button>
          <button className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded">
            Isometric
          </button>
          <button className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded">
            Front
          </button>
          <button className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded">
            Top
          </button>
          <button className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded">
            Right
          </button>
        </div>
        <div className="flex gap-1">
          <button className="p-1.5 hover:bg-zinc-800 rounded" title="Pan">
            <Move className="size-4" />
          </button>
          <button className="p-1.5 hover:bg-zinc-800 rounded" title="Rotate">
            <RotateCw className="size-4" />
          </button>
          <button className="p-1.5 hover:bg-zinc-800 rounded" title="Zoom In">
            <ZoomIn className="size-4" />
          </button>
          <button className="p-1.5 hover:bg-zinc-800 rounded" title="Zoom Out">
            <ZoomOut className="size-4" />
          </button>
          <button className="p-1.5 hover:bg-zinc-800 rounded" title="Fit">
            <Maximize2 className="size-4" />
          </button>
          <button className="p-1.5 hover:bg-zinc-800 rounded" title="Grid">
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
          Part 1 • 7 features
        </div>
      </div>
    </div>
  )
}

// Drawing utilities
function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const centerX = width / 2
  const centerY = height / 2
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
  showManufacturing: boolean
) {
  const centerX = width / 2
  const centerY = height / 2 - 20

  const rad = (deg: number) => (deg * Math.PI) / 180
  const rotX = rad(rot.x)
  const rotY = rad(rot.y)

  const project = (x: number, y: number, z: number) => {
    let tempY = y * Math.cos(rotX) - z * Math.sin(rotX)
    let tempZ = y * Math.sin(rotX) + z * Math.cos(rotX)
    let tempX = x * Math.cos(rotY) - tempZ * Math.sin(rotY)
    tempZ = x * Math.sin(rotY) + tempZ * Math.cos(rotY)

    const scale = 2.5
    return {
      x: centerX + tempX * scale,
      y: centerY - tempY * scale,
      z: tempZ,
    }
  }

  const baseSize = 60
  const height3d = 40
  const holeRadius = 15

  const vertices = [
    [-baseSize, -baseSize, 0],
    [baseSize, -baseSize, 0],
    [baseSize, baseSize, 0],
    [-baseSize, baseSize, 0],
    [-baseSize, -baseSize, height3d],
    [baseSize, -baseSize, height3d],
    [baseSize, baseSize, height3d],
    [-baseSize, baseSize, height3d],
  ]

  const faces = [
    [0, 1, 5, 4],
    [1, 2, 6, 5],
    [2, 3, 7, 6],
    [3, 0, 4, 7],
    [4, 5, 6, 7],
    [0, 1, 2, 3],
  ]

  const faceColors = showManufacturing
    ? ['#10b981', '#10b981', '#10b981', '#10b981', '#eab308', '#3b82f6']
    : ['#3f3f46', '#3f3f46', '#3f3f46', '#3f3f46', '#52525b', '#27272a']

  const projected = vertices.map(([x, y, z]) => project(x, y, z))

  faces.forEach((face, i) => {
    ctx.fillStyle = faceColors[i]
    ctx.strokeStyle = '#71717a'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    const [p0, p1, p2, p3] = face.map((idx) => projected[idx])
    ctx.moveTo(p0.x, p0.y)
    ctx.lineTo(p1.x, p1.y)
    ctx.lineTo(p2.x, p2.y)
    ctx.lineTo(p3.x, p3.y)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  })

  const numSegments = 32
  ctx.fillStyle = '#18181b'
  ctx.strokeStyle = '#71717a'
  ctx.beginPath()
  for (let i = 0; i <= numSegments; i++) {
    const angle = (i / numSegments) * Math.PI * 2
    const hx = Math.cos(angle) * holeRadius
    const hy = Math.sin(angle) * holeRadius
    const hp = project(hx, hy, height3d)
    if (i === 0) ctx.moveTo(hp.x, hp.y)
    else ctx.lineTo(hp.x, hp.y)
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
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
