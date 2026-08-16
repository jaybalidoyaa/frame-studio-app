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
            <span style={{ opacity: 0.55, marginRight: 6 }}>{i + 1}</span>
            {WORKFLOW_LABELS[s]}
          </button>
        ))}
        <button
          type="button"
          className="btn btn-ghost ml-auto md:hidden"
          onClick={() => setInspectorOpen(!inspectorOpen)}
        >
          {inspectorOpen ? 'Hide panel' : 'Show panel'}
        </button>
      </nav>

      <div className="workspace">
        <aside
          className={`panel inspector-pane p-4 ${inspectorOpen ? 'open' : ''}`}
          aria-label="Inspector"
        >
          <StepContent step={step} />
        </aside>
        <section className="preview-pane p-4" aria-label="Preview">
          <PreviewCanvas />
        </section>
      </div>

      <ExportBar />
      <ToastStack />
    </div>
  )
}
