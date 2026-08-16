import { X } from 'lucide-react'
import { useStudioStore } from '@/store/studioStore'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function ToastStack() {
  const toasts = useStudioStore((s) => s.toasts)
  const dismissToast = useStudioStore((s) => s.dismissToast)

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <Card
          key={t.id}
          role="status"
          className={cn(
            'border-l-4 p-3 shadow-lg',
            t.tone === 'error' && 'border-l-destructive',
            t.tone === 'success' && 'border-l-emerald-500',
            t.tone === 'warn' && 'border-l-amber-500',
            (!t.tone || t.tone === 'info') && 'border-l-primary',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm leading-snug">{t.message}</p>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Dismiss"
              onClick={() => dismissToast(t.id)}
            >
              <X />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
