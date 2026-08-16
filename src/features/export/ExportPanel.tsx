import { useState } from 'react'
import { useStudioStore } from '../../store/studioStore'
import { useActivePhoto, useReadyToExport, useTemplates } from '../../store/hooks'
import {
  downloadBlob,
  exportAllZip,
  exportContactSheetPdf,
  exportManifestOnly,
  exportSinglePhoto,
} from '../../pipeline/exportPackage'
import { getTemplateById } from '../../domain/templates'
import { loadImage } from '../../pipeline/compose'
import { buildFilenameParts, generateFilename } from '../../domain/filename'

export function ExportPanel() {
  const draft = useStudioStore((s) => s.draft)
  const customTemplates = useStudioStore((s) => s.customTemplates)
  const activePhoto = useActivePhoto()
  const isReady = useReadyToExport()
  const templates = useTemplates()
  const setFilenamePattern = useStudioStore((s) => s.setFilenamePattern)
  const setRetainExif = useStudioStore((s) => s.setRetainExif)
  const setExportStatus = useStudioStore((s) => s.setExportStatus)
  const setExportProgress = useStudioStore((s) => s.setExportProgress)
  const clearSensitive = useStudioStore((s) => s.clearSensitive)
  const toast = useStudioStore((s) => s.toast)
  const [busy, setBusy] = useState(false)

  const withLogo = async () => {
    try {
      return await loadImage('/branding/emblem.svg')
    } catch {
      return null
    }
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
      setExportStatus('exported')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Export failed', 'error')
    } finally {
      setBusy(false)
      setExportProgress(null)
    }
  }

  const previewName = generateFilename(
    draft.filenamePattern,
    buildFilenameParts(draft.metadata, 1, 'png'),
  )

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Export package</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Exact 940×788 outputs. Public exports strip EXIF by default.
        </p>
      </div>

      {!isReady && (
        <div
          className="border p-3 text-sm"
          style={{ borderColor: 'var(--accent-2)', color: 'var(--accent-2)' }}
        >
          Resolve review checklist items before trusting this package for release.
          You can still export drafts for internal use.
        </div>
      )}

      <div className="field">
        <label htmlFor="pattern">Filename pattern</label>
        <input
          id="pattern"
          className="input"
          value={draft.filenamePattern}
          onChange={(e) => setFilenamePattern(e.target.value)}
        />
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Tokens: {'{date}'} {'{event}'} {'{callsign}'} {'{index}'} {'{ext}'} · Preview:{' '}
          <code>{previewName}</code>
        </p>
      </div>

      <label className="chip cursor-pointer w-fit">
        <input
          type="checkbox"
          checked={draft.retainExifForArchive}
          onChange={(e) => setRetainExif(e.target.checked)}
        />
        Retain metadata for internal archive (deliberate)
      </label>

      <div className="grid gap-2">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || !activePhoto?.sourceUrl}
          onClick={() =>
            void run(async () => {
              if (!activePhoto) return
              const logo = await withLogo()
              const tpl = getTemplateById(
                activePhoto.templateIdOverride ?? draft.templateId,
                customTemplates,
              )
              const { blob, filename } = await exportSinglePhoto(
                draft,
                activePhoto,
                tpl,
                'png',
                1,
                logo,
              )
              downloadBlob(blob, filename)
              toast(`Exported ${filename}`, 'success')
            })
          }
        >
          Export current photo (PNG)
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy || !activePhoto?.sourceUrl}
          onClick={() =>
            void run(async () => {
              if (!activePhoto) return
              const logo = await withLogo()
              const tpl = getTemplateById(
                activePhoto.templateIdOverride ?? draft.templateId,
                customTemplates,
              )
              const { blob, filename } = await exportSinglePhoto(
                draft,
                activePhoto,
                tpl,
                'jpeg',
                1,
                logo,
              )
              downloadBlob(blob, filename)
              toast(`Exported ${filename}`, 'success')
            })
          }
        >
          Export current photo (JPEG)
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy || draft.photos.length === 0}
          onClick={() =>
            void run(async () => {
              const logo = await withLogo()
              const zip = await exportAllZip(
                draft,
                templates,
                (p) => setExportProgress(p),
                logo,
              )
              downloadBlob(zip, `${draft.shortId}_package.zip`)
              toast('ZIP package downloaded', 'success')
            })
          }
        >
          Export all as ZIP
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy || draft.photos.length === 0}
          onClick={() =>
            void run(async () => {
              const logo = await withLogo()
              const sheet = await exportContactSheetPdf(draft, templates, logo)
              downloadBlob(sheet, `${draft.shortId}_contact-sheet.png`)
              toast('Print-friendly contact sheet exported', 'success')
            })
          }
        >
          Contact sheet (print-friendly PNG)
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const { blob, filename } = await exportManifestOnly(
                draft,
                templates,
                'json',
              )
              downloadBlob(blob, filename)
              toast('Manifest JSON exported', 'success')
            })
          }
        >
          Metadata manifest (JSON)
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const { blob, filename } = await exportManifestOnly(
                draft,
                templates,
                'csv',
              )
              downloadBlob(blob, filename)
              toast('Manifest CSV exported', 'success')
            })
          }
        >
          Metadata manifest (CSV)
        </button>
      </div>

      <div className="border p-3" style={{ borderColor: 'var(--border)' }}>
        <h3 className="font-semibold">After export</h3>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Optionally remove locally stored source images and sensitive metadata from this device.
        </p>
        <button
          type="button"
          className="btn btn-danger mt-2"
          onClick={() => {
            if (
              confirm(
                'Clear sensitive local data for this draft? Source images and notes will be removed.',
              )
            ) {
              void clearSensitive()
            }
          }}
        >
          Clear sensitive data
        </button>
      </div>
    </div>
  )
}
