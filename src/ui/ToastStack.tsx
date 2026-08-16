import { useStudioStore } from '../store/studioStore'

export function ToastStack() {
  const toasts = useStudioStore((s) => s.toasts)
  const dismissToast = useStudioStore((s) => s.dismissToast)

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone ?? 'info'}`} role="status">
          <div className="flex items-start justify-between gap-3">
            <span>{t.message}</span>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: '0 0.25rem' }}
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
