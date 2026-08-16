import { useState } from 'react'
import { useStudioStore } from '@/store/studioStore'
import type { WorkflowStep } from '@/domain/types'
import { PhotosPanel } from '@/features/photos/PhotosPanel'
import { DetailsPanel } from '@/features/details/DetailsPanel'
import { TemplatePanel } from '@/features/templates/TemplatePanel'
import { EditPanel } from '@/features/edit/EditPanel'
import { ReviewPanel } from '@/features/review/ReviewPanel'
import { ExportPanel } from '@/features/export/ExportPanel'
import { PreviewCanvas } from '@/ui/PreviewCanvas'
import { IncidentSidebar } from '@/ui/IncidentSidebar'
import { TopBar } from '@/ui/TopBar'
import { ToastStack } from '@/ui/ToastStack'
import { ExportBar } from '@/ui/ExportBar'
import { PhotoFilmstrip } from '@/ui/PhotoFilmstrip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

function FormPanel({ step }: { step: WorkflowStep }) {
  switch (step) {
    case 'details':
      return <DetailsPanel />
    case 'review':
      return <ReviewPanel />
    case 'export':
      return <ExportPanel />
    default:
      return null
  }
}

export function AppShell() {
  const step = useStudioStore((s) => s.step)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isCanvasStep =
    step === 'photos' || step === 'template' || step === 'edit'

  return (
    <div className="app-shell">
      <IncidentSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          aria-label="Close sidebar overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex min-h-0 min-w-0 flex-col">
        <TopBar onToggleSidebar={() => setSidebarOpen((v) => !v)} />

        <div className="min-h-0 flex-1">
          {isCanvasStep ? (
            <div className="workspace-main h-full">
              <aside
                className={cn(
                  'workspace-library min-h-0 border-r border-border bg-card',
                  (step === 'photos' || step === 'edit') && 'max-md:open',
                )}
                aria-label="Photo library"
              >
                <ScrollArea className="h-full">
                  <div className="p-3">
                    {step === 'template' ? (
                      <TemplatePanel />
                    ) : (
                      <PhotosPanel compact={step === 'edit'} />
                    )}
                  </div>
                </ScrollArea>
              </aside>

              <section
                className="flex min-h-0 min-w-0 flex-col bg-[var(--preview)]"
                aria-label="Editor canvas"
              >
                <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
                  <PreviewCanvas />
                </div>
                <PhotoFilmstrip />
              </section>

              <aside
                className={cn(
                  'workspace-inspector min-h-0 border-l border-border bg-card',
                  step === 'edit' && 'open',
                )}
                aria-label="Inspector"
              >
                <ScrollArea className="h-full">
                  <div className="p-3">
                    {step === 'edit' ? (
                      <EditPanel />
                    ) : step === 'template' ? (
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p className="text-xs font-semibold tracking-wider text-foreground uppercase">
                          Template
                        </p>
                        <p>
                          Select a frame from the library. Active template
                          updates the live 940×788 preview.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p className="text-xs font-semibold tracking-wider text-foreground uppercase">
                          Photo tips
                        </p>
                        <ul className="list-inside list-disc space-y-1.5 text-xs">
                          <li>Mark one cover image for package priority</li>
                          <li>Use batch privacy before public export</li>
                          <li>Amber warnings mean review before export</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </aside>
            </div>
          ) : (
            <div className="grid h-full min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
              <section className="min-h-0 overflow-auto border-r border-border bg-[var(--preview)] p-3 sm:p-4">
                <PreviewCanvas />
                <PhotoFilmstrip />
              </section>
              <aside className="min-h-0 overflow-auto bg-card p-4">
                <FormPanel step={step} />
              </aside>
            </div>
          )}
        </div>

        <ExportBar />
      </div>

      <ToastStack />
    </div>
  )
}
