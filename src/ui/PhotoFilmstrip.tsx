import { AlertTriangle, Star } from 'lucide-react'
import { useStudioStore } from '@/store/studioStore'
import { cn } from '@/lib/utils'

export function PhotoFilmstrip() {
  const photos = useStudioStore((s) => s.draft.photos)
  const activePhotoId = useStudioStore((s) => s.activePhotoId)
  const setActivePhoto = useStudioStore((s) => s.setActivePhoto)
  const selectedPhotoIds = useStudioStore((s) => s.selectedPhotoIds)
  const coverCount = photos.filter((p) => p.isCover).length
  const edited = photos.filter((p) => p.modified).length
  const warnings = photos.reduce((n, p) => n + p.warnings.length, 0)

  if (!photos.length) return null

  return (
    <div className="border-t border-border bg-card/80">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 text-[11px] text-muted-foreground">
        <span>
          {photos.length} photos
          {selectedPhotoIds.length ? ` · ${selectedPhotoIds.length} selected` : ''}
          {coverCount ? ` · ${coverCount} cover` : ''}
          {edited ? ` · ${edited} edits applied` : ''}
          {warnings ? ` · ${warnings} warnings` : ''}
        </span>
      </div>
      <div className="thumb-rail px-3 pb-2" role="list">
        {photos.map((p, idx) => (
          <button
            key={p.id}
            type="button"
            role="listitem"
            className={cn('thumb', activePhotoId === p.id && 'active')}
            onClick={() => setActivePhoto(p.id)}
            aria-label={`Photo ${idx + 1}: ${p.name}`}
          >
            {p.sourceUrl ? (
              <img src={p.sourceUrl} alt="" />
            ) : (
              <div className="flex h-16 items-center justify-center text-[10px] text-muted-foreground">
                —
              </div>
            )}
            {p.isCover && (
              <Star className="absolute top-1 left-1 size-3 fill-[var(--amber)] text-[var(--amber)]" />
            )}
            {p.warnings.length > 0 && (
              <AlertTriangle className="absolute top-1 right-1 size-3 text-[var(--amber)]" />
            )}
            {p.modified && (
              <span className="absolute right-1 bottom-1 size-1.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
