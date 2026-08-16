import { useState } from 'react'
import { useStudioStore, DEFAULT_ADJUST } from '../../store/studioStore'
import { useActivePhoto } from '../../store/hooks'
import type { RedactionKind } from '../../domain/types'
import { providers } from '../../providers'

export function EditPanel() {
  const photo = useActivePhoto()
  const updatePhotoAdjust = useStudioStore((s) => s.updatePhotoAdjust)
  const applyAdjustToAll = useStudioStore((s) => s.applyAdjustToAll)
  const addRedaction = useStudioStore((s) => s.addRedaction)
  const clearRedactions = useStudioStore((s) => s.clearRedactions)
  const setPhotoPrivacy = useStudioStore((s) => s.setPhotoPrivacy)
  const settings = useStudioStore((s) => s.settings)
  const setDetectionConsent = useStudioStore((s) => s.setDetectionConsent)
  const toast = useStudioStore((s) => s.toast)
  const setStep = useStudioStore((s) => s.setStep)
  const [tool, setTool] = useState<RedactionKind>('blackout')

  if (!photo) {
    return (
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Image editor</h2>
        <p style={{ color: 'var(--text-muted)' }}>Select a photo first.</p>
        <button type="button" className="btn" onClick={() => setStep('photos')}>
          Go to photos
        </button>
      </div>
    )
  }

  const a = photo.adjust

  const nudge = (patch: Partial<typeof a>) => updatePhotoAdjust(photo.id, patch)

  const fit = () => nudge({ cropMode: 'fit', zoom: 1, panX: 0, panY: 0 })
  const fill = () => nudge({ cropMode: 'fill', zoom: 1, panX: 0, panY: 0 })
  const center = () => nudge({ panX: 0, panY: 0, focalX: 0.5, focalY: 0.5 })
  const reset = () => updatePhotoAdjust(photo.id, { ...DEFAULT_ADJUST })

  const placeRedaction = () => {
    addRedaction(photo.id, {
      id: crypto.randomUUID(),
      kind: tool,
      rect: { x: 0.35, y: 0.35, w: 0.3, h: 0.2 },
    })
    toast(`${tool} redaction added — baked into exports`, 'info')
  }

  const runDetection = async () => {
    if (!settings.detectionConsent) {
      toast('Enable detection consent first (local-only)', 'warn')
      return
    }
    try {
      const img = await createImageBitmap(await (await fetch(photo.sourceUrl)).blob())
      const suggestions = await providers.detection.suggest(
        img,
        settings.detectionConsent,
      )
      img.close()
      if (!suggestions.length) {
        toast('No local detection suggestions available', 'info')
        return
      }
      for (const s of suggestions) {
        addRedaction(photo.id, {
          id: crypto.randomUUID(),
          kind: 'blur',
          rect: s.rect,
        })
      }
      toast(`Added ${suggestions.length} suggestion(s)`, 'success')
    } catch {
      toast('Detection failed', 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Image editor</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Aspect locked to 940×788. Adjustments are reversible until export.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={fit}>Fit</button>
        <button type="button" className="btn" onClick={fill}>Fill</button>
        <button type="button" className="btn" onClick={center}>Center</button>
        <button type="button" className="btn" onClick={reset}>Reset</button>
        <button
          type="button"
          className="btn"
          onClick={() => nudge({ rotation: (a.rotation + 90) % 360 })}
        >
          Rotate
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => nudge({ flipH: !a.flipH })}
        >
          Flip H
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => nudge({ flipV: !a.flipV })}
        >
          Flip V
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => applyAdjustToAll(a)}
        >
          Apply to all
        </button>
      </div>

      <Slider label="Zoom" min={0.5} max={4} step={0.01} value={a.zoom} onChange={(v) => nudge({ zoom: v })} />
      <Slider label="Focal X" min={0} max={1} step={0.01} value={a.focalX} onChange={(v) => nudge({ focalX: v })} />
      <Slider label="Focal Y" min={0} max={1} step={0.01} value={a.focalY} onChange={(v) => nudge({ focalY: v })} />
      <Slider label="Brightness" min={-50} max={50} step={1} value={a.brightness} onChange={(v) => nudge({ brightness: v })} />
      <Slider label="Contrast" min={-50} max={50} step={1} value={a.contrast} onChange={(v) => nudge({ contrast: v })} />
      <Slider label="Saturation" min={-50} max={50} step={1} value={a.saturation} onChange={(v) => nudge({ saturation: v })} />
      <Slider label="Temperature" min={-50} max={50} step={1} value={a.temperature} onChange={(v) => nudge({ temperature: v })} />
      <Slider label="Sharpen" min={0} max={100} step={1} value={a.sharpen} onChange={(v) => nudge({ sharpen: v })} />

      <section className="space-y-2 border p-3" style={{ borderColor: 'var(--border)' }}>
        <h3 className="font-semibold">Privacy & redaction</h3>
        <div className="field">
          <label htmlFor="privacy">Classification</label>
          <select
            id="privacy"
            className="select"
            value={photo.privacy}
            onChange={(e) =>
              setPhotoPrivacy(
                photo.id,
                e.target.value as 'internal_only' | 'public_safe' | 'needs_review',
              )
            }
          >
            <option value="needs_review">Needs review</option>
            <option value="public_safe">Public-safe</option>
            <option value="internal_only">Internal-only</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['blur', 'pixelate', 'blackout', 'crop'] as RedactionKind[]).map((k) => (
            <button
              key={k}
              type="button"
              className={`btn ${tool === k ? 'btn-primary' : ''}`}
              onClick={() => setTool(k)}
            >
              {k}
            </button>
          ))}
          <button type="button" className="btn" onClick={placeRedaction}>
            Add {tool} region
          </button>
          <button type="button" className="btn btn-danger" onClick={() => clearRedactions(photo.id)}>
            Clear redactions
          </button>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {photo.redactions.length} redaction(s) — permanently baked into exported files.
        </p>
        <label className="chip cursor-pointer">
          <input
            type="checkbox"
            checked={settings.detectionConsent}
            onChange={(e) => setDetectionConsent(e.target.checked)}
          />
          Consent to local-only detection suggestions
        </label>
        <button type="button" className="btn" onClick={() => void runDetection()}>
          Run local suggestions
        </button>
      </section>

      <button type="button" className="btn btn-primary" onClick={() => setStep('review')}>
        Continue to review
      </button>
    </div>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div className="field">
      <label>
        {label}{' '}
        <span style={{ color: 'var(--text-muted)' }}>{value}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}
