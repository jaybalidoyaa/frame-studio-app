import { useStudioStore } from '../../store/studioStore'
import { getTemplateById } from '../../domain/templates'
import { validateMetadata } from '../../domain/validation'

export function ReviewPanel() {
  const draft = useStudioStore((s) => s.draft)
  const customTemplates = useStudioStore((s) => s.customTemplates)
  const isReady = useStudioStore((s) => s.isReadyToExport())
  const setStep = useStudioStore((s) => s.setStep)
  const setPhotoPrivacy = useStudioStore((s) => s.setPhotoPrivacy)
  const setActivePhoto = useStudioStore((s) => s.setActivePhoto)

  const template = getTemplateById(draft.templateId, customTemplates)
  const issues = validateMetadata(draft.metadata, template, draft.photos.length)

  const checklist = [
    {
      id: 'fields',
      ok: issues.filter((i) => i.field !== 'photos').length === 0,
      label: 'Required metadata complete for template',
    },
    {
      id: 'photos',
      ok: draft.photos.length > 0,
      label: 'At least one photo selected',
    },
    {
      id: 'privacy',
      ok: draft.photos.every((p) => p.privacy !== 'needs_review'),
      label: 'Every photo classified (not needs-review)',
    },
    {
      id: 'public',
      ok: draft.photos
        .filter((p) => p.privacy === 'public_safe')
        .every((p) => p.redactions.length > 0 || !p.warnings.some((w) => w.code === 'blurry')),
      label: 'Public-safe photos reviewed for sensitive content',
    },
    {
      id: 'exif',
      ok: !draft.retainExifForArchive || draft.photos.every((p) => p.privacy === 'internal_only'),
      label: 'EXIF retention only used with internal-only intent',
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Review & approval</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Final gate before package export.
        </p>
      </div>

      <div
        className="border p-3"
        style={{
          borderColor: isReady ? 'var(--success)' : 'var(--accent-2)',
        }}
      >
        <strong>{isReady ? 'Ready to export' : 'Not ready'}</strong>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Template: {template.name} · Incident {draft.shortId}
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Privacy checklist
        </h3>
        <ul className="space-y-1 text-sm">
          {checklist.map((c) => (
            <li key={c.id} className="flex gap-2">
              <span aria-hidden>{c.ok ? '✓' : '○'}</span>
              <span style={{ color: c.ok ? 'var(--text)' : 'var(--accent-2)' }}>
                {c.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Template</th>
              <th>Privacy</th>
              <th>Warnings</th>
              <th>Redactions</th>
            </tr>
          </thead>
          <tbody>
            {draft.photos.map((p) => {
              const tpl = getTemplateById(
                p.templateIdOverride ?? draft.templateId,
                customTemplates,
              )
              return (
                <tr key={p.id}>
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: 0 }}
                      onClick={() => {
                        setActivePhoto(p.id)
                        setStep('edit')
                      }}
                    >
                      {p.name}
                      {p.isCover ? ' ★' : ''}
                      {p.modified ? ' •' : ''}
                    </button>
                  </td>
                  <td>{tpl.name}</td>
                  <td>
                    <select
                      className="select"
                      value={p.privacy}
                      onChange={(e) =>
                        setPhotoPrivacy(
                          p.id,
                          e.target.value as 'internal_only' | 'public_safe' | 'needs_review',
                        )
                      }
                    >
                      <option value="needs_review">Needs review</option>
                      <option value="public_safe">Public-safe</option>
                      <option value="internal_only">Internal-only</option>
                    </select>
                  </td>
                  <td>
                    {p.warnings.length
                      ? p.warnings.map((w) => w.code).join(', ')
                      : '—'}
                  </td>
                  <td>{p.redactions.length}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {issues.length > 0 && (
        <ul className="text-sm" style={{ color: 'var(--accent-2)' }}>
          {issues.map((i) => (
            <li key={i.field + i.message}>{i.message}</li>
          ))}
        </ul>
      )}

      <button type="button" className="btn btn-primary" onClick={() => setStep('export')}>
        Continue to export
      </button>
    </div>
  )
}
