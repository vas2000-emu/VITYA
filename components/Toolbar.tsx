'use client'

import {
  Box,
  Circle,
  Move,
  Pencil,
  RotateCcw,
  Save,
  Settings,
  GitCompare,
  AlertTriangle,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

export function Toolbar() {
  const { setShowDiff, showManufacturing, setShowManufacturing, setRightPanel } = useAppStore()

  const handleToggleManufacturing = () => {
    const newState = !showManufacturing
    setShowManufacturing(newState)
    if (newState) {
      setRightPanel('manufacturing')
    }
  }

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
      <nav className="flex items-center gap-1">
        <button className="px-3 py-1.5 text-sm hover:bg-zinc-800 rounded">File</button>
        <button className="px-3 py-1.5 text-sm hover:bg-zinc-800 rounded">Edit</button>
        <button className="px-3 py-1.5 text-sm hover:bg-zinc-800 rounded">View</button>
        <button className="px-3 py-1.5 text-sm hover:bg-zinc-800 rounded">Create</button>
        <button className="px-3 py-1.5 text-sm hover:bg-zinc-800 rounded">Modify</button>
        <button className="px-3 py-1.5 text-sm hover:bg-zinc-800 rounded">Analyze</button>
      </nav>

      <div className="flex items-center gap-2">
        <div className="h-6 w-px bg-zinc-700" />

        <div className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 rounded">
          <button className="p-1.5 hover:bg-zinc-700 rounded" title="Sketch">
            <Pencil className="size-4" />
          </button>
          <button className="p-1.5 hover:bg-zinc-700 rounded" title="Extrude">
            <Box className="size-4" />
          </button>
          <button className="p-1.5 hover:bg-zinc-700 rounded" title="Revolve">
            <Circle className="size-4" />
          </button>
          <button className="p-1.5 hover:bg-zinc-700 rounded" title="Move">
            <Move className="size-4" />
          </button>
        </div>

        <div className="h-6 w-px bg-zinc-700" />

        <button
          onClick={() => setShowDiff(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded"
          title="Compare geometry"
        >
          <GitCompare className="size-4" />
          <span className="text-sm">Diff</span>
        </button>

        <button
          onClick={handleToggleManufacturing}
          className={`flex items-center gap-2 px-3 py-1.5 rounded ${
            showManufacturing
              ? 'bg-orange-600 hover:bg-orange-700'
              : 'bg-zinc-800 hover:bg-zinc-700'
          }`}
          title="Manufacturing analysis"
        >
          <AlertTriangle className="size-4" />
          <span className="text-sm">Manufacturing</span>
        </button>

        <div className="h-6 w-px bg-zinc-700" />

        <button className="p-1.5 hover:bg-zinc-800 rounded" title="Undo">
          <RotateCcw className="size-4" />
        </button>
        <button className="p-1.5 hover:bg-zinc-800 rounded" title="Settings">
          <Settings className="size-4" />
        </button>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded">
          <Save className="size-4" />
          <span className="text-sm">Save</span>
        </button>
      </div>
    </header>
  )
}
