import { useStudioStore } from '../../store/studioStore'
import { metadataSummary } from '../../domain/validation'
import type { EventType, Severity } from '../../domain/types'
import { providers } from '../../providers'
import { useState } from 'react'

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'fire', label: 'Fire' },
  { value: 'medical', label: 'Medical' },
  { value: 'traffic', label: 'Traffic' },
  { value: 'hazmat', label: 'HazMat' },
  { value: 'rescue', label: 'Rescue' },
  { value: 'public_info', label: 'Public information' },
  { value: 'other', label: 'Other' },
]

const SEVERITIES: Severity[] = ['low', 'moderate', 'high', 'critical']

export function DetailsPanel() {
  const draft = useStudioStore((s) => s.draft)
  const drafts = useStudioStore((s) => s.drafts)
  const recents = useStudioStore((s) => s.recents)
  const updateMetadata = useStudioStore((s) => s.updateMetadata)
  const copyMetadataFromDraft = useStudioStore((s) => s.copyMetadataFromDraft)
  const issues = useStudioStore((s) => s.validationIssues())
  const setStep = useStudioStore((s) => s.setStep)
  const meta = draft.metadata
  const [mapQuery, setMapQuery] = useState('')
  const [mapResults, setMapResults] = useState<{ label: string }[]>([])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Incident metadata</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Manual location first. Map search uses a local adapter (no-op until configured).
        </p>
      </div>

      <div className="grid gap-3">
        <div className="field">
          <label htmlFor="eventType">Event type</label>
          <select
            id="eventType"
            className="select"
            value={meta.eventType}
            onChange={(e) =>
              updateMetadata({ eventType: e.target.value as EventType })
            }
          >
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {meta.eventType === 'other' && (
          <div className="field">
            <label htmlFor="eventOther">Custom event type</label>
            <input
              id="eventOther"
              className="input"
              value={meta.eventTypeOther}
              onChange={(e) => updateMetadata({ eventTypeOther: e.target.value })}
            />
          </div>
        )}

        <div className="field">
          <label htmlFor="severity">Severity / priority</label>
          <select
            id="severity"
            className="select"
            value={meta.severity}
            onChange={(e) =>
              updateMetadata({ severity: e.target.value as Severity })
            }
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="datetime">Date and time</label>
          <input
            id="datetime"
            type="datetime-local"
            className="input"
            value={meta.dateTimeLocal}
            onChange={(e) => updateMetadata({ dateTimeLocal: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="location">Location</label>
          <input
            id="location"
            className="input"
            list="recent-locations"
            value={meta.location}
            onChange={(e) => updateMetadata({ location: e.target.value })}
            placeholder="Street, landmark, or sector"
          />
          <datalist id="recent-locations">
            {recents.locations.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
          <label className="chip mt-1 w-fit cursor-pointer">
            <input
              type="checkbox"
              checked={meta.generalAreaOnly}
              onChange={(e) =>
                updateMetadata({ generalAreaOnly: e.target.checked })
              }
            />
            General area only
          </label>
        </div>

        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Map search (adapter)"
            value={mapQuery}
            onChange={(e) => setMapQuery(e.target.value)}
            aria-label="Map search"
          />
          <button
            type="button"
            className="btn"
            onClick={async () => {
              const results = await providers.map.search(mapQuery)
              setMapResults(results)
              if (!results.length) {
                useStudioStore.getState().toast('No map provider results (local no-op)', 'info')
              }
            }}
          >
            Search
          </button>
        </div>
        {mapResults.length > 0 && (
          <ul className="text-sm">
            {mapResults.map((r) => (
              <li key={r.label}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => updateMetadata({ location: r.label })}
                >
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="field">
          <label htmlFor="callsign">Unit / callsign</label>
          <input
            id="callsign"
            className="input"
            list="recent-callsigns"
            value={meta.callsign}
            onChange={(e) => updateMetadata({ callsign: e.target.value })}
          />
          <datalist id="recent-callsigns">
            {recents.callsigns.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div className="field">
          <label htmlFor="ref">Incident / reference number</label>
          <input
            id="ref"
            className="input"
            value={meta.referenceNumber}
            onChange={(e) => updateMetadata({ referenceNumber: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="shift">Shift / team</label>
          <input
            id="shift"
            className="input"
            value={meta.shiftTeam}
            onChange={(e) => updateMetadata({ shiftTeam: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="notes">Operational notes</label>
          <textarea
            id="notes"
            className="textarea"
            rows={3}
            value={meta.notes}
            onChange={(e) => updateMetadata({ notes: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="tags">Tags (comma-separated)</label>
          <input
            id="tags"
            className="input"
            value={meta.tags.join(', ')}
            onChange={(e) =>
              updateMetadata({
                tags: e.target.value
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="copyMeta">Copy metadata from draft</label>
        <select
          id="copyMeta"
          className="select"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) void copyMetadataFromDraft(e.target.value)
            e.target.value = ''
          }}
        >
          <option value="" disabled>
            Select prior draft…
          </option>
          {drafts
            .filter((d) => d.id !== draft.id)
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
        </select>
      </div>

      <div
        className="border p-3 text-sm"
        style={{ borderColor: 'var(--border)' }}
      >
        <strong className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Summary
        </strong>
        <p className="mt-1">{metadataSummary(meta)}</p>
      </div>

      {issues.filter((i) => i.field !== 'photos').length > 0 && (
        <ul className="text-sm" style={{ color: 'var(--accent-2)' }}>
          {issues
            .filter((i) => i.field !== 'photos')
            .map((i) => (
              <li key={i.field + i.message}>{i.message}</li>
            ))}
        </ul>
      )}

      <button type="button" className="btn btn-primary" onClick={() => setStep('template')}>
        Continue to templates
      </button>
    </div>
  )
}
