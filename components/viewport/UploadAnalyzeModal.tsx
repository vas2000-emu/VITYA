'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/useAppStore'
import { useResultsStore } from '@/store/useResultsStore'
import { runFullAnalysis } from '@/lib/moldsim-api'
import { generateCustomPartReport } from '@/lib/aiReport'
import { ALLOWED_MATERIALS } from '@/lib/types'

/** Watches useAppStore.pendingUploadAnalysis. When an STL load
 *  completes (Part.tsx flips the flag + publishes uploadedSTLBbox),
 *  this modal opens, pre-fills L/W/H from the bbox, and collects the
 *  scalar inputs the moldsim API needs that the geometry can't tell us
 *  (material, wall, draft, complexity, production quantity).
 *
 *  On submit it dispatches updateSimulationParams + setSimulationBaseline
 *  + parameter-panel mirrors, then fires the dashboard's runMoldsim so
 *  ManufacturingPanel + the DFM HUD + /analysis/* pages all render
 *  against the uploaded part. Currently the /results dashboard still
 *  shows the previously-selected part's rich-text issues — wiring a
 *  generic synthetic MoldAnalysisResult for uploaded parts is a
 *  follow-up. */
const MM_PER_INCH = 25.4

type Unit = 'mm' | 'in'

export function UploadAnalyzeModal() {
  const pending = useAppStore((s) => s.pendingUploadAnalysis)
  const bbox = useAppStore((s) => s.uploadedSTLBbox)
  const uploadedSTL = useAppStore((s) => s.uploadedSTL)
  const setPending = useAppStore((s) => s.setPendingUploadAnalysis)
  const updateSimulationParams = useAppStore((s) => s.updateSimulationParams)
  const setSimulationBaseline = useAppStore((s) => s.setSimulationBaseline)
  const setSimulationResults = useAppStore((s) => s.setSimulationResults)
  const updateParameterValue = useAppStore((s) => s.updateParameterValue)
  const setCurrentPartId = useAppStore((s) => s.setCurrentPartId)
  const addUserPart = useAppStore((s) => s.addUserPart)
  const setAnalysis = useResultsStore((s) => s.setAnalysis)

  const [unit, setUnit] = useState<Unit>('mm')
  const [material, setMaterial] = useState<string>('ABS')
  const [wallMm, setWallMm] = useState<number>(2.5)
  const [draftDeg, setDraftDeg] = useState<number>(2)
  const [complexity, setComplexity] = useState<
    'simple' | 'moderate' | 'complex' | 'very_complex'
  >('moderate')
  const [qty, setQty] = useState<number>(10_000)
  const [submitting, setSubmitting] = useState(false)

  // Display values track the chosen unit. The store always holds mm.
  const bboxDisplay = useMemo(() => {
    if (!bbox) return null
    const [x, y, z] = bbox
    if (unit === 'mm') return { x, y, z }
    return { x: x / MM_PER_INCH, y: y / MM_PER_INCH, z: z / MM_PER_INCH }
  }, [bbox, unit])

  const [lengthOverride, setLengthOverride] = useState<number | null>(null)
  const [widthOverride, setWidthOverride] = useState<number | null>(null)
  const [heightOverride, setHeightOverride] = useState<number | null>(null)

  // Reset overrides when a new STL is loaded (bbox changes).
  useEffect(() => {
    setLengthOverride(null)
    setWidthOverride(null)
    setHeightOverride(null)
  }, [bbox])

  if (!pending || !bbox || !bboxDisplay) return null

  const displayedLen = lengthOverride ?? bboxDisplay.x
  const displayedWid = widthOverride ?? bboxDisplay.z
  const displayedHei = heightOverride ?? bboxDisplay.y

  const toMm = (v: number) => (unit === 'mm' ? v : v * MM_PER_INCH)

  const handleSubmit = async () => {
    setSubmitting(true)
    setSimulationResults({ isLoading: true, error: null })
    try {
      const lenMm = toMm(displayedLen)
      const widMm = toMm(displayedWid)
      const heiMm = toMm(displayedHei)
      // Coarse volume / weight estimates from a thin-shell proxy.
      // Volume ~ bbox * wall (cm^3 from mm); weight ~ vol * density.
      // 1 g/cm^3 is a defensible mid-range density for the plastics in
      // the materials table when the user hasn't told us otherwise.
      const volCm3 = (lenMm * widMm * heiMm * wallMm) / 1_000_000
      const weightG = volCm3 * 1
      const areaCm2 = (lenMm * heiMm) / 100
      const partVolume = Math.max(1, volCm3)
      const partWeight = Math.max(1, weightG)
      const projectedArea = Math.max(1, areaCm2)

      // 1) Push the user's scalar inputs into the workspace store so the
      // DFM HUD + Parameters panel + 3D geometry baseline all align.
      setSimulationBaseline({
        material,
        wallThickness: wallMm,
        partVolume,
        partWeight,
        projectedArea,
        partLength: lenMm,
        partWidth: widMm,
        partHeight: heiMm,
      })
      updateSimulationParams({
        material,
        wallThickness: wallMm,
        partVolume,
        partWeight,
        projectedArea,
        partLength: lenMm,
        partWidth: widMm,
        partHeight: heiMm,
        complexity,
        minDraftAngle: draftDeg,
        productionQuantity: qty,
        meltTemp: 230,
        moldTemp: 50,
        numCavities: 1,
        numUndercuts: 0,
        hasSharpCorners: false,
        hasUniformWall: true,
      })
      updateParameterValue('p-len', lenMm)
      updateParameterValue('p-wid', widMm)
      updateParameterValue('p-height', heiMm)
      updateParameterValue('p-wall', wallMm)
      updateParameterValue('p-draft', draftDeg)

      // Register the uploaded STL as a switchable entry in the parts
      // sidebar / ribbon. Skip if no STL URL is currently set (modal
      // could in theory be open with a stale bbox after a clear).
      let registeredPartId: string | null = null
      let registeredLabel: string | null = null
      if (uploadedSTL) {
        registeredPartId = `user-${Date.now()}`
        registeredLabel = `Uploaded STL (${new Date().toLocaleTimeString()})`
        addUserPart({
          id: registeredPartId,
          kind: 'uploaded',
          label: registeredLabel,
          stlUrl: uploadedSTL,
          partLength: lenMm,
          partWidth: widMm,
          partHeight: heiMm,
          wallThickness: wallMm,
          material,
          createdAt: Date.now(),
        })
        setCurrentPartId(registeredPartId)
      }

      // 2) Hit the moldsim API directly with the inputs we just built.
      // Bypassing useResultsStore.runMoldsim because that path reads
      // partSimInputs[partId] — for uploaded STLs we want the live
      // values, not the demo-part defaults.
      const results = await runFullAnalysis({
        material,
        wall_thickness: wallMm,
        part_volume: partVolume,
        part_weight: partWeight,
        projected_area: projectedArea,
        part_length: lenMm,
        part_width: widMm,
        part_height: heiMm,
        melt_temp: 230,
        mold_temp: 50,
        production_quantity: qty,
        complexity,
        num_cavities: 1,
        num_undercuts: 0,
        min_draft_angle: draftDeg,
        has_sharp_corners: false,
        has_uniform_wall: true,
      })

      setSimulationResults({
        cost: results.cost,
        cooling: results.cooling,
        dfm: results.manufacturing,
        filling: results.filling,
        isLoading: false,
        error: null,
      })
      toast.success('Analysis updated for uploaded part')
      setPending(false)

      // Background: generate a rich-text report so the dashboard
      // shows AI-written issues instead of the previously-loaded
      // demo part's content. Runs after the modal closes so the user
      // gets immediate feedback; the report fills in when ready.
      if (registeredPartId && registeredLabel) {
        const report = await generateCustomPartReport({
          partId: registeredPartId,
          partName: registeredLabel,
          material,
          partLength: lenMm,
          partWidth: widMm,
          partHeight: heiMm,
          wallThickness: wallMm,
          minDraftAngle: draftDeg,
          results,
        })
        if (report) setAnalysis(report)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze upload'
      setSimulationResults({ isLoading: false, error: message })
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[420px] max-w-[95vw] rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
            <Sparkles className="size-4 text-blue-300" />
            Analyze uploaded STL
          </div>
          <button
            type="button"
            onClick={() => setPending(false)}
            title="Dismiss"
            className="p-1 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-zinc-400">Detected bounding box</div>
              <div className="inline-flex rounded border border-zinc-700 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setUnit('mm')}
                  className={`px-2 py-0.5 ${unit === 'mm' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-300'}`}
                >
                  mm
                </button>
                <button
                  type="button"
                  onClick={() => setUnit('in')}
                  className={`px-2 py-0.5 ${unit === 'in' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-300'}`}
                >
                  in
                </button>
              </div>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              STL files don&apos;t carry units — pick the one your CAD tool used. Defaults below come from the bounding box; tweak if the scale looks wrong.
            </p>
            <div className="grid grid-cols-3 gap-2">
              <DimInput
                label="Length"
                value={displayedLen}
                unit={unit}
                onChange={setLengthOverride}
              />
              <DimInput
                label="Width"
                value={displayedWid}
                unit={unit}
                onChange={setWidthOverride}
              />
              <DimInput
                label="Height"
                value={displayedHei}
                unit={unit}
                onChange={setHeightOverride}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Material">
              <select
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                title="Material"
                className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded"
              >
                {ALLOWED_MATERIALS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Complexity">
              <select
                value={complexity}
                onChange={(e) =>
                  setComplexity(e.target.value as typeof complexity)
                }
                title="Part complexity"
                className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded"
              >
                <option value="simple">Simple</option>
                <option value="moderate">Moderate</option>
                <option value="complex">Complex</option>
                <option value="very_complex">Very complex</option>
              </select>
            </Field>
            <Field label={`Wall thickness (${unit})`}>
              <input
                type="number"
                step={unit === 'mm' ? '0.1' : '0.01'}
                value={unit === 'mm' ? wallMm : (wallMm / MM_PER_INCH).toFixed(3)}
                onChange={(e) => {
                  const v = Number.parseFloat(e.target.value) || 0
                  setWallMm(unit === 'mm' ? v : v * MM_PER_INCH)
                }}
                title="Wall thickness"
                placeholder="2.5"
                className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded"
              />
            </Field>
            <Field label="Min draft (deg)">
              <input
                type="number"
                step="0.1"
                value={draftDeg}
                onChange={(e) => setDraftDeg(Number.parseFloat(e.target.value) || 0)}
                title="Minimum draft angle"
                placeholder="2"
                className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded"
              />
            </Field>
            <Field label="Production quantity" wide>
              <input
                type="number"
                step="100"
                value={qty}
                onChange={(e) => setQty(Number.parseInt(e.target.value) || 0)}
                title="Production quantity"
                placeholder="10000"
                className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded"
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setPending(false)}
              className="px-3 py-1.5 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
            >
              {submitting && <Loader2 className="size-3 animate-spin" />}
              Run analysis
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  wide,
  children,
}: Readonly<{
  label: string
  wide?: boolean
  children: React.ReactNode
}>) {
  return (
    <label className={`space-y-1 ${wide ? 'col-span-2' : ''}`}>
      <div className="text-zinc-400">{label}</div>
      {children}
    </label>
  )
}

function DimInput({
  label,
  value,
  unit,
  onChange,
}: Readonly<{
  label: string
  value: number
  unit: Unit
  onChange: (v: number | null) => void
}>) {
  return (
    <label className="space-y-1">
      <div className="text-zinc-500 text-[10px] uppercase tracking-wide">{label}</div>
      <div className="flex items-center gap-1">
        <input
          type="number"
          step={unit === 'mm' ? '1' : '0.01'}
          value={value < 10 ? value.toFixed(2) : value.toFixed(0)}
          onChange={(e) => {
            const v = Number.parseFloat(e.target.value)
            onChange(Number.isFinite(v) ? v : null)
          }}
          title={label}
          placeholder="0"
          className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded font-mono"
        />
        <span className="text-zinc-500">{unit}</span>
      </div>
    </label>
  )
}
