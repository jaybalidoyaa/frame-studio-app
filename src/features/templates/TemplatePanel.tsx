import { useMemo, useState } from 'react'
import { useStudioStore } from '../../store/studioStore'
import type { FrameTemplate } from '../../domain/types'
import { validateTemplateConfig } from '../../domain/templates'

const CATEGORY_LABEL: Record<string, string> = {
  none: 'None',
  operational: 'Operational Report',
  minimal: 'Minimal Documentation',
  fire: 'Fire Response',
  medical: 'Medical Response',
  traffic: 'Traffic Incident',
  public: 'Public Information',
  internal: 'Internal / Confidential',
}

export function TemplatePanel() {
  const draft = useStudioStore((s) => s.draft)
  const templates = useStudioStore((s) => s.templates())
  const setTemplateId = useStudioStore((s) => s.setTemplateId)
  const saveTemplateLocal = useStudioStore((s) => s.saveTemplateLocal)
  const powerUser = useStudioStore((s) => s.settings.powerUser)
  const setStep = useStudioStore((s) => s.setStep)
  const selected = templates.find((t) => t.id === draft.templateId) ?? templates[0]!
  const [designer, setDesigner] = useState<FrameTemplate | null>(null)

  const groups = useMemo(() => {
    const map = new Map<string, FrameTemplate[]>()
    for (const t of templates) {
      const list = map.get(t.category) ?? []
      list.push(t)
      map.set(t.category, list)
    }
    return [...map.entries()]
  }, [templates])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Templates</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Data-driven frames with live accent previews. No third-party artwork.
        </p>
      </div>

      {groups.map(([cat, list]) => (
        <section key={cat} className="space-y-2">
          <h3
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-muted)' }}
          >
            {CATEGORY_LABEL[cat] ?? cat}
          </h3>
          <div className="grid gap-2">
            {list.map((t) => (
              <button
                key={t.id}
                type="button"
                className="text-left"
                onClick={() => setTemplateId(t.id)}
                style={{
                  border: `1px solid ${draft.templateId === t.id ? t.accentColor : 'var(--border)'}`,
                  background: 'var(--bg-elevated)',
                  padding: '0.75rem',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    aria-hidden
                    style={{
                      width: 56,
                      height: 47,
                      background: `linear-gradient(180deg, ${t.accentColor} 0 8%, #1a2740 8% 78%, #0b1220 78%)`,
                      border: '1px solid var(--border)',
                      flexShrink: 0,
                    }}
                  />
                  <div className="min-w-0">
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {t.requiredFields.length
                        ? `Requires: ${t.requiredFields.join(', ')}`
                        : 'No required fields'}
                      {t.isCustom ? ' · Custom' : ''}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}

      {powerUser && (
        <div className="space-y-3 border p-3" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">Template designer</h3>
            <button
              type="button"
              className="btn"
              onClick={() =>
                setDesigner(
                  structuredClone({
                    ...selected,
                    id: `custom-${crypto.randomUUID().slice(0, 8)}`,
                    name: `${selected.name} custom`,
                    isCustom: true,
                  }),
                )
              }
            >
              Customize selected
            </button>
          </div>
          {designer && (
            <DesignerForm
              value={designer}
              onChange={setDesigner}
              onSave={() => {
                const errors = validateTemplateConfig(designer)
                if (errors.length) {
                  useStudioStore.getState().toast(errors[0]!, 'error')
                  return
                }
                void saveTemplateLocal(designer)
                setTemplateId(designer.id)
              }}
            />
          )}
        </div>
      )}

      <button type="button" className="btn btn-primary" onClick={() => setStep('edit')}>
        Continue to edit
      </button>
    </div>
  )
}

function DesignerForm({
  value,
  onChange,
  onSave,
}: {
  value: FrameTemplate
  onChange: (t: FrameTemplate) => void
  onSave: () => void
}) {
  const patchLayer = (key: keyof FrameTemplate['layers'], checked: boolean) => {
    onChange({ ...value, layers: { ...value.layers, [key]: checked } })
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="field">
        <label>Name</label>
        <input
          className="input"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </div>
      <div className="field">
        <label>Accent color</label>
        <input
          type="color"
          className="input"
          value={value.accentColor}
          onChange={(e) => onChange({ ...value, accentColor: e.target.value })}
        />
      </div>
      <div className="field">
        <label>Title label</label>
        <input
          className="input"
          value={value.titleLabel}
          onChange={(e) => onChange({ ...value, titleLabel: e.target.value })}
        />
      </div>
      <div className="field">
        <label>Watermark</label>
        <input
          className="input"
          value={value.watermarkText}
          onChange={(e) => onChange({ ...value, watermarkText: e.target.value })}
        />
      </div>
      <div className="field">
        <label>Confidentiality label</label>
        <input
          className="input"
          value={value.confidentialityLabel}
          onChange={(e) =>
            onChange({ ...value, confidentialityLabel: e.target.value })
          }
        />
      </div>
      <div className="field">
        <label>Font scale ({value.fontScale.toFixed(2)})</label>
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.05}
          value={value.fontScale}
          onChange={(e) =>
            onChange({ ...value, fontScale: Number(e.target.value) })
          }
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(value.layers) as (keyof FrameTemplate['layers'])[]).map(
          (k) => (
            <label key={k} className="chip cursor-pointer">
              <input
                type="checkbox"
                checked={value.layers[k]}
                onChange={(e) => patchLayer(k, e.target.checked)}
              />
              {k.replace('show', '')}
            </label>
          ),
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="field">
          <label>Metadata Y</label>
          <input
            type="range"
            min={0.5}
            max={0.9}
            step={0.01}
            value={value.layout.metadata.y}
            onChange={(e) =>
              onChange({
                ...value,
                layout: {
                  ...value.layout,
                  metadata: {
                    ...value.layout.metadata,
                    y: Number(e.target.value),
                  },
                },
              })
            }
          />
        </div>
        <div className="field">
          <label>Title X</label>
          <input
            type="range"
            min={0}
            max={0.5}
            step={0.01}
            value={value.layout.title.x}
            onChange={(e) =>
              onChange({
                ...value,
                layout: {
                  ...value.layout,
                  title: { ...value.layout.title, x: Number(e.target.value) },
                },
              })
            }
          />
        </div>
      </div>
      <button type="button" className="btn btn-primary" onClick={onSave}>
        Save custom template locally
      </button>
    </div>
  )
}
