import { ArrowRight, Package } from 'lucide-react'
import { useStudioStore } from '@/store/studioStore'
import { useReadyToExport } from '@/store/hooks'
import { WORKFLOW_STEPS } from '@/domain/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

export function ExportBar() {
  const step = useStudioStore((s) => s.step)
  const setStep = useStudioStore((s) => s.setStep)
  const isReady = useReadyToExport()
  const progress = useStudioStore((s) => s.exportProgress)
  const photos = useStudioStore((s) => s.draft.photos)
  const coverCount = photos.filter((p) => p.isCover).length
  const edited = photos.filter((p) => p.modified).length
  const warnings = photos.reduce((n, p) => n + p.warnings.length, 0)
  const idx = WORKFLOW_STEPS.indexOf(step)
  const next = WORKFLOW_STEPS[idx + 1]
  const pct = progress
    ? Math.round((progress.current / Math.max(1, progress.total)) * 100)
    : 0

  const nextLabel =
    next === 'details'
      ? 'Next: Details'
      : next === 'template'
        ? 'Next: Template'
        : next === 'edit'
          ? 'Next: Edit'
          : next === 'review'
            ? 'Next: Review'
            : next === 'export'
              ? 'Next: Export'
              : 'Export package'

  return (
    <footer className="border-t border-border bg-card px-3 py-2.5 sm:px-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[11px] text-muted-foreground">
            {photos.length} photos
            {coverCount ? ` · ${coverCount} cover` : ''}
            {edited ? ` · ${edited} edits applied` : ''}
            {warnings ? ` · ${warnings} warnings` : ''}
            {' · '}
            <Badge variant="outline" className="rounded-sm font-mono text-[10px]">
              940 × 788
            </Badge>
          </p>
          {progress && (
            <div className="max-w-sm space-y-1">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{progress.label}</span>
                <span>
                  {progress.current}/{progress.total}
                </span>
              </div>
              <Progress value={pct} className="h-1.5 rounded-sm" />
            </div>
          )}
        </div>

        {step !== 'export' && next && (
          <Button className="rounded-sm" onClick={() => setStep(next)}>
            {nextLabel}
            <ArrowRight data-icon="inline-end" />
          </Button>
        )}
        {step === 'export' && (
          <Button
            className="rounded-sm"
            variant={isReady ? 'default' : 'outline'}
            onClick={() => setStep('export')}
          >
            <Package data-icon="inline-start" />
            Export package
          </Button>
        )}
        {step !== 'review' && step !== 'export' && (
          <Button
            variant="outline"
            className="rounded-sm"
            onClick={() => setStep('review')}
          >
            Review
          </Button>
        )}
      </div>
    </footer>
  )
}
