import { useMemo } from 'react'
import {
  Archive,
  Copy,
  Moon,
  MoreHorizontal,
  Plus,
  Settings2,
  Sun,
  Trash2,
} from 'lucide-react'
import { useStudioStore } from '@/store/studioStore'
import { metadataSummary } from '@/domain/validation'
import { eventLabel } from '@/domain/templates'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

function savedLabel(saveState: string, lastSavedAt: number | null): string {
  if (saveState === 'saving') return 'Saving…'
  if (saveState === 'error') return 'Save failed'
  if (!lastSavedAt) return 'Not saved yet'
  const sec = Math.round((Date.now() - lastSavedAt) / 1000)
  if (sec < 8) return 'Saved just now'
  if (sec < 60) return `Saved ${sec}s ago`
  return `Saved ${Math.round(sec / 60)}m ago`
}

export function DraftHeader() {
  const draft = useStudioStore((s) => s.draft)
  const drafts = useStudioStore((s) => s.drafts)
  const saveState = useStudioStore((s) => s.saveState)
  const lastSavedAt = useStudioStore((s) => s.lastSavedAt)
  const settings = useStudioStore((s) => s.settings)
  const renameDraft = useStudioStore((s) => s.renameDraft)
  const newDraft = useStudioStore((s) => s.newDraft)
  const loadDraft = useStudioStore((s) => s.loadDraft)
  const duplicateCurrent = useStudioStore((s) => s.duplicateCurrent)
  const archiveCurrent = useStudioStore((s) => s.archiveCurrent)
  const deleteCurrent = useStudioStore((s) => s.deleteCurrent)
  const setTheme = useStudioStore((s) => s.setTheme)
  const setPowerUser = useStudioStore((s) => s.setPowerUser)

  const activeDrafts = drafts.filter((d) => !d.archived)
  const archivedDrafts = drafts.filter((d) => d.archived)

  const summary = useMemo(
    () =>
      `${eventLabel(draft.metadata)} · ${draft.metadata.callsign || '—'} · ${draft.photos.length} photos · ${draft.exportStatus}`,
    [draft],
  )

  return (
    <header className="border-b border-border/80 bg-card/80 backdrop-blur-md">
      <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <img
            src="/branding/brigada-onse-logo.png"
            alt="Brigada Onse"
            width={48}
            height={48}
            className="size-11 shrink-0 object-contain sm:size-12"
          />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-[0.16em] text-primary uppercase">
                  Sun Valley Fire &amp; Rescue
                </p>
                <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
                  Brigada Onse SVFAR Studio
                </h1>
              </div>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {draft.shortId}
              </Badge>
              <Badge
                variant={
                  saveState === 'error'
                    ? 'destructive'
                    : saveState === 'saving'
                      ? 'outline'
                      : 'secondary'
                }
              >
                <span aria-live="polite">{savedLabel(saveState, lastSavedAt)}</span>
              </Badge>
            </div>
            <Input
              aria-label="Incident name"
              value={draft.name}
              onChange={(e) => renameDraft(e.target.value)}
              className="h-9 max-w-xl bg-background"
            />
            <p
              className="truncate text-xs text-muted-foreground"
              title={metadataSummary(draft.metadata)}
            >
              {summary}
            </p>
          </div>
        </div>

        <Separator className="lg:hidden" />

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <div className="min-w-[10rem] flex-1 sm:flex-none sm:min-w-[14rem]">
            <Label htmlFor="draft-select" className="sr-only">
              Resume draft
            </Label>
            <Select value={draft.id} onValueChange={(v) => void loadDraft(v)}>
              <SelectTrigger id="draft-select" className="w-full bg-background">
                <SelectValue placeholder="Select draft" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Active drafts</SelectLabel>
                  {activeDrafts.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
                {archivedDrafts.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Archived</SelectLabel>
                    {archivedDrafts.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => void newDraft()}>
            <Plus data-icon="inline-start" />
            New
          </Button>

          <div className="hidden items-center gap-2 md:flex">
            <Button variant="outline" onClick={() => void duplicateCurrent()}>
              <Copy data-icon="inline-start" />
              Duplicate
            </Button>
            <Button variant="outline" onClick={() => void archiveCurrent()}>
              <Archive data-icon="inline-start" />
              Archive
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm('Delete this draft permanently?')) void deleteCurrent()
              }}
            >
              <Trash2 data-icon="inline-start" />
              Delete
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Draft actions</DropdownMenuLabel>
              <DropdownMenuItem
                className="md:hidden"
                onClick={() => void duplicateCurrent()}
              >
                <Copy /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                className="md:hidden"
                onClick={() => void archiveCurrent()}
              >
                <Archive /> Archive
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive md:hidden"
                onClick={() => {
                  if (confirm('Delete this draft permanently?')) void deleteCurrent()
                }}
              >
                <Trash2 /> Delete
              </DropdownMenuItem>
              <DropdownMenuSeparator className="md:hidden" />
              <DropdownMenuLabel className="flex items-center gap-2 font-normal">
                <Settings2 className="size-3.5" /> Preferences
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() =>
                  setTheme(settings.theme === 'dark' ? 'light' : 'dark')
                }
              >
                {settings.theme === 'dark' ? <Sun /> : <Moon />}
                {settings.theme === 'dark' ? 'Light theme' : 'Dark theme'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="flex items-center justify-between gap-3 px-2 py-1.5">
                <Label htmlFor="power-user" className="text-sm font-normal">
                  Power user
                </Label>
                <Switch
                  id="power-user"
                  checked={settings.powerUser}
                  onCheckedChange={setPowerUser}
                />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
