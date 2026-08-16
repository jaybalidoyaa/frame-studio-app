import { beforeAll, describe, expect, it, vi } from 'vitest'
import {
  buildFilenameParts,
  generateFilename,
  slugify,
} from './filename'
import { defaultMetadata, DEFAULT_ADJUST, EXPORT_HEIGHT, EXPORT_WIDTH } from './types'
import { BUILTIN_TEMPLATES, validateTemplateConfig } from './templates'
import { validateMetadata } from './validation'
import {
  bufferHasExif,
  parseExif,
  stripExifFromJpeg,
} from '../pipeline/exif'
import { exportFramedBlob, sampleRedactionCenter } from '../pipeline/compose'
import type { StudioPhoto } from './types'

function makeJpegWithExif(): ArrayBuffer {
  const exifHeader = [
    0xff, 0xd8, 0xff, 0xe1, 0x00, 0x1c, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x12, 0x01,
    0x03, 0x00, 0x01, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0xff, 0xda,
    0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xff, 0xd9,
  ]
  return new Uint8Array(exifHeader).buffer
}

describe('filename generation', () => {
  it('slugifies unsafe characters', () => {
    expect(slugify('NOVA-17 / Alpha')).toBe('nova-17-alpha')
  })

  it('builds safe patterned names', () => {
    const meta = defaultMetadata()
    meta.eventType = 'traffic'
    meta.callsign = 'NOVA-17'
    meta.dateTimeLocal = '2026-08-16T14:30'
    const parts = buildFilenameParts(meta, 1, 'png')
    const name = generateFilename(
      '{date}_{event}_{callsign}_{index}.{ext}',
      parts,
    )
    expect(name).toBe('2026-08-16_traffic_NOVA-17_001.png')
  })

  it('strips path separators and reserved characters', () => {
    const name = generateFilename('a/b\\c:d*{index}.{ext}', {
      date: '2026-08-16',
      eventSlug: 'x',
      callsign: 'Y',
      index: 2,
      ext: 'jpg',
    })
    expect(name).not.toMatch(/[\\/:*]/)
    expect(name.endsWith('.jpg')).toBe(true)
  })
})

describe('metadata validation', () => {
  it('requires template fields and photos', () => {
    const tpl = BUILTIN_TEMPLATES.find((t) => t.id === 'fire')!
    const meta = defaultMetadata()
    meta.eventType = 'fire'
    meta.callsign = ''
    meta.location = ''
    const issues = validateMetadata(meta, tpl, 0)
    expect(issues.some((i) => i.field === 'photos')).toBe(true)
    expect(issues.some((i) => i.field === 'callsign')).toBe(true)
  })

  it('passes when required fields present', () => {
    const tpl = BUILTIN_TEMPLATES.find((t) => t.id === 'minimal')!
    const meta = defaultMetadata()
    const issues = validateMetadata(meta, tpl, 2)
    expect(issues).toHaveLength(0)
  })
})

describe('template configuration', () => {
  it('accepts builtin templates', () => {
    for (const t of BUILTIN_TEMPLATES) {
      expect(validateTemplateConfig(t)).toEqual([])
    }
  })

  it('rejects invalid accent and scale', () => {
    const t = structuredClone(BUILTIN_TEMPLATES[1]!)
    t.accentColor = 'red'
    t.fontScale = 9
    const errors = validateTemplateConfig(t)
    expect(errors.length).toBeGreaterThan(0)
  })
})

describe('EXIF stripping', () => {
  it('detects and strips APP1 Exif', () => {
    const buf = makeJpegWithExif()
    expect(bufferHasExif(buf)).toBe(true)
    expect(parseExif(buf).orientation).toBe(6)
    expect(bufferHasExif(stripExifFromJpeg(buf))).toBe(false)
  })
})

describe('export dimensions and redaction bake', () => {
  beforeAll(() => {
    class MockCtx {
      canvas: HTMLCanvasElement
      fillStyle = '#000'
      filter = 'none'
      globalAlpha = 1
      globalCompositeOperation = 'source-over'
      font = ''
      textBaseline = 'alphabetic'
      lineWidth = 1
      strokeStyle = '#000'
      imageSmoothingEnabled = true
      imageSmoothingQuality = 'high'
      fills: { x: number; y: number; w: number; h: number; color: [number, number, number, number] }[] =
        []

      constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas
      }

      fillRect(x: number, y: number, w: number, h: number) {
        this.fills.push({
          x,
          y,
          w,
          h,
          color: this.parseColor(String(this.fillStyle)),
        })
      }

      drawImage() {
        /* no-op for mock source */
      }
      save() {}
      restore() {}
      translate() {}
      rotate() {}
      scale() {}
      beginPath() {}
      moveTo() {}
      lineTo() {}
      stroke() {}
      setLineDash() {}
      createLinearGradient() {
        return { addColorStop() {} }
      }
      measureText(text: string) {
        return { width: text.length * 8 }
      }
      fillText() {}
      getImageData(x: number, y: number, w: number, h: number) {
        const data = new Uint8ClampedArray(w * h * 4)
        const color =
          [...this.fills]
            .reverse()
            .find(
              (f) => x >= f.x && y >= f.y && x < f.x + f.w && y < f.y + f.h,
            )?.color ?? [255, 255, 255, 255]
        for (let i = 0; i < w * h; i++) {
          data[i * 4] = color[0]
          data[i * 4 + 1] = color[1]
          data[i * 4 + 2] = color[2]
          data[i * 4 + 3] = color[3]
        }
        return { data, width: w, height: h }
      }
      putImageData() {}
      parseColor(c: string): [number, number, number, number] {
        if (c === '#000' || c === '#000000') return [0, 0, 0, 255]
        if (c === '#fff' || c === '#ffffff') return [255, 255, 255, 255]
        if (c === '#0b1220') return [11, 18, 32, 255]
        return [20, 20, 20, 255]
      }
    }

    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
    ) {
      const existing = (this as unknown as { __ctx?: MockCtx }).__ctx
      if (existing) return existing as unknown as CanvasRenderingContext2D
      const ctx = new MockCtx(this)
      ;(this as unknown as { __ctx?: MockCtx }).__ctx = ctx
      return ctx as unknown as CanvasRenderingContext2D
    } as unknown as typeof HTMLCanvasElement.prototype.getContext

    HTMLCanvasElement.prototype.toBlob = function (
      cb: BlobCallback,
      type?: string,
    ) {
      cb(new Blob([new Uint8Array([1, 2, 3])], { type: type ?? 'image/png' }))
    }

    // Image constructor used by QR / loadImage paths
    vi.stubGlobal(
      'Image',
      class {
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        naturalWidth = 100
        naturalHeight = 100
        width = 100
        height = 100
        set src(_v: string) {
          queueMicrotask(() => this.onload?.())
        }
      },
    )
  })

  it('exports exactly 940×788 and bakes blackout', async () => {
    expect(EXPORT_WIDTH).toBe(940)
    expect(EXPORT_HEIGHT).toBe(788)

    const src = document.createElement('canvas')
    src.width = 1200
    src.height = 900

    const photo: StudioPhoto = {
      id: 'p1',
      name: 't.jpg',
      sourceUrl: 'data:image/png;base64,aaa',
      width: 1200,
      height: 900,
      fileSize: 1000,
      mimeType: 'image/png',
      orientation: 1,
      status: 'ok',
      warnings: [],
      adjust: { ...DEFAULT_ADJUST },
      redactions: [
        {
          id: 'r1',
          kind: 'blackout',
          rect: { x: 0.4, y: 0.4, w: 0.2, h: 0.2 },
        },
      ],
      privacy: 'public_safe',
      isCover: true,
      modified: true,
    }

    const tpl = BUILTIN_TEMPLATES.find((t) => t.id === 'none')!
    const { blob, width, height } = await exportFramedBlob({
      photo,
      image: src,
      sourceWidth: 1200,
      sourceHeight: 900,
      template: tpl,
      metadata: defaultMetadata(),
      shortId: 'TESTID01',
    })

    expect(width).toBe(EXPORT_WIDTH)
    expect(height).toBe(EXPORT_HEIGHT)
    expect(blob.size).toBeGreaterThan(0)

    // Bake: blackout path fills #000 — sample via compose canvas mock
    const { composeToCanvas } = await import('../pipeline/compose')
    const canvas = await composeToCanvas({
      photo,
      image: src,
      sourceWidth: 1200,
      sourceHeight: 900,
      template: tpl,
      metadata: defaultMetadata(),
      shortId: 'TESTID01',
      scale: 1,
    })
    expect(canvas.width).toBe(940)
    expect(canvas.height).toBe(788)
    const pixel = sampleRedactionCenter(canvas, photo.redactions[0]!)
    expect(pixel[0]).toBe(0)
    expect(pixel[1]).toBe(0)
    expect(pixel[2]).toBe(0)
  })
})
