'use client'

import { useState } from 'react'
import { Settings, Lock, Unlock, Beaker } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

// Maps design parameters to simulation parameters. IDs here MUST match
// those in store/useAppStore.ts initialParameters or edits silently
// no-op. Any param not in this map still updates locally; only mapped
// ones propagate to the moldsim API call shape.
const paramToSimulationKey: Record<string, keyof import('@/store/useAppStore').SimulationParams> = {
  'p-wall': 'wallThickness',
  'p-draft': 'minDraftAngle',
  'p-len': 'partLength',
  'p-wid': 'partWidth',
}

export function ParameterPanel() {
  const [editingId, setEditingId] = useState<string | null>(null)
  const {
    parameters,
    toggleParameterLock,
    updateParameterValue,
    addParameter,
    simulationParams,
    updateSimulationParams,
  } = useAppStore()

  // Handle parameter value change, sync with simulation params if applicable
  const handleValueChange = (paramId: string, newValue: number) => {
    updateParameterValue(paramId, newValue)

    // Sync to simulation params if this is a mapped parameter
    const simKey = paramToSimulationKey[paramId]
    if (simKey) {
      updateSimulationParams({ [simKey]: newValue })
    }
  }

  return (
    <div className="h-full flex flex-col bg-zinc-900 border-t border-zinc-800">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
        <Settings className="size-4" />
        <h3 className="text-sm font-medium">Parameters</h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Design Parameters */}
        <div className="p-3 space-y-1">
          {parameters.map((param) => (
            <div
              key={param.id}
              className="flex items-center gap-2 px-2 py-2 hover:bg-zinc-800/50 rounded group"
            >
              <button
                onClick={() => toggleParameterLock(param.id)}
                className="p-1 hover:bg-zinc-700 rounded opacity-50 group-hover:opacity-100"
              >
                {param.locked ? (
                  <Lock className="size-3" />
                ) : (
                  <Unlock className="size-3" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="text-xs text-zinc-400 truncate">{param.name}</div>
                {param.constraint && (
                  <div className="text-[10px] text-blue-400 font-mono">{param.constraint}</div>
                )}
              </div>

              <div className="flex items-center gap-1">
                {editingId === param.id ? (
                  <input
                    type="number"
                    value={param.value}
                    onChange={(e) => handleValueChange(param.id, parseFloat(e.target.value) || 0)}
                    onBlur={() => setEditingId(null)}
                    autoFocus
                    className="w-16 px-2 py-1 text-xs text-right bg-zinc-800 border border-blue-500 rounded outline-none"
                  />
                ) : (
                  <div
                    onClick={() => !param.locked && setEditingId(param.id)}
                    className={`px-2 py-1 text-xs text-right font-mono rounded ${
                      param.locked ? 'text-zinc-500' : 'hover:bg-zinc-700 cursor-pointer'
                    }`}
                  >
                    {param.value}
                  </div>
                )}
                <span className="text-xs text-zinc-500 w-8">{param.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Simulation Parameters Section */}
        <div className="border-t border-zinc-800">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
            <Beaker className="size-4 text-blue-400" />
            <h3 className="text-sm font-medium">Simulation Settings</h3>
          </div>
          
          <div className="p-3 space-y-3">
            {/* Material Selection */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Material</label>
              <select
                value={simulationParams.material}
                onChange={(e) => updateSimulationParams({ material: e.target.value })}
                className="w-full px-2 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded"
              >
                <option value="ABS">ABS</option>
                <option value="PP">Polypropylene (PP)</option>
                <option value="PE-HD">PE-HD</option>
                <option value="PA6">PA6 (Nylon 6)</option>
                <option value="PC">Polycarbonate (PC)</option>
              </select>
            </div>

            {/* Melt Temperature */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Melt Temp (C)</label>
              <input
                type="number"
                value={simulationParams.meltTemp}
                onChange={(e) => updateSimulationParams({ meltTemp: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded"
              />
            </div>

            {/* Mold Temperature */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Mold Temp (C)</label>
              <input
                type="number"
                value={simulationParams.moldTemp}
                onChange={(e) => updateSimulationParams({ moldTemp: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded"
              />
            </div>

            {/* Production Quantity */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Production Qty</label>
              <input
                type="number"
                value={simulationParams.productionQuantity}
                onChange={(e) => updateSimulationParams({ productionQuantity: parseInt(e.target.value) || 0 })}
                className="w-full px-2 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded"
              />
            </div>

            {/* Complexity */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Part Complexity</label>
              <select
                value={simulationParams.complexity}
                onChange={(e) => updateSimulationParams({ complexity: e.target.value as 'simple' | 'moderate' | 'complex' | 'very_complex' })}
                className="w-full px-2 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded"
              >
                <option value="simple">Simple</option>
                <option value="moderate">Moderate</option>
                <option value="complex">Complex</option>
                <option value="very_complex">Very Complex</option>
              </select>
            </div>

            {/* Number of Cavities */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Mold Cavities</label>
              <input
                type="number"
                min="1"
                max="64"
                value={simulationParams.numCavities}
                onChange={(e) => updateSimulationParams({ numCavities: parseInt(e.target.value) || 1 })}
                className="w-full px-2 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-zinc-800">
        <button
          type="button"
          onClick={addParameter}
          className="w-full px-3 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded"
        >
          + Add Parameter
        </button>
      </div>
    </div>
  )
}
