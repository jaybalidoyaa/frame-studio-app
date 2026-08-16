import { useMemo } from 'react'
import {
  Archive,
  CircleHelp,
  Plus,
  Settings,
  Trash2,
  WifiOff,
} from 'lucide-react'
import { useStudioStore } from '@/store/studioStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

function relativeSaved(iso: string): string {
  const sec = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (Number.isNaN(sec) || sec < 8) return 'Saved just now'
  if (sec < 60) return `${sec}s ago`
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`
  return `${Math.round(sec / 86400)}d ago`
}

export function IncidentSidebar({
  open,
  onClose,
}: {
  open?: boolean
  onClose?: () => void
}) {
  const draft = useStudioStore((s) => s.draft)
  const drafts = useStudioStore((s) => s.drafts)
  const newDraft = useStudioStore((s) => s.newDraft)
  const loadDraft = useStudioStore((s) => s.loadDraft)
  const clearSensitive = useStudioStore((s) => s.clearSensitive)
  const setPowerUser = useStudioStore((s) => s.setPowerUser)
  const settings = useStudioStore((s) => s.settings)
  const setStep = useStudioStore((s) => s.setStep)

  const active = useMemo(() => drafts.filter((d) => !d.archived), [drafts])
  const archived = useMemo(() => drafts.filter((d) => d.archived), [drafts])
  const callsign = draft.metadata.callsign || 'Operator'

  return (
    <aside
      className={cn(
        'app-sidebar flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground',
        open && 'open',
      )}
      aria-label="Incidents"
    >
      <div className="flex items-center gap-2.5 border-b border-sidebar-border px-3 py-3">
        <img
          src="/branding/brigada-onse-logo.png"
          alt=""
          className="size-9 object-contain"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-wide uppercase">
            Frame Studio
          </p>
          <p className="truncate text-[10px] tracking-wider text-muted-foreground uppercase">
            Emergency documentation
          </p>
        </div>
      </div>

      <div className="space-y-3 p-3">
        <Button
          className="w-full justify-start rounded-sm"
          onClick={() => {
            void newDraft()
            setStep('photos')
            onClose?.()
          }}
        >
          <Plus data-icon="inline-start" />
          New Incident
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-2">
        <p className="px-2 pb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          Incidents
        </p>
        <div className="space-y-0.5 pb-3">
          {active.map((d) => {
            const selected = d.id === draft.id
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  void loadDraft(d.id)
                  onClose?.()
                }}
                className={cn(
                  'w-full rounded-sm border border-transparent px-2.5 py-2 text-left transition-colors',
                  selected
                    ? 'border-primary/60 bg-primary/10'
                    : 'hover:bg-sidebar-accent',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'truncate text-sm font-medium',
                        selected && 'text-primary',
                      )}
                    >
                      {d.name}
                    </p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {d.metadata.callsign || d.shortId}
                      {d.photos.length ? ` · ${d.photos.length} photos` : ''}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'mt-1 size-1.5 shrink-0 rounded-full',
                      d.exportStatus === 'exported'
                        ? 'bg-[var(--success)]'
                        : selected
                          ? 'bg-primary'
                          : 'bg-muted-foreground/50',
                    )}
                  />
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {relativeSaved(d.updatedAt)}
                </p>
              </button>
            )
          })}
        </div>

        {archived.length > 0 && (
          <>
            <p className="flex items-center gap-1 px-2 pb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              <Archive className="size-3" /> Archived
            </p>
            <div className="space-y-0.5 pb-3">
              {archived.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    void loadDraft(d.id)
                    onClose?.()
                  }}
                  className="w-full rounded-sm px-2.5 py-2 text-left text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                >
                  <p className="truncate">{d.name}</p>
                  <p className="font-mono text-[11px]">{d.shortId}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </ScrollArea>

      <div className="mt-auto space-y-2 border-t border-sidebar-border p-3">
        <div className="rounded-sm border border-sidebar-border bg-muted/40 px-2.5 py-2">
          <div className="flex items-center gap-2 text-xs">
            <WifiOff className="size-3.5 text-[var(--success)]" />
            <span className="font-medium">Offline mode</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            All changes saved locally on this device.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start rounded-sm"
          onClick={() => {
            if (
              confirm(
                'Clear sensitive local data for this draft? Source images and notes will be removed.',
              )
            ) {
              void clearSensitive()
            }
          }}
        >
          <Trash2 data-icon="inline-start" />
          Clear sensitive data
        </Button>

        <Separator />

        <div className="flex items-center gap-2 px-0.5">
          <div className="flex size-8 items-center justify-center rounded-sm border border-sidebar-border bg-muted text-[10px] font-bold">
            {(callsign.slice(0, 2) || 'OP').toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{callsign} Operator</p>
            <p className="truncate font-mono text-[10px] text-muted-foreground">
              {draft.shortId}
            </p>
          </div>
        </div>

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start rounded-sm"
            onClick={() => setPowerUser(!settings.powerUser)}
          >
            <Settings data-icon="inline-start" />
            Settings
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-sm"
            onClick={() =>
              window.open(
                'https://github.com/jaybalidoyaa/frame-studio-app',
                '_blank',
                'noopener,noreferrer',
              )
            }
            aria-label="Help and guide"
          >
            <CircleHelp />
          </Button>
        </div>
        {settings.powerUser && (
          <Badge variant="outline" className="w-fit rounded-sm text-[10px]">
            Power user on
          </Badge>
        )}
      </div>
    </aside>
  )
}
