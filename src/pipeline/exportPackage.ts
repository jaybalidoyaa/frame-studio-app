import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import type { FrameTemplate, IncidentDraft, StudioPhoto } from '../domain/types'
import { buildFilenameParts, generateFilename } from '../domain/filename'
import { getTemplateById } from '../domain/templates'
import { metadataSummary } from '../domain/validation'
import { composeToCanvas, exportFramedBlob, loadImage } from './compose'
import { stripExifFromJpeg } from './exif'

export interface ExportProgress {
  current: number
  total: number
  label: string
}

export async function exportSinglePhoto(
  draft: IncidentDraft,
  photo: StudioPhoto,
  template: FrameTemplate,
  format: 'png' | 'jpeg',
  index: number,
  logo?: HTMLImageElement | null,
): Promise<{ blob: Blob; filename: string; width: number; height: number }> {
  const img = await loadImage(photo.sourceUrl)
  const mime = format === 'png' ? 'image/png' : 'image/jpeg'
  let { blob, width, height } = await exportFramedBlob(
    {
      photo,
      image: img,
      sourceWidth: photo.width,
      sourceHeight: photo.height,
      template,
      metadata: draft.metadata,
      shortId: draft.shortId,
      logo,
    },
    mime,
  )

  if (format === 'jpeg' && !draft.retainExifForArchive) {
    const buf = await blob.arrayBuffer()
    const stripped = stripExifFromJpeg(buf)
    blob = new Blob([stripped], { type: 'image/jpeg' })
  }

  const parts = buildFilenameParts(
    draft.metadata,
    index,
    format === 'png' ? 'png' : 'jpg',
  )
  const filename = generateFilename(draft.filenamePattern, parts)
  return { blob, filename, width, height }
}

export async function exportAllZip(
  draft: IncidentDraft,
  templates: FrameTemplate[],
  onProgress?: (p: ExportProgress) => void,
  logo?: HTMLImageElement | null,
): Promise<Blob> {
  const zip = new JSZip()
  const folder = zip.folder('exports') ?? zip
  const photos = draft.photos
  let i = 0
  for (const photo of photos) {
    i++
    onProgress?.({
      current: i,
      total: photos.length + 2,
      label: `Rendering ${photo.name}`,
    })
    const tpl = getTemplateById(
      photo.templateIdOverride ?? draft.templateId,
      templates,
    )
    try {
      const { blob, filename } = await exportSinglePhoto(
        draft,
        photo,
        tpl,
        'png',
        i,
        logo,
      )
      folder.file(filename, blob)
    } catch (err) {
      folder.file(
        `_failed_${i}_${photo.name}.txt`,
        `Failed to export: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  onProgress?.({
    current: photos.length + 1,
    total: photos.length + 2,
    label: 'Writing manifest',
  })
  const manifest = buildManifest(draft, templates)
  folder.file('manifest.json', JSON.stringify(manifest, null, 2))
  folder.file('manifest.csv', manifestToCsv(manifest))

  onProgress?.({
    current: photos.length + 2,
    total: photos.length + 2,
    label: 'Compressing ZIP',
  })
  return zip.generateAsync({ type: 'blob' })
}

export function buildManifest(draft: IncidentDraft, templates: FrameTemplate[]) {
  return {
    incidentId: draft.shortId,
    name: draft.name,
    exportedAt: new Date().toISOString(),
    summary: metadataSummary(draft.metadata),
    metadata: draft.metadata,
    templateId: draft.templateId,
    retainExifForArchive: draft.retainExifForArchive,
    photos: draft.photos.map((p, idx) => ({
      index: idx + 1,
      id: p.id,
      name: p.name,
      width: p.width,
      height: p.height,
      privacy: p.privacy,
      warnings: p.warnings,
      templateId: p.templateIdOverride ?? draft.templateId,
      templateName: getTemplateById(
        p.templateIdOverride ?? draft.templateId,
        templates,
      ).name,
      redactionCount: p.redactions.length,
      isCover: p.isCover,
    })),
  }
}

function manifestToCsv(manifest: ReturnType<typeof buildManifest>): string {
  const header =
    'index,name,privacy,template,warnings,redactions,isCover,width,height'
  const rows = manifest.photos.map((p) =>
    [
      p.index,
      csvEscape(p.name),
      p.privacy,
      csvEscape(p.templateName),
      csvEscape(p.warnings.map((w) => w.code).join('|')),
      p.redactionCount,
      p.isCover,
      p.width,
      p.height,
    ].join(','),
  )
  return [header, ...rows].join('\n')
}

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`
  return s
}

/** Print-friendly contact sheet (PNG). Named pdf in UI as print layout alternative. */
export async function exportContactSheetPdf(
  draft: IncidentDraft,
  templates: FrameTemplate[],
  logo?: HTMLImageElement | null,
): Promise<Blob> {
  const cols = 2
  const thumbW = 940
  const thumbH = 788
  const pad = 24
  const rows = Math.ceil(Math.max(1, draft.photos.length) / cols)
  const sheetW = cols * thumbW + (cols + 1) * pad
  const sheetH = rows * thumbH + (rows + 1) * pad + 80

  const sheet = document.createElement('canvas')
  sheet.width = sheetW
  sheet.height = sheetH
  const ctx = sheet.getContext('2d')!
  ctx.fillStyle = '#0b1220'
  ctx.fillRect(0, 0, sheetW, sheetH)
  ctx.fillStyle = '#e8edf5'
  ctx.font = '600 28px "IBM Plex Sans", sans-serif'
  ctx.fillText(`${draft.name} · ${draft.shortId}`, pad, 48)

  for (let i = 0; i < draft.photos.length; i++) {
    const photo = draft.photos[i]!
    if (!photo.sourceUrl) continue
    const tpl = getTemplateById(
      photo.templateIdOverride ?? draft.templateId,
      templates,
    )
    const img = await loadImage(photo.sourceUrl)
    const framed = await composeToCanvas({
      photo,
      image: img,
      sourceWidth: photo.width,
      sourceHeight: photo.height,
      template: tpl,
      metadata: draft.metadata,
      shortId: draft.shortId,
      logo,
      scale: 1,
    })
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = pad + col * (thumbW + pad)
    const y = 80 + pad + row * (thumbH + pad)
    ctx.drawImage(framed, x, y, thumbW, thumbH)
  }

  return new Promise((resolve, reject) => {
    sheet.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Contact sheet failed'))),
      'image/png',
    )
  })
}

export function downloadBlob(blob: Blob, filename: string): void {
  saveAs(blob, filename)
}

export async function exportManifestOnly(
  draft: IncidentDraft,
  templates: FrameTemplate[],
  format: 'json' | 'csv',
): Promise<{ blob: Blob; filename: string }> {
  const manifest = buildManifest(draft, templates)
  if (format === 'json') {
    return {
      blob: new Blob([JSON.stringify(manifest, null, 2)], {
        type: 'application/json',
      }),
      filename: `${draft.shortId}_manifest.json`,
    }
  }
  return {
    blob: new Blob([manifestToCsv(manifest)], { type: 'text/csv' }),
    filename: `${draft.shortId}_manifest.csv`,
  }
}
