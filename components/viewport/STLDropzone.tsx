'use client'

import { useRef, useState, type DragEvent } from 'react'
import { Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/useAppStore'

/**
 * Drag-drop + click-to-upload zone wrapping the r3f canvas. Sets the
 * Blob URL on useAppStore.uploadedSTL; <Part /> picks it up reactively.
 * Renders a thin top-strip control plus a full-canvas overlay while
 * dragging.
 */
export function STLDropzone({ children }: { children: React.ReactNode }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const uploadedSTL = useAppStore((s) => s.uploadedSTL)
  const setUploadedSTL = useAppStore((s) => s.setUploadedSTL)

  const accept = (file: File | undefined) => {
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

  const clearUpload = () => {
    if (uploadedSTL) URL.revokeObjectURL(uploadedSTL)
    setUploadedSTL(null)
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    accept(e.dataTransfer.files[0])
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

      {/* upload pill — bottom-left of viewport */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-1.5 text-xs bg-zinc-900/85 backdrop-blur border border-zinc-700 hover:border-zinc-500 rounded-md text-zinc-200 transition-colors"
          title="Upload an .stl file"
        >
          <Upload className="size-3.5" />
          {uploadedSTL ? 'Replace STL' : 'Upload .stl'}
        </button>
        {uploadedSTL && (
          <button
            type="button"
            onClick={clearUpload}
            className="flex items-center gap-1 px-2 py-1.5 text-xs bg-zinc-900/85 backdrop-blur border border-zinc-700 hover:border-rose-500/60 hover:text-rose-300 rounded-md text-zinc-400 transition-colors"
            title="Remove uploaded STL and return to demo part"
          >
            <X className="size-3.5" />
            Clear
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".stl"
          className="hidden"
          onChange={(e) => accept(e.target.files?.[0] ?? undefined)}
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
