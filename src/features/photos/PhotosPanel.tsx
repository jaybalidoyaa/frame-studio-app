import { useCallback, useRef, useState } from 'react'
import { ImagePlus, Star, Copy, Replace, Trash2, ArrowRight } from 'lucide-react'
import { useStudioStore } from '@/store/studioStore'
import { useTemplates } from '@/store/hooks'
import { formatBytes } from '@/pipeline/ingest'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

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
  const templates = useTemplates()
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
    <div className="space-y-5" onPaste={onPaste}>
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight">Photos</h2>
        <p className="text-sm text-muted-foreground">
          Drop, paste, or browse. JPEG, PNG, WebP, HEIC when supported.
        </p>
      </div>

      <div
        className={cn('dropzone', dragOver && 'active')}
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
        <ImagePlus className="mx-auto mb-2 size-6 text-muted-foreground" />
        <p className="font-medium">Drop incident photos here</p>
        <p className="mt-1 text-sm text-muted-foreground">
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
        <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          No photos yet. Add a batch to start framing.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={selectAllPhotos}>
              Select all
            </Button>
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Clear
            </Button>
            <Select
              onValueChange={(v) =>
                batchSetPrivacy(
                  v as 'internal_only' | 'public_safe' | 'needs_review',
                )
              }
            >
              <SelectTrigger size="sm" className="w-[140px] bg-background">
                <SelectValue placeholder="Batch privacy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public_safe">Public-safe</SelectItem>
                <SelectItem value="internal_only">Internal-only</SelectItem>
                <SelectItem value="needs_review">Needs review</SelectItem>
              </SelectContent>
            </Select>
            <Select
              onValueChange={(v) =>
                batchSetTemplateOverride(v === '__clear' ? undefined : v)
              }
            >
              <SelectTrigger size="sm" className="w-[150px] bg-background">
                <SelectValue placeholder="Batch template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__clear">Use incident template</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="thumb-rail" role="list">
            {draft.photos.map((p) => (
              <div key={p.id} role="listitem" className="space-y-1.5">
                <button
                  type="button"
                  className={cn('thumb', activePhotoId === p.id && 'active')}
                  onClick={() => setActivePhoto(p.id)}
                >
                  {p.sourceUrl ? (
                    <img src={p.sourceUrl} alt="" />
                  ) : (
                    <div className="flex h-[68px] items-center justify-center text-xs text-muted-foreground">
                      Cleared
                    </div>
                  )}
                  <div className="space-y-0.5 p-1.5">
                    <div className="truncate text-[10px] font-medium">{p.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {p.width}×{p.height}
                    </div>
                  </div>
                  {p.isCover && (
                    <Badge className="absolute top-1 left-1 h-5 px-1.5 text-[10px]">
                      Cover
                    </Badge>
                  )}
                  {p.modified && (
                    <span
                      className="absolute top-1 right-1 size-2 rounded-full bg-primary"
                      title="Modified"
                    />
                  )}
                </button>
                <div className="flex flex-wrap gap-1">
                  <Label className="chip cursor-pointer">
                    <Checkbox
                      checked={selectedPhotoIds.includes(p.id)}
                      onCheckedChange={() => toggleSelectPhoto(p.id)}
                    />
                    Sel
                  </Label>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setCover(p.id)}
                  >
                    <Star />
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => duplicatePhoto(p.id)}
                  >
                    <Copy />
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      setReplaceId(p.id)
                      replaceRef.current?.click()
                    }}
                  >
                    <Replace />
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => removePhoto(p.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
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

      <Button className="w-full" onClick={() => setStep('details')}>
        Continue to details
        <ArrowRight data-icon="inline-end" />
      </Button>
    </div>
  )
}
