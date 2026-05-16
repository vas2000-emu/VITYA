'use client'

import { useRef, useState, useEffect, type DragEvent } from 'react'
import { Upload, ChevronUp, FileBox, FolderOpen, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/useAppStore'

/**
 * Drag-drop + drop-up menu controlling the STL source.
 *
 * The menu offers:
 *   • Load sample STL (fetched from /parts/bracket.stl)
 *   • Upload .stl from your computer (file picker)
 *   • Clear (revert to procedural geometry; only when an STL is loaded)
 *
 * Drag-drop on the canvas still works at any time.
 */
export function STLDropzone({ children }: { children: React.ReactNode }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const uploadedSTL = useAppStore((s) => s.uploadedSTL)
  const setUploadedSTL = useAppStore((s) => s.setUploadedSTL)

  // Click-outside closes the menu.
  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  const acceptFile = (file: File | undefined) => {
    if (!file) return
    if (!/\.stl$/i.test(file.name)) {
      toast.error('Only .stl files are supported in this demo.')
      return
    }
    if (uploadedSTL) URL.revokeObjectURL(uploadedSTL)
    const url = URL.createObjectURL(file)
    setUploadedSTL(url)
    toast.success(`Loaded ${file.name}`, {
      description: `${(file.size / 1024).toFixed(1)} KB — analysis is still demo data`,
    })
  }

  const loadSample = async () => {
    setMenuOpen(false)
    try {
      const res = await fetch('/parts/bracket.stl')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      if (uploadedSTL) URL.revokeObjectURL(uploadedSTL)
      const url = URL.createObjectURL(blob)
      setUploadedSTL(url)
      toast.success('Loaded sample STL', {
        description: 'bracket.stl — same geometry as the demo bracket, served as a real STL',
      })
    } catch (err) {
      toast.error('Could not load sample STL', { description: String(err) })
    }
  }

  const pickFile = () => {
    setMenuOpen(false)
    inputRef.current?.click()
  }

  const clearUpload = () => {
    setMenuOpen(false)
    if (uploadedSTL) URL.revokeObjectURL(uploadedSTL)
    setUploadedSTL(null)
    toast('Cleared STL', { description: 'Returned to the procedural demo geometry.' })
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    acceptFile(e.dataTransfer.files[0])
  }

  return (
    <div
      className="relative w-full h-full"
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      {children}

      {/* drop-up menu pill — bottom-left of viewport */}
      <div className="absolute bottom-3 left-3 z-10" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs bg-zinc-900/85 backdrop-blur border border-zinc-700 hover:border-zinc-500 rounded-md text-zinc-200 transition-colors"
          aria-haspopup="true"
          aria-expanded={menuOpen ? 'true' : 'false'}
          title="STL source"
        >
          <Upload className="size-3.5" />
          {uploadedSTL ? 'STL loaded' : 'Load STL'}
          <ChevronUp className={`size-3 transition-transform ${menuOpen ? '' : 'rotate-180'}`} />
        </button>

        {menuOpen && (
          <div className="absolute bottom-full mb-2 left-0 min-w-[220px] bg-zinc-900/95 backdrop-blur border border-zinc-700 rounded-md shadow-lg overflow-hidden">
            <MenuItem icon={<FileBox className="size-4" />} onClick={loadSample}>
              <span className="flex-1">Load sample STL</span>
              <span className="text-[10px] text-zinc-500">bracket.stl</span>
            </MenuItem>
            <MenuItem icon={<FolderOpen className="size-4" />} onClick={pickFile}>
              Upload .stl from computer…
            </MenuItem>
            {uploadedSTL && (
              <>
                <div className="h-px bg-zinc-800 my-1" />
                <MenuItem
                  icon={<Trash2 className="size-4 text-rose-400" />}
                  onClick={clearUpload}
                  tone="danger"
                >
                  Clear &amp; revert to demo geometry
                </MenuItem>
              </>
            )}
            <div className="px-3 py-2 text-[10px] text-zinc-500 border-t border-zinc-800">
              Or just drag an .stl onto the viewport.
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".stl"
          aria-label="Upload an STL file"
          className="hidden"
          onChange={(e) => acceptFile(e.target.files?.[0] ?? undefined)}
        />
      </div>

      {/* drag overlay */}
      {dragging && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-blue-500/15 border-2 border-dashed border-blue-400 pointer-events-none">
          <div className="px-6 py-4 rounded-lg bg-zinc-900/95 border border-blue-500/40 text-blue-200 text-sm font-medium">
            Drop .stl to load it into the viewport
          </div>
        </div>
      )}
    </div>
  )
}

function MenuItem({
  icon,
  onClick,
  children,
  tone = 'default',
}: {
  icon: React.ReactNode
  onClick: () => void
  children: React.ReactNode
  tone?: 'default' | 'danger'
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${
        tone === 'danger'
          ? 'text-rose-300 hover:bg-rose-500/10'
          : 'text-zinc-200 hover:bg-zinc-800'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}
