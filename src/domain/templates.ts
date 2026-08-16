import type { FrameTemplate, IncidentMetadata, NormRect } from './types'

const safe: NormRect = { x: 0.04, y: 0.08, w: 0.92, h: 0.72 }

const defaultLayout = (): FrameTemplate['layout'] => ({
  logo: { x: 0.04, y: 0.03, w: 0.1, h: 0.08 },
  title: { x: 0.16, y: 0.03, w: 0.6, h: 0.06 },
  metadata: { x: 0.04, y: 0.84, w: 0.7, h: 0.12 },
  watermark: { x: 0.55, y: 0.45, w: 0.4, h: 0.08 },
  confidentiality: { x: 0.72, y: 0.03, w: 0.24, h: 0.05 },
  qr: { x: 0.86, y: 0.84, w: 0.1, h: 0.12 },
  accentBar: { x: 0, y: 0, w: 1, h: 0.012 },
  photoSafe: safe,
})

const baseLayers = (
  overrides: Partial<FrameTemplate['layers']> = {},
): FrameTemplate['layers'] => ({
  showLogo: true,
  showTitle: true,
  showMetadata: true,
  showWatermark: false,
  showConfidentiality: false,
  showQr: false,
  showAccentBar: true,
  ...overrides,
})

function tpl(
  partial: Omit<FrameTemplate, 'layout' | 'layers' | 'fontScale'> &
    Partial<Pick<FrameTemplate, 'layout' | 'layers' | 'fontScale'>>,
): FrameTemplate {
  return {
    fontScale: 1,
    layout: defaultLayout(),
    layers: baseLayers(),
    ...partial,
  }
}

export const BUILTIN_TEMPLATES: FrameTemplate[] = [
  tpl({
    id: 'none',
    name: 'No frame',
    category: 'none',
    accentColor: '#64748b',
    watermarkText: '',
    confidentialityLabel: '',
    titleLabel: '',
    requiredFields: [],
    layers: baseLayers({
      showLogo: false,
      showTitle: false,
      showMetadata: false,
      showAccentBar: false,
    }),
  }),
  tpl({
    id: 'operational',
    name: 'Operational Report',
    category: 'operational',
    accentColor: '#c45c26',
    watermarkText: '',
    confidentialityLabel: '',
    titleLabel: 'OPERATIONAL REPORT',
    requiredFields: ['eventType', 'dateTimeLocal', 'callsign'],
  }),
  tpl({
    id: 'minimal',
    name: 'Minimal Documentation',
    category: 'minimal',
    accentColor: '#94a3b8',
    watermarkText: '',
    confidentialityLabel: '',
    titleLabel: 'DOCUMENTATION',
    requiredFields: ['dateTimeLocal'],
    layers: baseLayers({ showLogo: false, showMetadata: true }),
  }),
  tpl({
    id: 'fire',
    name: 'Fire Response',
    category: 'fire',
    accentColor: '#dc2626',
    watermarkText: '',
    confidentialityLabel: '',
    titleLabel: 'FIRE RESPONSE',
    requiredFields: ['eventType', 'dateTimeLocal', 'callsign', 'location'],
  }),
  tpl({
    id: 'medical',
    name: 'Medical Response',
    category: 'medical',
    accentColor: '#16a34a',
    watermarkText: '',
    confidentialityLabel: 'PHI — HANDLE WITH CARE',
    titleLabel: 'MEDICAL RESPONSE',
    requiredFields: ['eventType', 'dateTimeLocal', 'callsign'],
    layers: baseLayers({ showConfidentiality: true }),
  }),
  tpl({
    id: 'traffic',
    name: 'Traffic Incident',
    category: 'traffic',
    accentColor: '#e8a317',
    watermarkText: '',
    confidentialityLabel: '',
    titleLabel: 'TRAFFIC INCIDENT',
    requiredFields: ['eventType', 'dateTimeLocal', 'location'],
  }),
  tpl({
    id: 'public',
    name: 'Public Information',
    category: 'public',
    accentColor: '#3b82f6',
    watermarkText: 'FOR PUBLIC RELEASE',
    confidentialityLabel: '',
    titleLabel: 'PUBLIC INFORMATION',
    requiredFields: ['eventType', 'dateTimeLocal'],
    layers: baseLayers({ showWatermark: true }),
  }),
  tpl({
    id: 'internal',
    name: 'Internal / Confidential',
    category: 'internal',
    accentColor: '#ef4444',
    watermarkText: 'INTERNAL USE ONLY',
    confidentialityLabel: 'CONFIDENTIAL',
    titleLabel: 'INTERNAL DOCUMENTATION',
    requiredFields: ['eventType', 'dateTimeLocal', 'callsign', 'referenceNumber'],
    layers: baseLayers({
      showWatermark: true,
      showConfidentiality: true,
      showQr: true,
    }),
  }),
]

export function getTemplateById(
  id: string,
  extras: FrameTemplate[] = [],
): FrameTemplate {
  return (
    extras.find((t) => t.id === id) ??
    BUILTIN_TEMPLATES.find((t) => t.id === id) ??
    BUILTIN_TEMPLATES[0]!
  )
}

export function validateTemplateConfig(t: FrameTemplate): string[] {
  const errors: string[] = []
  if (!t.id?.trim()) errors.push('Template id is required')
  if (!t.name?.trim()) errors.push('Template name is required')
  if (!/^#[0-9a-fA-F]{6}$/.test(t.accentColor)) {
    errors.push('Accent color must be a hex color (#RRGGBB)')
  }
  if (t.fontScale < 0.5 || t.fontScale > 2) {
    errors.push('Font scale must be between 0.5 and 2')
  }
  const rects: [string, NormRect][] = Object.entries(t.layout) as [
    string,
    NormRect,
  ][]
  for (const [key, r] of rects) {
    if (r.w <= 0 || r.h <= 0 || r.x < 0 || r.y < 0 || r.x + r.w > 1.01 || r.y + r.h > 1.01) {
      errors.push(`Layout.${key} is out of bounds`)
    }
  }
  return errors
}

export function eventLabel(meta: IncidentMetadata): string {
  if (meta.eventType === 'other') {
    return meta.eventTypeOther.trim() || 'Other'
  }
  const map: Record<string, string> = {
    fire: 'Fire',
    medical: 'Medical',
    traffic: 'Traffic',
    hazmat: 'HazMat',
    rescue: 'Rescue',
    public_info: 'Public Information',
  }
  return map[meta.eventType] ?? meta.eventType
}
