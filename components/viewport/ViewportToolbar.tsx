'use client'

import {
  Home,
  Grid3x3,
  ZoomIn,
  ZoomOut,
  Move,
  RotateCw,
  Maximize2,
  Palette,
  Box,
  Layers,
  Container,
} from 'lucide-react'
import { useAppStore, type MoldMode, type ViewportPreset } from '@/store/useAppStore'

/**
 * Header overlay above the r3f canvas. Reads/writes viewport state via
 * the store. Lives outside <Canvas> so re-renders don't re-mount the
 * 3D scene.
 */
export function ViewportToolbar({ partName }: { partName: string }) {
  const {
    viewportActiveView,
    viewportTool,
    viewportGrid,
    viewportHeatmap,
    viewportMoldMode,
    setViewportView,
    setViewportTool,
    toggleViewportGrid,
    toggleViewportHeatmap,
    nudgeZoom,
    setViewportMoldMode,
  } = useAppStore()

  const setView = (v: ViewportPreset) => setViewportView(v)
  const setMold = (m: MoldMode) => setViewportMoldMode(m)

  return (
    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-zinc-900/85 backdrop-blur border-b border-zinc-800">
      <div className="flex items-center gap-1">
        <ViewBtn label="Home" icon={<Home className="size-4" />} active={viewportActiveView === 'home'} onClick={() => setView('home')} />
        <span className="h-5 w-px bg-zinc-700 mx-1" />
        <TextBtn label="Isometric" active={viewportActiveView === 'isometric'} onClick={() => setView('isometric')} />
        <TextBtn label="Front" active={viewportActiveView === 'front'} onClick={() => setView('front')} />
        <TextBtn label="Top" active={viewportActiveView === 'top'} onClick={() => setView('top')} />
        <TextBtn label="Right" active={viewportActiveView === 'right'} onClick={() => setView('right')} />
      </div>

      <div className="text-xs text-zinc-500 font-mono tracking-wide hidden md:block">
        {partName}
      </div>

      <div className="flex items-center gap-1">
        <IconBtn
          title="Pan — drag to translate the view"
          icon={<Move className="size-4" />}
          active={viewportTool === 'pan'}
          onClick={() => setViewportTool('pan')}
        />
        <IconBtn
          title="Rotate — drag to orbit the view"
          icon={<RotateCw className="size-4" />}
          active={viewportTool === 'rotate'}
          onClick={() => setViewportTool('rotate')}
        />
        <span className="h-5 w-px bg-zinc-700 mx-1" />
        <IconBtn title="Zoom in" icon={<ZoomIn className="size-4" />} onClick={() => nudgeZoom(1)} />
        <IconBtn title="Zoom out" icon={<ZoomOut className="size-4" />} onClick={() => nudgeZoom(-1)} />
        <IconBtn title="Fit view (reset zoom + pan)" icon={<Maximize2 className="size-4" />} onClick={() => setView('home')} />
        <span className="h-5 w-px bg-zinc-700 mx-1" />
        <IconBtn
          title={viewportGrid ? 'Hide grid' : 'Show grid'}
          icon={<Grid3x3 className="size-4" />}
          active={viewportGrid}
          onClick={toggleViewportGrid}
        />
        <IconBtn
          title={viewportHeatmap ? 'Hide DFM heatmap' : 'Show DFM heatmap'}
          icon={<Palette className="size-4" />}
          active={viewportHeatmap}
          onClick={toggleViewportHeatmap}
        />
        <span className="h-5 w-px bg-zinc-700 mx-1" />
        <IconBtn
          title="Part only — DFM heatmap"
          icon={<Box className="size-4" />}
          active={viewportMoldMode === 'part'}
          onClick={() => setMold('part')}
        />
        <IconBtn
          title="Part (checker) + translucent mold"
          icon={<Layers className="size-4" />}
          active={viewportMoldMode === 'both'}
          onClick={() => setMold('both')}
        />
        <IconBtn
          title="Mold tooling view — part shown as UV checker placeholder"
          icon={<Container className="size-4" />}
          active={viewportMoldMode === 'mold'}
          onClick={() => setMold('mold')}
        />
      </div>
    </div>
  )
}

function TextBtn({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 text-xs rounded transition-colors ${
        active
          ? 'bg-blue-500/15 text-blue-300 border border-blue-500/40'
          : 'text-zinc-400 hover:bg-zinc-800 border border-transparent'
      }`}
    >
      {label}
    </button>
  )
}

function ViewBtn({
  label,
  icon,
  active,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
        active
          ? 'bg-blue-500/15 text-blue-300 border border-blue-500/40'
          : 'text-zinc-400 hover:bg-zinc-800 border border-transparent'
      }`}
    >
      {icon}
    </button>
  )
}

function IconBtn({
  title,
  icon,
  active,
  onClick,
}: {
  title: string
  icon: React.ReactNode
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-blue-500/15 text-blue-300'
          : 'text-zinc-400 hover:bg-zinc-800'
      }`}
    >
      {icon}
    </button>
  )
}
