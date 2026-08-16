import { XClose } from '@untitledui/icons'
import { useStudioStore } from '../store/studioStore'
import { Button } from '../components/base/buttons/button'

export function ToastStack() {
  const toasts = useStudioStore((s) => s.toasts)
  const dismissToast = useStudioStore((s) => s.dismissToast)

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone ?? 'info'}`} role="status">
          <div className="flex items-start justify-between gap-3">
            <span>{t.message}</span>
            <Button
              color="tertiary"
              size="sm"
              aria-label="Dismiss"
              className="!p-1"
              onPress={() => dismissToast(t.id)}
            >
              <XClose data-icon className="size-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
