import { CheckCircle, AlertCircle, Package } from '@untitledui/icons'
import { useStudioStore } from '../store/studioStore'
import { useReadyToExport } from '../store/hooks'
import { Button } from '../components/base/buttons/button'
import { Badge } from '../components/base/badges/badge'

export function ExportBar() {
  const setStep = useStudioStore((s) => s.setStep)
  const isReady = useReadyToExport()
  const progress = useStudioStore((s) => s.exportProgress)
  const photoCount = useStudioStore((s) => s.draft.photos.length)

  return (
    <div className="export-bar">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {isReady ? (
            <CheckCircle className="size-4 text-success-700" />
          ) : (
            <AlertCircle className="size-4 text-warning-700" />
          )}
          <strong className="text-sm text-fg-primary">
            {isReady ? 'Ready to export' : 'Complete required fields to export'}
          </strong>
          <Badge color={isReady ? 'success' : 'warning'}>940 × 788</Badge>
        </div>
        <p className="mt-0.5 text-xs text-fg-tertiary">
          {photoCount} photo{photoCount === 1 ? '' : 's'}
          {progress
            ? ` · ${progress.label} (${progress.current}/${progress.total})`
            : ''}
        </p>
        {progress && (
          <div
            className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border-secondary"
            role="progressbar"
            aria-valuenow={progress.current}
            aria-valuemax={progress.total}
          >
            <div
              className="h-full rounded-full bg-brand-500 transition-[width] duration-200"
              style={{
                width: `${(progress.current / Math.max(1, progress.total)) * 100}%`,
              }}
            />
          </div>
        )}
      </div>
      <Button color="secondary" size="md" onPress={() => setStep('review')}>
        Review
      </Button>
      <Button color="primary" size="md" onPress={() => setStep('export')}>
        <Package data-icon className="size-4" />
        Export package
      </Button>
    </div>
  )
}
