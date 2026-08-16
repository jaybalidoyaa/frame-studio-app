import { Menu01, XClose } from '@untitledui/icons'
import { useStudioStore } from '../store/studioStore'
import { WORKFLOW_LABELS, WORKFLOW_STEPS } from '../domain/types'
import type { WorkflowStep } from '../domain/types'
import { PhotosPanel } from '../features/photos/PhotosPanel'
import { DetailsPanel } from '../features/details/DetailsPanel'
import { TemplatePanel } from '../features/templates/TemplatePanel'
import { EditPanel } from '../features/edit/EditPanel'
import { ReviewPanel } from '../features/review/ReviewPanel'
import { ExportPanel } from '../features/export/ExportPanel'
import { PreviewCanvas } from './PreviewCanvas'
import { DraftHeader } from './DraftHeader'
import { ToastStack } from './ToastStack'
import { ExportBar } from './ExportBar'
import { Button } from '../components/base/buttons/button'

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

  return (
    <div className="app-shell">
      <DraftHeader />

      <nav className="stepper" aria-label="Workflow">
        {WORKFLOW_STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            className="step"
            aria-current={step === s ? 'step' : undefined}
            onClick={() => setStep(s)}
          >
            <span className="mr-1.5 inline-flex size-5 items-center justify-center rounded-full bg-black/15 text-[11px] font-bold">
              {i + 1}
            </span>
            {WORKFLOW_LABELS[s]}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 md:hidden">
          <Button
            color="secondary"
            size="sm"
            onPress={() => setInspectorOpen(!inspectorOpen)}
          >
            {inspectorOpen ? (
              <XClose data-icon className="size-4" />
            ) : (
              <Menu01 data-icon className="size-4" />
            )}
            {inspectorOpen ? 'Hide' : 'Panel'}
          </Button>
        </div>
      </nav>

      <div className="workspace">
        <aside
          className={`panel inspector-pane p-3 sm:p-4 ${inspectorOpen ? 'open' : 'max-md:hidden'}`}
          aria-label="Inspector"
        >
          <StepContent step={step} />
        </aside>
        <section className="preview-pane p-3 sm:p-4" aria-label="Preview">
          <PreviewCanvas />
        </section>
      </div>

      <ExportBar />
      <ToastStack />
    </div>
  )
}
