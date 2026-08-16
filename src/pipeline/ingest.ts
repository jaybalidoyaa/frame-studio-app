import { EXPORT_ASPECT, EXPORT_HEIGHT, EXPORT_WIDTH } from '../domain/types'
import type { PhotoWarning, StudioPhoto } from '../domain/types'
import { drawOrientedImage, parseExif } from './exif'

const ACCEPT = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
])

export function isSupportedImageFile(file: File): boolean {
  if (ACCEPT.has(file.type)) return true
  const ext = file.name.split('.').pop()?.toLowerCase()
  return ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(ext ?? '')
}

function blurryScore(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext('2d')
  if (!ctx) return 0
  const w = Math.min(128, canvas.width)
  const h = Math.min(128, canvas.height)
  const sample = document.createElement('canvas')
  sample.width = w
  sample.height = h
  const sctx = sample.getContext('2d')!
  sctx.drawImage(canvas, 0, 0, w, h)
  const data = sctx.getImageData(0, 0, w, h).data
  let sum = 0
  let sumSq = 0
  let n = 0
  for (let i = 0; i < data.length; i += 16) {
    const g = (data[i]! + data[i + 1]! + data[i + 2]!) / 3
    sum += g
    sumSq += g * g
    n++
  }
  if (!n) return 0
  const mean = sum / n
  return sumSq / n - mean * mean
}

export async function ingestImageFile(file: File): Promise<StudioPhoto> {
  if (!isSupportedImageFile(file)) {
    throw new Error(`Unsupported file type: ${file.name}`)
  }

  const buffer = await file.arrayBuffer()
  const exif = file.type.includes('jpeg') || /\.jpe?g$/i.test(file.name)
    ? parseExif(buffer)
    : { orientation: 1, hasGps: false }

  const blobUrl = URL.createObjectURL(file)
  let img: HTMLImageElement
  try {
    img = await loadHtmlImage(blobUrl)
  } catch {
    URL.revokeObjectURL(blobUrl)
    throw new Error(`Corrupt or unreadable image: ${file.name}`)
  }

  let oriented: HTMLCanvasElement
  try {
    oriented = drawOrientedImage(img, exif.orientation)
  } catch {
    URL.revokeObjectURL(blobUrl)
    throw new Error(`Could not orient image: ${file.name}`)
  }

  const width = oriented.width
  const height = oriented.height
  const orientedUrl = oriented.toDataURL('image/jpeg', 0.92)
  URL.revokeObjectURL(blobUrl)

  const warnings: PhotoWarning[] = []
  if (width < EXPORT_WIDTH * 0.6 || height < EXPORT_HEIGHT * 0.6) {
    warnings.push({
      code: 'too_small',
      message: `Image is small (${width}×${height}); export is ${EXPORT_WIDTH}×${EXPORT_HEIGHT}`,
    })
  }
  const aspect = width / height
  if (Math.abs(aspect - EXPORT_ASPECT) / EXPORT_ASPECT > 0.45) {
    warnings.push({
      code: 'bad_aspect',
      message: 'Aspect ratio differs substantially from 940×788 — framing may crop heavily',
    })
  }
  const variance = blurryScore(oriented)
  if (variance > 0 && variance < 80) {
    warnings.push({
      code: 'blurry',
      message: 'Image may be blurry — review before export',
    })
  }

  const orientedBlob = await new Promise<Blob>((resolve, reject) => {
    oriented.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('blob failed'))),
      'image/jpeg',
      0.92,
    )
  })

  return {
    id: crypto.randomUUID(),
    name: file.name,
    sourceUrl: orientedUrl,
    blob: orientedBlob,
    width,
    height,
    fileSize: file.size,
    mimeType: file.type || 'image/jpeg',
    orientation: 1,
    status: warnings.length ? 'warning' : 'ok',
    warnings,
    adjust: {
      zoom: 1,
      panX: 0,
      panY: 0,
      rotation: 0,
      flipH: false,
      flipV: false,
      focalX: 0.5,
      focalY: 0.5,
      brightness: 0,
      contrast: 0,
      saturation: 0,
      temperature: 0,
      sharpen: 0,
      cropMode: 'fill',
    },
    redactions: [],
    privacy: 'needs_review',
    isCover: false,
    modified: false,
  }
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('load failed'))
    img.src = src
  })
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
