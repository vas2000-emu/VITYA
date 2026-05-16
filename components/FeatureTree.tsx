'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Box,
  Circle,
  Square,
  Plus,
  Minus,
  Eye,
  EyeOff,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { Feature, FeatureType } from '@/lib/types'

const featureIcons: Record<FeatureType, React.ReactNode> = {
  sketch: <Square className="size-4 text-blue-400" />,
  extrude: <Box className="size-4 text-cyan-400" />,
  revolve: <Circle className="size-4 text-green-400" />,
  fillet: <Circle className="size-4 text-yellow-400" />,
  chamfer: <Circle className="size-4 text-purple-400" />,
  hole: <Circle className="size-4 text-orange-400" />,
  plane: <Square className="size-4 text-zinc-400" />,
  origin: <Circle className="size-4 text-zinc-500" />,
}

interface FeatureItemProps {
  feature: Feature
  level?: number
}

function FeatureItem({ feature, level = 0 }: FeatureItemProps) {
  const [expanded, setExpanded] = useState(true)
  const [visible, setVisible] = useState(feature.visible !== false)
  const { selectedFeature, selectFeature } = useAppStore()
  const hasChildren = feature.children && feature.children.length > 0

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1 text-sm cursor-pointer hover:bg-zinc-800/50 group ${
          selectedFeature === feature.id ? 'bg-blue-500/20' : ''
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => selectFeature(feature.id)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            className="p-0.5 hover:bg-zinc-700 rounded"
          >
            {expanded ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
          </button>
        ) : (
          <div className="w-4" />
        )}
        {featureIcons[feature.type]}
        <span className="flex-1 truncate">{feature.name}</span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setVisible(!visible)
          }}
          className="p-0.5 hover:bg-zinc-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {visible ? (
            <Eye className="size-3" />
          ) : (
            <EyeOff className="size-3 opacity-50" />
          )}
        </button>
      </div>
      {hasChildren && expanded && (
        <div>
          {feature.children?.map((child) => (
            <FeatureItem key={child.id} feature={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function FeatureTree() {
  const [searchQuery, setSearchQuery] = useState('')
  const {
    features,
    selectedFeature,
    leftCollapsed,
    setLeftCollapsed,
    addFeature,
    removeFeature,
  } = useAppStore()

  if (leftCollapsed) {
    return (
      <div className="h-full flex flex-col bg-zinc-900 border-r border-zinc-800 w-12">
        <div className="flex flex-col items-center py-3 border-b border-zinc-800">
          <button
            onClick={() => setLeftCollapsed(false)}
            className="p-2 hover:bg-zinc-800 rounded"
            title="Expand Features"
          >
            <PanelLeft className="size-4" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center gap-2 py-3">
          <Box className="size-4 text-zinc-500" />
          <Square className="size-4 text-zinc-500" />
          <Circle className="size-4 text-zinc-500" />
        </div>
      </div>
    )
  }

  const filteredFeatures = searchQuery
    ? features.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : features

  return (
    <div className="h-full flex flex-col bg-zinc-900 border-r border-zinc-800">
      <div className="p-3 border-b border-zinc-800">
        <input
          type="text"
          placeholder="Filter by name or type"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded outline-none focus:border-blue-500"
        />
      </div>

      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <span className="text-sm font-medium">Features ({features.length})</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => addFeature()}
            className="p-1 hover:bg-zinc-800 rounded"
            title="Add feature"
            aria-label="Add feature"
          >
            <Plus className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => selectedFeature && removeFeature(selectedFeature)}
            disabled={!selectedFeature}
            className="p-1 hover:bg-zinc-800 rounded disabled:opacity-40 disabled:cursor-not-allowed"
            title={selectedFeature ? 'Remove selected feature' : 'Select a feature first'}
            aria-label="Remove selected feature"
          >
            <Minus className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setLeftCollapsed(true)}
            className="p-1 hover:bg-zinc-800 rounded"
            title="Collapse Features"
          >
            <PanelLeftClose className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredFeatures.map((feature) => (
          <FeatureItem key={feature.id} feature={feature} />
        ))}
      </div>

      <div className="p-3 border-t border-zinc-800">
        <div className="text-xs text-zinc-500">Parts (1)</div>
        <div className="flex items-center gap-2 px-2 py-1 mt-1 text-sm hover:bg-zinc-800/50 rounded cursor-pointer">
          <Box className="size-4" />
          <span>Part 1</span>
        </div>
      </div>
    </div>
  )
}
