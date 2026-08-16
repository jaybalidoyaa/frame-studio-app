import { useStudioStore } from '../store/studioStore'
import { useReadyToExport } from '../store/hooks'

export function ExportBar() {
  const setStep = useStudioStore((s) => s.setStep)
  const isReady = useReadyToExport()
  const progress = useStudioStore((s) => s.exportProgress)
  const photoCount = useStudioStore((s) => s.draft.photos.length)

  return (
    <div className="export-bar">
      <div className="min-w-0 flex-1">
        <strong className="text-sm">
          {isReady ? 'Ready to export' : 'Complete required fields to export'}
        </strong>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {photoCount} photo{photoCount === 1 ? '' : 's'} · Output 940×788
          {progress
            ? ` · ${progress.label} (${progress.current}/${progress.total})`
            : ''}
        </p>
        {progress && (
          <div
            className="mt-1 h-1 w-full overflow-hidden"
            style={{ background: 'var(--border)' }}
            role="progressbar"
            aria-valuenow={progress.current}
            aria-valuemax={progress.total}
          >
            <div
              style={{
                width: `${(progress.current / Math.max(1, progress.total)) * 100}%`,
                height: '100%',
                background: 'var(--accent-2)',
              }}
            />
          </div>
        )}
      </div>
      <button type="button" className="btn" onClick={() => setStep('review')}>
        Review
      </button>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => setStep('export')}
      >
        Export package
      </button>
    </div>
  )
}
