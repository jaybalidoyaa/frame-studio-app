import { useEffect } from 'react'
import { useStudioStore } from '@/store/studioStore'
import { AppShell } from '@/ui/AppShell'

export default function App() {
  const init = useStudioStore((s) => s.init)
  const ready = useStudioStore((s) => s.ready)

  useEffect(() => {
    void init()
  }, [init])

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm space-y-4">
          <div className="flex items-center gap-3">
            <img
              src="/branding/brigada-onse-logo.png"
              alt=""
              className="size-10 object-contain"
            />
            <div>
              <p className="text-xs font-semibold tracking-widest text-primary uppercase">
                Brigada Onse
              </p>
              <p className="font-semibold">SVFAR Studio</p>
            </div>
          </div>
          <div className="skeleton h-6 w-40" />
          <div className="skeleton h-24 w-full" />
          <div className="skeleton h-4 w-3/4" />
          <p className="text-sm text-muted-foreground">Loading workspace…</p>
        </div>
      </div>
    )
  }

  return <AppShell />
}
