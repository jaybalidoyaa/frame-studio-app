/** Fixed export canvas size for all framed outputs */
export const EXPORT_WIDTH = 940
export const EXPORT_HEIGHT = 788
export const EXPORT_ASPECT = EXPORT_WIDTH / EXPORT_HEIGHT

export const WORKFLOW_STEPS = [
  'photos',
  'details',
  'template',
  'edit',
  'review',
  'export',
] as const

export type WorkflowStep = (typeof WORKFLOW_STEPS)[number]

export const WORKFLOW_LABELS: Record<WorkflowStep, string> = {
  photos: 'Photos',
  details: 'Details',
  template: 'Template',
  edit: 'Edit',
  review: 'Review',
  export: 'Export',
}

export const WORKFLOW_DESCRIPTIONS: Record<WorkflowStep, string> = {
  photos: 'Upload & manage',
  details: 'Incident metadata',
  template: 'Frame & branding',
  edit: 'Adjust & enhance',
  review: 'Check & confirm',
  export: 'Download package',
}

export type EventType =
  | 'fire'
  | 'medical'
  | 'traffic'
  | 'hazmat'
  | 'rescue'
  | 'public_info'
  | 'other'

export type Severity = 'low' | 'moderate' | 'high' | 'critical'

export type PrivacyClass = 'internal_only' | 'public_safe' | 'needs_review'

export type ExportStatus = 'draft' | 'ready' | 'exported' | 'cleared'

export type PhotoStatus = 'ok' | 'warning' | 'error' | 'processing'

export type RedactionKind = 'blur' | 'pixelate' | 'blackout' | 'crop'

export type CropMode = 'fill' | 'fit'

export interface NormRect {
  x: number
  y: number
  w: number
  h: number
}

export interface PhotoAdjust {
  zoom: number
  panX: number
  panY: number
  rotation: number
  flipH: boolean
  flipV: boolean
  focalX: number
  focalY: number
  brightness: number
  contrast: number
  saturation: number
  temperature: number
  sharpen: number
  cropMode: CropMode
}

export const DEFAULT_ADJUST: PhotoAdjust = {
  zoom: 1,
  panX: 0,
  panY: 0,
  rotation: 0,
  flipH: false,
  flipV: false,
  focalX: 0.5,
  focalY: 0.5,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  sharpen: 0,
  cropMode: 'fill',
}

export interface RedactionMark {
  id: string
  kind: RedactionKind
  /** Normalized 0–1 relative to export canvas */
  rect: NormRect
}

export interface PhotoWarning {
  code: 'too_small' | 'blurry' | 'corrupt' | 'bad_aspect' | 'unsupported'
  message: string
}

export interface StudioPhoto {
  id: string
  name: string
  /** Object URL or data URL for source display */
  sourceUrl: string
  /** Blob for persistence (may be undefined after clear) */
  blob?: Blob
  width: number
  height: number
  fileSize: number
  mimeType: string
  orientation: number
  status: PhotoStatus
  warnings: PhotoWarning[]
  adjust: PhotoAdjust
  redactions: RedactionMark[]
  privacy: PrivacyClass
  isCover: boolean
  modified: boolean
  templateIdOverride?: string
}

export interface IncidentMetadata {
  eventType: EventType
  eventTypeOther: string
  severity: Severity
  dateTimeLocal: string
  location: string
  generalAreaOnly: boolean
  callsign: string
  referenceNumber: string
  shiftTeam: string
  notes: string
  tags: string[]
}

export function defaultMetadata(): IncidentMetadata {
  return {
    eventType: 'traffic',
    eventTypeOther: '',
    severity: 'moderate',
    dateTimeLocal: toDatetimeLocalValue(new Date()),
    location: '',
    generalAreaOnly: false,
    callsign: '',
    referenceNumber: '',
    shiftTeam: '',
    notes: '',
    tags: [],
  }
}

export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export type TemplateCategory =
  | 'operational'
  | 'minimal'
  | 'fire'
  | 'medical'
  | 'traffic'
  | 'public'
  | 'internal'
  | 'none'

export interface TemplateLayers {
  showLogo: boolean
  showTitle: boolean
  showMetadata: boolean
  showWatermark: boolean
  showConfidentiality: boolean
  showQr: boolean
  showAccentBar: boolean
}

export interface TemplateLayout {
  logo: NormRect
  title: NormRect
  metadata: NormRect
  watermark: NormRect
  confidentiality: NormRect
  qr: NormRect
  accentBar: NormRect
  photoSafe: NormRect
}

export interface FrameTemplate {
  id: string
  name: string
  category: TemplateCategory
  accentColor: string
  fontScale: number
  watermarkText: string
  confidentialityLabel: string
  titleLabel: string
  layers: TemplateLayers
  layout: TemplateLayout
  requiredFields: (keyof IncidentMetadata)[]
  isCustom?: boolean
}

export interface IncidentDraft {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  archived: boolean
  exportStatus: ExportStatus
  metadata: IncidentMetadata
  templateId: string
  photos: StudioPhoto[]
  retainExifForArchive: boolean
  filenamePattern: string
  shortId: string
}

export interface AppSettings {
  theme: 'dark' | 'light'
  powerUser: boolean
  detectionConsent: boolean
}

export interface RecentEntry {
  value: string
  lastUsed: string
}
