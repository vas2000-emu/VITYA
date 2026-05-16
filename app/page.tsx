'use client'

import { ViewportContainer } from '@/components/ViewportContainer'
import { AIAssistantPanel } from '@/components/AIAssistantPanel'
import { ParameterPanel } from '@/components/ParameterPanel'
import { ManufacturingPanel } from '@/components/ManufacturingPanel'
import { Toolbar } from '@/components/Toolbar'
import { GeometryDiff } from '@/components/GeometryDiff'
import { LandingPage } from '@/components/LandingPage'
import { useAppStore } from '@/store/useAppStore'

export default function CADPage() {
  const {
    isAuthenticated,
    rightPanel,
    setRightPanel,
    leftCollapsed,
    rightCollapsed,
    showManufacturing,
    setShowManufacturing,
  } = useAppStore()

  if (!isAuthenticated) {
    return <LandingPage />
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <Toolbar />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Parameters only */}
        {!leftCollapsed && (
          <aside className="flex-shrink-0 w-64 transition-all duration-200">
            <ParameterPanel />
          </aside>
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1">
            <ViewportContainer />
          </div>
        </main>

        {/* Right Panel - AI/Manufacturing */}
        <aside
          className={`flex-shrink-0 flex flex-col bg-zinc-900 border-l border-zinc-800 transition-all duration-200 ${
            rightCollapsed ? 'w-12' : 'w-96'
          }`}
        >
          {!rightCollapsed && (
            <div className="flex border-b border-zinc-800">
              <button
                onClick={() => setRightPanel('ai')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  rightPanel === 'ai'
                    ? 'bg-zinc-950 text-blue-400 border-b-2 border-blue-400'
                    : 'text-zinc-400 hover:text-zinc-300'
                }`}
              >
                AI Assistant
              </button>
              <button
                onClick={() => {
                  setRightPanel('manufacturing')
                  if (!showManufacturing) setShowManufacturing(true)
                }}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  rightPanel === 'manufacturing'
                    ? 'bg-zinc-950 text-orange-400 border-b-2 border-orange-400'
                    : 'text-zinc-400 hover:text-zinc-300'
                }`}
              >
                Manufacturing
              </button>
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            {rightPanel === 'ai' ? <AIAssistantPanel /> : <ManufacturingPanel />}
          </div>
        </aside>
      </div>

      {/* Geometry Diff Modal */}
      <GeometryDiff />
    </div>
  )
}
