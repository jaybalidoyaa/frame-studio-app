import { AlertCircle, CheckCircle2, Package } from 'lucide-react'
import { useStudioStore } from '@/store/studioStore'
import { useReadyToExport } from '@/store/hooks'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

export function ExportBar() {
  const setStep = useStudioStore((s) => s.setStep)
  const isReady = useReadyToExport()
  const progress = useStudioStore((s) => s.exportProgress)
  const photoCount = useStudioStore((s) => s.draft.photos.length)
  const pct = progress
    ? Math.round((progress.current / Math.max(1, progress.total)) * 100)
    : 0

  return (
    <footer className="border-t border-border/80 bg-card/90 px-4 py-3 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {isReady ? (
              <CheckCircle2 className="size-4 text-emerald-500" />
            ) : (
              <AlertCircle className="size-4 text-amber-500" />
            )}
            <p className="text-sm font-medium">
              {isReady ? 'Ready to export' : 'Complete required fields to export'}
            </p>
            <Badge variant="outline">940 × 788</Badge>
            <span className="text-xs text-muted-foreground">
              {photoCount} photo{photoCount === 1 ? '' : 's'}
            </span>
          </div>
          {progress && (
            <div className="max-w-md space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress.label}</span>
                <span>
                  {progress.current}/{progress.total}
                </span>
              </div>
              <Progress value={pct} className="h-1.5" />
            </div>
          )}
        </div>

        <Button variant="outline" onClick={() => setStep('review')}>
          Review
        </Button>
        <Button onClick={() => setStep('export')}>
          <Package data-icon="inline-start" />
          Export package
        </Button>
      </div>
    </footer>
  )
}
