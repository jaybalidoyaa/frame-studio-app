import {
  Moon,
  PanelLeft,
  Save,
  Settings2,
  Sun,
  Maximize2,
} from 'lucide-react'
import { useStudioStore } from '@/store/studioStore'
import { WorkflowStepper } from '@/ui/WorkflowStepper'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

function savedLabel(saveState: string, lastSavedAt: number | null): string {
  if (saveState === 'saving') return 'Saving…'
  if (saveState === 'error') return 'Save failed'
  if (!lastSavedAt) return 'Local draft'
  const sec = Math.round((Date.now() - lastSavedAt) / 1000)
  if (sec < 8) return 'Saved just now'
  if (sec < 60) return `Saved ${sec}s ago`
  return `Saved ${Math.round(sec / 60)}m ago`
}

export function TopBar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const saveState = useStudioStore((s) => s.saveState)
  const lastSavedAt = useStudioStore((s) => s.lastSavedAt)
  const settings = useStudioStore((s) => s.settings)
  const setTheme = useStudioStore((s) => s.setTheme)
  const setPowerUser = useStudioStore((s) => s.setPowerUser)
  const draft = useStudioStore((s) => s.draft)
  const renameDraft = useStudioStore((s) => s.renameDraft)

  return (
    <header className="border-b border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border/60 px-2 py-1.5 sm:px-3">
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-sm lg:hidden"
          onClick={onToggleSidebar}
          aria-label="Toggle incidents sidebar"
        >
          <PanelLeft />
        </Button>

        <div className="min-w-0 flex-1">
          <input
            value={draft.name}
            onChange={(e) => renameDraft(e.target.value)}
            aria-label="Incident name"
            className="w-full max-w-md truncate bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground"
            placeholder="Untitled incident"
          />
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Save className="size-3.5" />
          <span aria-live="polite">{savedLabel(saveState, lastSavedAt)}</span>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-sm"
              onClick={() =>
                setTheme(settings.theme === 'dark' ? 'light' : 'dark')
              }
            >
              {settings.theme === 'dark' ? <Sun /> : <Moon />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle theme</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-sm"
              onClick={() => setPowerUser(!settings.powerUser)}
            >
              <Settings2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {settings.powerUser ? 'Disable power user' : 'Enable power user'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-sm"
              onClick={() => document.documentElement.requestFullscreen?.()}
            >
              <Maximize2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fullscreen</TooltipContent>
        </Tooltip>
      </div>

      <WorkflowStepper />
    </header>
  )
}
