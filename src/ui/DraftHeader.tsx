import { useMemo, useState } from 'react'
import {
  Archive,
  Copy01,
  Moon01,
  Plus,
  Sun,
  Trash01,
  Rows01,
} from '@untitledui/icons'
import { useStudioStore } from '../store/studioStore'
import { metadataSummary } from '../domain/validation'
import { eventLabel } from '../domain/templates'
import { Button } from '../components/base/buttons/button'
import { Badge } from '../components/base/badges/badge'
import { Input, NativeSelect } from '../components/base/input/input'

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
  const [menuOpen, setMenuOpen] = useState(false)

  const summary = useMemo(
    () =>
      `${eventLabel(draft.metadata)} · ${draft.metadata.callsign || '—'} · ${draft.photos.length} photos · ${draft.exportStatus}`,
    [draft],
  )

  return (
    <header className="border-b border-border-secondary bg-bg-elevated/90 px-3 py-3 backdrop-blur-md sm:px-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <img
            src="/branding/brigada-onse-logo.png"
            alt="Brigada Onse"
            width={52}
            height={52}
            className="mt-0.5 h-11 w-11 shrink-0 object-contain sm:h-12 sm:w-12"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-brand-500 uppercase">
                  Sun Valley Fire &amp; Rescue
                </p>
                <h1 className="truncate text-base font-semibold text-fg-primary sm:text-lg">
                  Brigada Onse SVFAR Studio
                </h1>
              </div>
              <Badge color="gold">{draft.shortId}</Badge>
              <Badge
                color={
                  saveState === 'error'
                    ? 'error'
                    : saveState === 'saving'
                      ? 'warning'
                      : 'success'
                }
              >
                <span aria-live="polite">{savedLabel(saveState, lastSavedAt)}</span>
              </Badge>
            </div>

            <Input
              aria-label="Incident name"
              className="mt-2 max-w-xl"
              value={draft.name}
              onChange={(e) => renameDraft(e.target.value)}
            />
            <p
              className="mt-1 truncate text-xs text-fg-tertiary"
              title={metadataSummary(draft.metadata)}
            >
              {summary}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <NativeSelect
            aria-label="Resume draft"
            className="min-w-[10rem] max-w-full sm:min-w-[12rem]"
            value={draft.id}
            onChange={(e) => void loadDraft(e.target.value)}
          >
            {drafts
              .filter((d) => !d.archived)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            {drafts.some((d) => d.archived) && (
              <optgroup label="Archived">
                {drafts
                  .filter((d) => d.archived)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </optgroup>
            )}
          </NativeSelect>

          <Button
            color="primary"
            size="sm"
            onPress={() => void newDraft()}
          >
            <Plus data-icon className="size-4" />
            New
          </Button>

          <Button
            color="secondary"
            size="sm"
            className="lg:hidden"
            onPress={() => setMenuOpen((v) => !v)}
          >
            <Rows01 data-icon className="size-4" />
            More
          </Button>

          <div
            className={`${menuOpen ? 'flex' : 'hidden'} w-full flex-wrap gap-2 lg:flex lg:w-auto`}
          >
            <Button
              color="secondary"
              size="sm"
              onPress={() => void duplicateCurrent()}
            >
              <Copy01 data-icon className="size-4" />
              Duplicate
            </Button>
            <Button
              color="secondary"
              size="sm"
              onPress={() => void archiveCurrent()}
            >
              <Archive data-icon className="size-4" />
              Archive
            </Button>
            <Button
              color="secondary-destructive"
              size="sm"
              onPress={() => {
                if (confirm('Delete this draft permanently?')) void deleteCurrent()
              }}
            >
              <Trash01 data-icon className="size-4" />
              Delete
            </Button>
            <Button
              color="tertiary"
              size="sm"
              onPress={() =>
                setTheme(settings.theme === 'dark' ? 'light' : 'dark')
              }
            >
              {settings.theme === 'dark' ? (
                <Sun data-icon className="size-4" />
              ) : (
                <Moon01 data-icon className="size-4" />
              )}
              {settings.theme === 'dark' ? 'Light' : 'Dark'}
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-fg-tertiary ring-1 ring-inset ring-border-primary">
              <input
                type="checkbox"
                checked={settings.powerUser}
                onChange={(e) => setPowerUser(e.target.checked)}
              />
              Power user
            </label>
          </div>
        </div>
      </div>
    </header>
  )
}
