import { useMemo } from 'react'
import { useStudioStore } from '../store/studioStore'
import { metadataSummary } from '../domain/validation'
import { eventLabel } from '../domain/templates'

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

  const summary = useMemo(
    () =>
      `${eventLabel(draft.metadata)} · ${draft.metadata.callsign || '—'} · ${draft.photos.length} photos · ${draft.exportStatus}`,
    [draft],
  )

  return (
    <header
      className="flex flex-wrap items-center gap-3 px-4 py-3"
      style={{ background: 'var(--bg-elevated)' }}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <img
          src="/branding/emblem.svg"
          alt=""
          width={36}
          height={36}
          className="shrink-0"
        />
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <strong className="tracking-wide">Frame Studio</strong>
            <span className="chip">{draft.shortId}</span>
          </div>
          <input
            className="input mt-1"
            aria-label="Incident name"
            value={draft.name}
            onChange={(e) => renameDraft(e.target.value)}
          />
          <p
            className="mt-1 truncate text-xs"
            style={{ color: 'var(--text-muted)' }}
            title={metadataSummary(draft.metadata)}
          >
            {summary}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="chip" aria-live="polite">
          {savedLabel(saveState, lastSavedAt)}
        </span>
        <label className="field" style={{ minWidth: 160 }}>
          <span className="sr-only">Resume draft</span>
          <select
            className="select"
            aria-label="Resume draft"
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
          </select>
        </label>
        <button type="button" className="btn" onClick={() => void newDraft()}>
          New
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => void duplicateCurrent()}
        >
          Duplicate
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => void archiveCurrent()}
        >
          Archive
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => {
            if (confirm('Delete this draft permanently?')) void deleteCurrent()
          }}
        >
          Delete
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() =>
            setTheme(settings.theme === 'dark' ? 'light' : 'dark')
          }
        >
          {settings.theme === 'dark' ? 'Light' : 'Dark'}
        </button>
        <label className="chip cursor-pointer">
          <input
            type="checkbox"
            checked={settings.powerUser}
            onChange={(e) => setPowerUser(e.target.checked)}
          />
          Power user
        </label>
      </div>
    </header>
  )
}
