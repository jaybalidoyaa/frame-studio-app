import { useEffect } from 'react'
import { useStudioStore } from './store/studioStore'
import { AppShell } from './ui/AppShell'

export default function App() {
  const init = useStudioStore((s) => s.init)
  const ready = useStudioStore((s) => s.ready)

  useEffect(() => {
    void init()
  }, [init])

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-3">
          <div className="skeleton h-6 w-40" />
          <div className="skeleton h-24 w-full" />
          <div className="skeleton h-4 w-3/4" />
          <p className="text-sm text-fg-tertiary">
            Loading Brigada Onse SVFAR Studio…
          </p>
        </div>
      </div>
    )
  }

  return <AppShell />
}
