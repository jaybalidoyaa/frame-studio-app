import { Check } from 'lucide-react'
import { useStudioStore } from '@/store/studioStore'
import {
  WORKFLOW_DESCRIPTIONS,
  WORKFLOW_LABELS,
  WORKFLOW_STEPS,
} from '@/domain/types'
import type { WorkflowStep } from '@/domain/types'
import { useReadyToExport, useValidationIssues } from '@/store/hooks'
import { cn } from '@/lib/utils'

function canNavigateTo(
  target: WorkflowStep,
  current: WorkflowStep,
  hasPhotos: boolean,
  detailsOk: boolean,
): boolean {
  const targetIdx = WORKFLOW_STEPS.indexOf(target)
  const currentIdx = WORKFLOW_STEPS.indexOf(current)
  if (targetIdx <= currentIdx) return true
  if (!hasPhotos && targetIdx > 0) return false
  if (targetIdx >= 2 && !detailsOk && target !== 'details') {
    // allow template+ only if essential fields filled or already past details
    if (currentIdx < 1) return false
  }
  return true
}

export function WorkflowStepper() {
  const step = useStudioStore((s) => s.step)
  const setStep = useStudioStore((s) => s.setStep)
  const photoCount = useStudioStore((s) => s.draft.photos.length)
  const issues = useValidationIssues()
  const ready = useReadyToExport()
  const detailsOk = !issues.some((i) => i.field !== 'photos')
  const stepIndex = WORKFLOW_STEPS.indexOf(step)

  return (
    <nav
      className="flex min-w-0 flex-1 items-stretch gap-0 overflow-x-auto"
      aria-label="Workflow"
    >
      {WORKFLOW_STEPS.map((s, i) => {
        const active = step === s
        const done = i < stepIndex || (s === 'export' && ready && step === 'export')
        const allowed = canNavigateTo(s, step, photoCount > 0, detailsOk)
        return (
          <button
            key={s}
            type="button"
            disabled={!allowed && !active}
            onClick={() => allowed && setStep(s)}
            aria-current={active ? 'step' : undefined}
            className={cn(
              'group relative flex min-w-[7.5rem] flex-1 flex-col gap-0.5 border-b-2 px-2 py-2.5 text-left transition-colors sm:min-w-[8.5rem] sm:px-3',
              active
                ? 'border-primary bg-primary/5'
                : 'border-transparent hover:bg-muted/40',
              !allowed && !active && 'opacity-40',
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex size-5 items-center justify-center rounded-full text-[11px] font-bold',
                  active && 'bg-primary text-primary-foreground',
                  !active && done && 'bg-primary/20 text-primary',
                  !active && !done && 'bg-muted text-muted-foreground',
                )}
              >
                {done && !active ? <Check className="size-3" /> : i + 1}
              </span>
              <span
                className={cn(
                  'text-sm font-semibold',
                  active ? 'text-primary' : 'text-foreground',
                )}
              >
                {WORKFLOW_LABELS[s]}
              </span>
            </div>
            <span className="hidden pl-7 text-[11px] text-muted-foreground md:block">
              {WORKFLOW_DESCRIPTIONS[s]}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
