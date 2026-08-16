/**
 * Minimal EXIF orientation reader + strip helpers.
 * Public exports are canvas-baked and therefore EXIF-free by default.
 */

export interface ExifInfo {
  orientation: number
  hasGps: boolean
}

function readUint16(view: DataView, offset: number, little: boolean): number {
  return little ? view.getUint16(offset, true) : view.getUint16(offset, false)
}

function readUint32(view: DataView, offset: number, little: boolean): number {
  return little ? view.getUint32(offset, true) : view.getUint32(offset, false)
}

/** Parse orientation (1–8) and GPS presence from JPEG ArrayBuffer */
export function parseExif(buffer: ArrayBuffer): ExifInfo {
  const view = new DataView(buffer)
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) {
    return { orientation: 1, hasGps: false }
  }

  let offset = 2
  let orientation = 1
  let hasGps = false

  while (offset + 4 < view.byteLength) {
    const marker = view.getUint16(offset)
    offset += 2
    if (marker === 0xffda) break // SOS
    if ((marker & 0xff00) !== 0xff00) break
    const size = view.getUint16(offset)
    if (size < 2) break
    if (marker === 0xffe1) {
      const start = offset + 2
      if (
        start + 6 < view.byteLength &&
        String.fromCharCode(
          view.getUint8(start),
          view.getUint8(start + 1),
          view.getUint8(start + 2),
          view.getUint8(start + 3),
        ) === 'Exif'
      ) {
        const tiff = start + 6
        const little = view.getUint16(tiff) === 0x4949
        const ifd0 = tiff + readUint32(view, tiff + 4, little)
        if (ifd0 + 2 < view.byteLength) {
          const entries = readUint16(view, ifd0, little)
          for (let i = 0; i < entries; i++) {
            const e = ifd0 + 2 + i * 12
            if (e + 12 > view.byteLength) break
            const tag = readUint16(view, e, little)
            if (tag === 0x0112) {
              orientation = readUint16(view, e + 8, little) || 1
            }
            if (tag === 0x8825) hasGps = true
          }
        }
      }
    }
    offset += size
  }

  return { orientation, hasGps }
}

/**
 * Draw image onto a canvas with EXIF orientation applied.
 * Resulting bitmap has orientation=1 (upright).
 */
export function drawOrientedImage(
  img: HTMLImageElement,
  orientation: number,
): HTMLCanvasElement {
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const o = orientation || 1

  if (o > 4 && o < 9) {
    canvas.width = h
    canvas.height = w
  } else {
    canvas.width = w
    canvas.height = h
  }

  switch (o) {
    case 2:
      ctx.transform(-1, 0, 0, 1, w, 0)
      break
    case 3:
      ctx.transform(-1, 0, 0, -1, w, h)
      break
    case 4:
      ctx.transform(1, 0, 0, -1, 0, h)
      break
    case 5:
      ctx.transform(0, 1, 1, 0, 0, 0)
      break
    case 6:
      ctx.transform(0, 1, -1, 0, h, 0)
      break
    case 7:
      ctx.transform(0, -1, -1, 0, h, w)
      break
    case 8:
      ctx.transform(0, -1, 1, 0, 0, w)
      break
    default:
      break
  }

  ctx.drawImage(img, 0, 0)
  return canvas
}

/**
 * JPEG without APP1/EXIF — strips metadata including GPS.
 * Non-JPEG buffers are returned unchanged (PNG/WebP have no EXIF in our export path;
 * canvas exports already lack EXIF).
 */
export function stripExifFromJpeg(buffer: ArrayBuffer): ArrayBuffer {
  const view = new DataView(buffer)
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) {
    return buffer
  }

  const parts: Uint8Array[] = [new Uint8Array(buffer, 0, 2)]
  let offset = 2

  while (offset + 4 < view.byteLength) {
    const marker = view.getUint16(offset)
    if ((marker & 0xff00) !== 0xff00) {
      parts.push(new Uint8Array(buffer, offset))
      break
    }
    if (marker === 0xffda) {
      parts.push(new Uint8Array(buffer, offset))
      break
    }
    const size = view.getUint16(offset + 2)
    const next = offset + 2 + size
    // Skip APP1 (EXIF) and APP0 optional keep — strip APP1 only
    if (marker !== 0xffe1) {
      parts.push(new Uint8Array(buffer, offset, 2 + size))
    }
    offset = next
  }

  const total = parts.reduce((n, p) => n + p.byteLength, 0)
  const out = new Uint8Array(total)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.byteLength
  }
  return out.buffer
}

export function bufferHasExif(buffer: ArrayBuffer): boolean {
  const view = new DataView(buffer)
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return false
  let offset = 2
  while (offset + 4 < view.byteLength) {
    const marker = view.getUint16(offset)
    offset += 2
    if (marker === 0xffda) return false
    if ((marker & 0xff00) !== 0xff00) return false
    const size = view.getUint16(offset)
    if (marker === 0xffe1) {
      const start = offset + 2
      if (
        start + 4 < view.byteLength &&
        String.fromCharCode(
          view.getUint8(start),
          view.getUint8(start + 1),
          view.getUint8(start + 2),
          view.getUint8(start + 3),
        ) === 'Exif'
      ) {
        return true
      }
    }
    offset += size
  }
  return false
}
