import { useCallback, useRef, useState } from 'react'
import { useStudioStore } from '../../store/studioStore'
import { formatBytes } from '../../pipeline/ingest'

export function PhotosPanel() {
  const draft = useStudioStore((s) => s.draft)
  const addFiles = useStudioStore((s) => s.addFiles)
  const removePhoto = useStudioStore((s) => s.removePhoto)
  const duplicatePhoto = useStudioStore((s) => s.duplicatePhoto)
  const setCover = useStudioStore((s) => s.setCover)
  const setActivePhoto = useStudioStore((s) => s.setActivePhoto)
  const activePhotoId = useStudioStore((s) => s.activePhotoId)
  const selectedPhotoIds = useStudioStore((s) => s.selectedPhotoIds)
  const toggleSelectPhoto = useStudioStore((s) => s.toggleSelectPhoto)
  const selectAllPhotos = useStudioStore((s) => s.selectAllPhotos)
  const clearSelection = useStudioStore((s) => s.clearSelection)
  const batchSetPrivacy = useStudioStore((s) => s.batchSetPrivacy)
  const batchSetTemplateOverride = useStudioStore((s) => s.batchSetTemplateOverride)
  const replacePhoto = useStudioStore((s) => s.replacePhoto)
  const templates = useStudioStore((s) => s.templates())
  const setStep = useStudioStore((s) => s.setStep)
  const fileRef = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [replaceId, setReplaceId] = useState<string | null>(null)

  const onFiles = useCallback(
    (files: FileList | File[] | null) => {
      if (!files || !files.length) return
      void addFiles(files)
    },
    [addFiles],
  )

  const onPaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.files
      if (items?.length) {
        e.preventDefault()
        void addFiles(items)
      }
    },
    [addFiles],
  )

  return (
    <div className="space-y-4" onPaste={onPaste}>
      <div>
        <h2 className="text-base font-semibold">Photo ingest</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Drag and drop, paste, or browse. JPEG, PNG, WebP, HEIC when supported.
        </p>
      </div>

      <div
        className={`dropzone ${dragOver ? 'active' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          onFiles(e.dataTransfer.files)
        }}
      >
        <p className="font-medium">Drop incident photos here</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          or click to browse · Ctrl/Cmd+V to paste
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
          multiple
          className="sr-only"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      {draft.photos.length === 0 ? (
        <div
          className="border p-4 text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          No photos yet. Add a batch to start framing.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={selectAllPhotos}>
              Select all
            </button>
            <button type="button" className="btn" onClick={clearSelection}>
              Clear selection
            </button>
            <select
              className="select"
              style={{ width: 'auto' }}
              defaultValue=""
              aria-label="Batch privacy"
              onChange={(e) => {
                if (e.target.value) batchSetPrivacy(e.target.value as 'internal_only' | 'public_safe' | 'needs_review')
                e.target.value = ''
              }}
            >
              <option value="" disabled>
                Batch privacy…
              </option>
              <option value="public_safe">Public-safe</option>
              <option value="internal_only">Internal-only</option>
              <option value="needs_review">Needs review</option>
            </select>
            <select
              className="select"
              style={{ width: 'auto' }}
              defaultValue=""
              aria-label="Batch template"
              onChange={(e) => {
                const v = e.target.value
                if (v === '__clear') batchSetTemplateOverride(undefined)
                else if (v) batchSetTemplateOverride(v)
                e.target.value = ''
              }}
            >
              <option value="" disabled>
                Batch template…
              </option>
              <option value="__clear">Use incident template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="thumb-rail" role="list">
            {draft.photos.map((p) => (
              <div key={p.id} role="listitem" className="space-y-1">
                <button
                  type="button"
                  className={`thumb ${activePhotoId === p.id ? 'active' : ''}`}
                  onClick={() => setActivePhoto(p.id)}
                >
                  {p.sourceUrl ? (
                    <img src={p.sourceUrl} alt="" />
                  ) : (
                    <div className="flex h-16 items-center justify-center text-xs">Cleared</div>
                  )}
                  <div className="space-y-0.5 p-1.5">
                    <div className="truncate text-[10px] font-medium">{p.name}</div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {p.width}×{p.height}
                    </div>
                  </div>
                  {p.isCover && <span className="chip absolute left-1 top-1">Cover</span>}
                  {p.modified && (
                    <span
                      className="absolute right-1 top-1 h-2 w-2 rounded-full"
                      style={{ background: 'var(--accent-2)' }}
                      title="Modified"
                    />
                  )}
                </button>
                <div className="flex flex-wrap gap-1">
                  <label className="chip cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPhotoIds.includes(p.id)}
                      onChange={() => toggleSelectPhoto(p.id)}
                    />
                    Sel
                  </label>
                  <button type="button" className="chip" onClick={() => setCover(p.id)}>
                    Cover
                  </button>
                  <button type="button" className="chip" onClick={() => duplicatePhoto(p.id)}>
                    Dup
                  </button>
                  <button
                    type="button"
                    className="chip"
                    onClick={() => {
                      setReplaceId(p.id)
                      replaceRef.current?.click()
                    }}
                  >
                    Replace
                  </button>
                  <button type="button" className="chip" onClick={() => removePhoto(p.id)}>
                    Remove
                  </button>
                </div>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {formatBytes(p.fileSize)} · {p.status}
                  {p.warnings.length ? ` · ${p.warnings.length} warn` : ''}
                </p>
              </div>
            ))}
          </div>
          <input
            ref={replaceRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f && replaceId) void replacePhoto(replaceId, f)
              e.target.value = ''
            }}
          />
        </>
      )}

      <button type="button" className="btn btn-primary" onClick={() => setStep('details')}>
        Continue to details
      </button>
    </div>
  )
}
