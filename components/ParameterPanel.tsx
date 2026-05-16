'use client'

import { useState } from 'react'
import { Settings, Lock, Unlock } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

export function ParameterPanel() {
  const [editingId, setEditingId] = useState<string | null>(null)
  const { parameters, toggleParameterLock, updateParameterValue } = useAppStore()

  return (
    <div className="h-full flex flex-col bg-zinc-900 border-t border-zinc-800">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
        <Settings className="size-4" />
        <h3 className="text-sm font-medium">Parameters</h3>
      </div>

      <div className="flex-1 overflow-y-auto">
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
                    onChange={(e) => updateParameterValue(param.id, parseFloat(e.target.value))}
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
      </div>

      <div className="p-3 border-t border-zinc-800">
        <button className="w-full px-3 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded">
          + Add Parameter
        </button>
      </div>
    </div>
  )
}
