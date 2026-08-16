import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useStudioStore } from '@/store/studioStore'
import { WORKFLOW_LABELS, WORKFLOW_STEPS } from '@/domain/types'
import type { WorkflowStep } from '@/domain/types'
import { PhotosPanel } from '@/features/photos/PhotosPanel'
import { DetailsPanel } from '@/features/details/DetailsPanel'
import { TemplatePanel } from '@/features/templates/TemplatePanel'
import { EditPanel } from '@/features/edit/EditPanel'
import { ReviewPanel } from '@/features/review/ReviewPanel'
import { ExportPanel } from '@/features/export/ExportPanel'
import { PreviewCanvas } from '@/ui/PreviewCanvas'
import { DraftHeader } from '@/ui/DraftHeader'
import { ToastStack } from '@/ui/ToastStack'
import { ExportBar } from '@/ui/ExportBar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

function StepContent({ step }: { step: WorkflowStep }) {
  switch (step) {
    case 'photos':
      return <PhotosPanel />
    case 'details':
      return <DetailsPanel />
    case 'template':
      return <TemplatePanel />
    case 'edit':
      return <EditPanel />
    case 'review':
      return <ReviewPanel />
    case 'export':
      return <ExportPanel />
  }
}

export function AppShell() {
  const step = useStudioStore((s) => s.step)
  const setStep = useStudioStore((s) => s.setStep)
  const inspectorOpen = useStudioStore((s) => s.inspectorOpen)
  const setInspectorOpen = useStudioStore((s) => s.setInspectorOpen)
  const stepIndex = WORKFLOW_STEPS.indexOf(step)

  return (
    <div className="app-shell">
      <DraftHeader />

      <div className="border-b border-border/80 bg-card/60 backdrop-blur-sm">
        <div className="flex items-center gap-2 px-3 py-2 sm:px-4">
          <nav
            className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-0.5"
            aria-label="Workflow"
          >
            {WORKFLOW_STEPS.map((s, i) => {
              const active = step === s
              const done = i < stepIndex
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStep(s)}
                  aria-current={active ? 'step' : undefined}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                    active && 'bg-primary text-primary-foreground shadow-sm',
                    !active &&
                      done &&
                      'text-foreground hover:bg-muted',
                    !active &&
                      !done &&
                      'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex size-5 items-center justify-center rounded-full text-[11px] font-bold',
                      active
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : done
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="hidden sm:inline">{WORKFLOW_LABELS[s]}</span>
                </button>
              )
            })}
          </nav>

          <Button
            variant="outline"
            size="sm"
            className="shrink-0 md:hidden"
            onClick={() => setInspectorOpen(!inspectorOpen)}
          >
            {inspectorOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
            <span className="hidden xs:inline">
              {inspectorOpen ? 'Hide' : 'Tools'}
            </span>
            <Menu className="xs:hidden" />
          </Button>
        </div>
      </div>

      <div className="workspace">
        <aside
          className={cn(
            'min-h-0 border-r border-border/80 bg-sidebar text-sidebar-foreground',
            !inspectorOpen && 'max-md:hidden',
          )}
          aria-label="Inspector"
        >
          <ScrollArea className="h-full">
            <div className="p-4">
              <StepContent step={step} />
            </div>
          </ScrollArea>
        </aside>

        <section
          className="preview-pane min-h-0 overflow-auto bg-[var(--preview)] p-3 sm:p-4"
          aria-label="Preview"
        >
          <PreviewCanvas />
        </section>
      </div>

      <ExportBar />
      <ToastStack />
    </div>
  )
}
