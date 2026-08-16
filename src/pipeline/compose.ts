import { EXPORT_HEIGHT, EXPORT_WIDTH } from '../domain/types'
import type {
  FrameTemplate,
  IncidentMetadata,
  PhotoAdjust,
  RedactionMark,
  StudioPhoto,
} from '../domain/types'
import { eventLabel } from '../domain/templates'
import QRCode from 'qrcode'

export interface ComposeOptions {
  photo: StudioPhoto
  image: CanvasImageSource
  sourceWidth: number
  sourceHeight: number
  template: FrameTemplate
  metadata: IncidentMetadata
  shortId: string
  logo?: CanvasImageSource | null
  showSafeAreas?: boolean
  showGrid?: boolean
  /** Preview scale multiplier (device pixel ratio friendly) */
  scale?: number
}

function applyEnhancements(
  ctx: CanvasRenderingContext2D,
  adjust: PhotoAdjust,
): void {
  const b = 1 + adjust.brightness / 100
  const c = 1 + adjust.contrast / 100
  const s = 1 + adjust.saturation / 100
  const filters = [`brightness(${b})`, `contrast(${c})`, `saturate(${s})`]
  if (adjust.temperature !== 0) {
    // Approximate temperature via sepia + hue
    const t = Math.abs(adjust.temperature) / 100
    filters.push(`sepia(${t * 0.35})`)
    filters.push(
      `hue-rotate(${adjust.temperature > 0 ? 10 * t : -20 * t}deg)`,
    )
  }
  ctx.filter = filters.join(' ')
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
  adjust: PhotoAdjust,
): void {
  const rot = ((adjust.rotation % 360) + 360) % 360
  const swap = rot === 90 || rot === 270
  const srcW = swap ? sh : sw
  const srcH = swap ? sw : sh

  ctx.save()
  ctx.translate(dw / 2, dh / 2)
  if (adjust.flipH || adjust.flipV) {
    ctx.scale(adjust.flipH ? -1 : 1, adjust.flipV ? -1 : 1)
  }
  if (rot) ctx.rotate((rot * Math.PI) / 180)

  const mode = adjust.cropMode
  const baseScale =
    mode === 'fit'
      ? Math.min(dw / srcW, dh / srcH)
      : Math.max(dw / srcW, dh / srcH)
  const scale = baseScale * Math.max(0.1, adjust.zoom)
  const drawW = srcW * scale
  const drawH = srcH * scale

  // Focal point + pan
  const fx = (adjust.focalX - 0.5) * drawW
  const fy = (adjust.focalY - 0.5) * drawH
  const dx = -drawW / 2 + adjust.panX - fx * 0.2
  const dy = -drawH / 2 + adjust.panY - fy * 0.2

  applyEnhancements(ctx, adjust)
  ctx.drawImage(source, dx, dy, drawW, drawH)
  ctx.restore()
  ctx.filter = 'none'

  if (adjust.sharpen > 0) {
    // Lightweight sharpen via overlay — approximate
    ctx.save()
    ctx.globalAlpha = Math.min(0.35, adjust.sharpen / 200)
    ctx.globalCompositeOperation = 'overlay'
    ctx.drawImage(ctx.canvas, 0, 0)
    ctx.restore()
  }
}

function bakeRedactions(
  ctx: CanvasRenderingContext2D,
  marks: RedactionMark[],
  w: number,
  h: number,
): void {
  for (const mark of marks) {
    const x = mark.rect.x * w
    const y = mark.rect.y * h
    const rw = mark.rect.w * w
    const rh = mark.rect.h * h

    if (mark.kind === 'blackout') {
      ctx.fillStyle = '#000000'
      ctx.fillRect(x, y, rw, rh)
      continue
    }

    if (mark.kind === 'crop') {
      // Crop redaction hides by blackout outside region is handled as blackout of region content
      ctx.fillStyle = '#000000'
      ctx.fillRect(x, y, rw, rh)
      continue
    }

    if (rw < 1 || rh < 1) continue
    const region = ctx.getImageData(
      Math.max(0, Math.floor(x)),
      Math.max(0, Math.floor(y)),
      Math.max(1, Math.floor(rw)),
      Math.max(1, Math.floor(rh)),
    )

    if (mark.kind === 'pixelate') {
      const block = Math.max(6, Math.floor(Math.min(rw, rh) / 12))
      const tmp = document.createElement('canvas')
      tmp.width = Math.max(1, Math.ceil(rw / block))
      tmp.height = Math.max(1, Math.ceil(rh / block))
      const tctx = tmp.getContext('2d')!
      const src = document.createElement('canvas')
      src.width = region.width
      src.height = region.height
      src.getContext('2d')!.putImageData(region, 0, 0)
      tctx.imageSmoothingEnabled = false
      tctx.drawImage(src, 0, 0, tmp.width, tmp.height)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(tmp, x, y, rw, rh)
      ctx.imageSmoothingEnabled = true
      continue
    }

    // blur
    const tmp = document.createElement('canvas')
    tmp.width = region.width
    tmp.height = region.height
    const tctx = tmp.getContext('2d')!
    tctx.putImageData(region, 0, 0)
    ctx.save()
    ctx.filter = 'blur(12px)'
    ctx.drawImage(tmp, x, y, rw, rh)
    ctx.filter = 'none'
    // Extra pass for stronger bake
    ctx.filter = 'blur(8px)'
    ctx.drawImage(ctx.canvas, x, y, rw, rh, x, y, rw, rh)
    ctx.restore()
  }
}

function fillRectNorm(
  ctx: CanvasRenderingContext2D,
  r: { x: number; y: number; w: number; h: number },
  W: number,
  H: number,
  style: string,
): void {
  ctx.fillStyle = style
  ctx.fillRect(r.x * W, r.y * H, r.w * W, r.h * H)
}

function drawTemplateChrome(
  ctx: CanvasRenderingContext2D,
  template: FrameTemplate,
  metadata: IncidentMetadata,
  shortId: string,
  W: number,
  H: number,
  logo: CanvasImageSource | null | undefined,
  qrImage: HTMLImageElement | null,
): void {
  const { layers, layout, accentColor, fontScale } = template
  const fs = 14 * fontScale

  if (layers.showAccentBar) {
    fillRectNorm(ctx, layout.accentBar, W, H, accentColor)
  }

  // Soft bottom gradient for metadata readability
  if (layers.showMetadata || layers.showTitle) {
    const g = ctx.createLinearGradient(0, H * 0.7, 0, H)
    g.addColorStop(0, 'rgba(11,18,32,0)')
    g.addColorStop(1, 'rgba(11,18,32,0.82)')
    ctx.fillStyle = g
    ctx.fillRect(0, H * 0.7, W, H * 0.3)
  }

  if (layers.showLogo && logo) {
    const r = layout.logo
    ctx.drawImage(logo, r.x * W, r.y * H, r.w * W, r.h * H)
  }

  ctx.fillStyle = '#e8edf5'
  ctx.textBaseline = 'top'

  if (layers.showTitle && template.titleLabel) {
    const r = layout.title
    ctx.font = `700 ${fs * 1.15}px "IBM Plex Sans", sans-serif`
    ctx.fillText(template.titleLabel, r.x * W, r.y * H, r.w * W)
  }

  if (layers.showConfidentiality && template.confidentialityLabel) {
    const r = layout.confidentiality
    ctx.fillStyle = accentColor
    ctx.fillRect(r.x * W, r.y * H, r.w * W, r.h * H)
    ctx.fillStyle = '#0b1220'
    ctx.font = `700 ${fs * 0.75}px "IBM Plex Sans", sans-serif`
    ctx.fillText(
      template.confidentialityLabel,
      r.x * W + 6,
      r.y * H + 4,
      r.w * W - 12,
    )
  }

  if (layers.showMetadata) {
    const r = layout.metadata
    const lines = [
      eventLabel(metadata).toUpperCase(),
      metadata.dateTimeLocal
        ? new Date(metadata.dateTimeLocal).toLocaleString().toUpperCase()
        : '',
      metadata.location
        ? `${metadata.generalAreaOnly ? 'AREA: ' : 'LOC: '}${metadata.location.toUpperCase()}`
        : '',
      metadata.callsign ? `UNIT: ${metadata.callsign.toUpperCase()}` : '',
      metadata.referenceNumber
        ? `REF: ${metadata.referenceNumber.toUpperCase()}`
        : '',
    ].filter(Boolean)

    ctx.fillStyle = '#e8edf5'
    ctx.font = `500 ${fs * 0.85}px "IBM Plex Mono", monospace`
    let yy = r.y * H
    for (const line of lines) {
      ctx.fillText(line, r.x * W, yy, r.w * W)
      yy += fs * 1.05
    }
  }

  if (layers.showWatermark && template.watermarkText) {
    const r = layout.watermark
    ctx.save()
    ctx.globalAlpha = 0.28
    ctx.fillStyle = accentColor
    ctx.font = `700 ${fs * 1.4}px "IBM Plex Sans", sans-serif`
    ctx.translate(r.x * W, r.y * H + r.h * H)
    ctx.rotate(-0.2)
    ctx.fillText(template.watermarkText, 0, 0, r.w * W)
    ctx.restore()
  }

  if (layers.showQr) {
    const r = layout.qr
    if (qrImage) {
      ctx.drawImage(qrImage, r.x * W, r.y * H, r.w * W, r.h * H)
    } else {
      ctx.fillStyle = '#fff'
      ctx.fillRect(r.x * W, r.y * H, r.w * W, r.h * H)
      ctx.fillStyle = '#0b1220'
      ctx.font = `600 ${fs * 0.6}px "IBM Plex Mono", monospace`
      ctx.fillText(shortId.slice(0, 8), r.x * W + 4, r.y * H + r.h * H * 0.4)
    }
  }
}

async function loadQr(shortId: string): Promise<HTMLImageElement | null> {
  try {
    const url = await QRCode.toDataURL(`incident:${shortId}`, {
      margin: 1,
      width: 256,
      color: { dark: '#0b1220', light: '#ffffff' },
    })
    return await loadImage(url)
  } catch {
    return null
  }
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

export async function composeToCanvas(
  options: ComposeOptions,
): Promise<HTMLCanvasElement> {
  const scale = options.scale ?? 1
  const W = Math.round(EXPORT_WIDTH * scale)
  const H = Math.round(EXPORT_HEIGHT * scale)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unsupported')

  ctx.fillStyle = '#0b1220'
  ctx.fillRect(0, 0, W, H)

  drawCover(
    ctx,
    options.image,
    options.sourceWidth,
    options.sourceHeight,
    W,
    H,
    options.photo.adjust,
  )

  bakeRedactions(ctx, options.photo.redactions, W, H)

  let qr: HTMLImageElement | null = null
  if (options.template.layers.showQr) {
    qr = await loadQr(options.shortId)
  }

  drawTemplateChrome(
    ctx,
    options.template,
    options.metadata,
    options.shortId,
    W,
    H,
    options.logo,
    qr,
  )

  if (options.showSafeAreas) {
    const r = options.template.layout.photoSafe
    ctx.strokeStyle = 'rgba(232,163,23,0.7)'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    ctx.strokeRect(r.x * W, r.y * H, r.w * W, r.h * H)
    ctx.setLineDash([])
  }

  if (options.showGrid) {
    ctx.strokeStyle = 'rgba(232,237,245,0.2)'
    ctx.lineWidth = 1
    for (let i = 1; i < 3; i++) {
      ctx.beginPath()
      ctx.moveTo((W * i) / 3, 0)
      ctx.lineTo((W * i) / 3, H)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, (H * i) / 3)
      ctx.lineTo(W, (H * i) / 3)
      ctx.stroke()
    }
  }

  return canvas
}

/** Export exactly 940×788 */
export async function exportFramedBlob(
  options: ComposeOptions,
  format: 'image/png' | 'image/jpeg' = 'image/png',
  quality = 0.92,
): Promise<{ blob: Blob; width: number; height: number }> {
  const canvas = await composeToCanvas({ ...options, scale: 1 })
  if (canvas.width !== EXPORT_WIDTH || canvas.height !== EXPORT_HEIGHT) {
    const out = document.createElement('canvas')
    out.width = EXPORT_WIDTH
    out.height = EXPORT_HEIGHT
    const octx = out.getContext('2d')!
    octx.imageSmoothingEnabled = true
    octx.imageSmoothingQuality = 'high'
    octx.drawImage(canvas, 0, 0, EXPORT_WIDTH, EXPORT_HEIGHT)
    const blob = await canvasToBlob(out, format, quality)
    return { blob, width: EXPORT_WIDTH, height: EXPORT_HEIGHT }
  }
  const blob = await canvasToBlob(canvas, format, quality)
  return { blob, width: canvas.width, height: canvas.height }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Export failed'))),
      type,
      quality,
    )
  })
}

/** Sample center pixel alpha of a blackout region for tests */
export function sampleRedactionCenter(
  canvas: HTMLCanvasElement,
  mark: RedactionMark,
): Uint8ClampedArray {
  const ctx = canvas.getContext('2d')!
  const cx = Math.floor((mark.rect.x + mark.rect.w / 2) * canvas.width)
  const cy = Math.floor((mark.rect.y + mark.rect.h / 2) * canvas.height)
  return ctx.getImageData(cx, cy, 1, 1).data
}
