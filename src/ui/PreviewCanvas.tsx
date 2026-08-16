import { useEffect, useRef, useState } from 'react'
import { useStudioStore } from '../store/studioStore'
import { useActivePhoto } from '../store/hooks'
import { getTemplateById } from '../domain/templates'
import { composeToCanvas, loadImage } from '../pipeline/compose'

export function PreviewCanvas() {
  const draft = useStudioStore((s) => s.draft)
  const customTemplates = useStudioStore((s) => s.customTemplates)
  const activePhoto = useActivePhoto()
  const updatePhotoAdjust = useStudioStore((s) => s.updatePhotoAdjust)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(
    null,
  )
  const [showSafe, setShowSafe] = useState(true)
  const [showGrid, setShowGrid] = useState(false)
  const [compare, setCompare] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [sourceZoom, setSourceZoom] = useState(1)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const canvas = canvasRef.current
      if (!canvas || !activePhoto?.sourceUrl) {
        if (canvas) {
          const ctx = canvas.getContext('2d')
          if (ctx) {
            canvas.width = 940
            canvas.height = 788
            ctx.fillStyle = '#0b1220'
            ctx.fillRect(0, 0, 940, 788)
            ctx.fillStyle = '#94a3b8'
            ctx.font = '500 18px IBM Plex Sans, sans-serif'
            ctx.fillText('Upload photos to begin', 48, 80)
          }
        }
        return
      }
      try {
        const img = await loadImage(activePhoto.sourceUrl)
        if (cancelled) return
        const template = getTemplateById(
          activePhoto.templateIdOverride ?? draft.templateId,
          customTemplates,
        )
        let logo: HTMLImageElement | null = null
        try {
          logo = await loadImage('/branding/emblem.svg')
        } catch {
          logo = null
        }
        const framed = await composeToCanvas({
          photo: compare
            ? {
                ...activePhoto,
                adjust: {
                  ...activePhoto.adjust,
                  brightness: 0,
                  contrast: 0,
                  saturation: 0,
                  temperature: 0,
                  sharpen: 0,
                },
                redactions: [],
              }
            : activePhoto,
          image: img,
          sourceWidth: activePhoto.width,
          sourceHeight: activePhoto.height,
          template: compare
            ? { ...template, layers: { ...template.layers, showLogo: false, showTitle: false, showMetadata: false, showWatermark: false, showConfidentiality: false, showQr: false, showAccentBar: false } }
            : template,
          metadata: draft.metadata,
          shortId: draft.shortId,
          logo,
          showSafeAreas: showSafe && !compare,
          showGrid,
          scale: 1,
        })
        const ctx = canvas.getContext('2d')
        if (!ctx || cancelled) return
        canvas.width = 940
        canvas.height = 788
        ctx.drawImage(framed, 0, 0)
      } catch {
        // keep prior frame
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    activePhoto,
    draft.metadata,
    draft.templateId,
    draft.shortId,
    customTemplates,
    showSafe,
    showGrid,
    compare,
  ])

  const onPointerDown = (e: React.PointerEvent) => {
    if (!activePhoto) return
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: activePhoto.adjust.panX,
      panY: activePhoto.adjust.panY,
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !activePhoto) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    updatePhotoAdjust(activePhoto.id, {
      panX: dragRef.current.panX + dx,
      panY: dragRef.current.panY + dy,
    })
  }

  const onPointerUp = () => {
    dragRef.current = null
  }

  const onWheel = (e: React.WheelEvent) => {
    if (!activePhoto) return
    e.preventDefault()
    const next = Math.min(
      4,
      Math.max(0.5, activePhoto.adjust.zoom * (e.deltaY < 0 ? 1.06 : 0.94)),
    )
    updatePhotoAdjust(activePhoto.id, { zoom: next })
  }

  return (
    <div className={fullscreen ? 'fixed inset-0 z-40 p-4' : ''} style={fullscreen ? { background: 'var(--bg)' } : undefined}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold tracking-wide">Live preview · 940×788</h2>
        <label className="chip cursor-pointer">
          <input type="checkbox" checked={showSafe} onChange={(e) => setShowSafe(e.target.checked)} />
          Safe areas
        </label>
        <label className="chip cursor-pointer">
          <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
          Grid
        </label>
        <label className="chip cursor-pointer">
          <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
          Before
        </label>
        <button type="button" className="btn btn-ghost" onClick={() => setFullscreen((v) => !v)}>
          {fullscreen ? 'Exit full screen' : 'Full screen'}
        </button>
      </div>

      <div
        className="canvas-frame"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
        role="img"
        aria-label="Framed photo preview"
      >
        <canvas ref={canvasRef} width={940} height={788} />
      </div>

      {activePhoto && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Source inspector
            </h3>
            <div className="overflow-auto border" style={{ borderColor: 'var(--border)', maxHeight: 220 }}>
              <img
                src={activePhoto.sourceUrl}
                alt="Source"
                style={{
                  width: `${sourceZoom * 100}%`,
                  maxWidth: 'none',
                  display: 'block',
                }}
              />
            </div>
            <label className="field mt-2">
              <span>Source zoom</span>
              <input
                type="range"
                min={1}
                max={4}
                step={0.1}
                value={sourceZoom}
                onChange={(e) => setSourceZoom(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            <p>
              {activePhoto.name} · {activePhoto.width}×{activePhoto.height} ·{' '}
              {(activePhoto.fileSize / 1024).toFixed(0)} KB
            </p>
            <p className="mt-1">Privacy: {activePhoto.privacy.replaceAll('_', ' ')}</p>
            {activePhoto.warnings.map((w) => (
              <p key={w.code} className="mt-1" style={{ color: 'var(--accent-2)' }}>
                ⚠ {w.message}
              </p>
            ))}
            <p className="mt-3 text-xs">
              Drag to pan · scroll to zoom · edit controls are on the Edit step
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
