import type { FrameTemplate, IncidentMetadata } from './types'
import { eventLabel } from './templates'

export interface FieldIssue {
  field: keyof IncidentMetadata | 'photos'
  message: string
}

export function validateMetadata(
  meta: IncidentMetadata,
  template: FrameTemplate,
  photoCount: number,
): FieldIssue[] {
  const issues: FieldIssue[] = []

  if (photoCount < 1) {
    issues.push({ field: 'photos', message: 'Add at least one photo' })
  }

  for (const field of template.requiredFields) {
    const value = meta[field]
    if (typeof value === 'string' && !value.trim()) {
      issues.push({
        field,
        message: `${labelFor(field)} is required for ${template.name}`,
      })
    }
    if (Array.isArray(value) && value.length === 0) {
      issues.push({
        field,
        message: `${labelFor(field)} is required for ${template.name}`,
      })
    }
  }

  if (meta.eventType === 'other' && !meta.eventTypeOther.trim()) {
    issues.push({
      field: 'eventTypeOther',
      message: 'Describe the custom event type',
    })
  }

  if (meta.dateTimeLocal) {
    const d = new Date(meta.dateTimeLocal)
    if (Number.isNaN(d.getTime())) {
      issues.push({ field: 'dateTimeLocal', message: 'Invalid date/time' })
    }
  }

  return issues
}

export function metadataSummary(meta: IncidentMetadata): string {
  const parts = [
    eventLabel(meta),
    meta.severity.toUpperCase(),
    meta.callsign || null,
    meta.dateTimeLocal
      ? new Date(meta.dateTimeLocal).toLocaleString()
      : null,
    meta.generalAreaOnly
      ? meta.location
        ? `${meta.location} (general area)`
        : 'General area only'
      : meta.location || null,
    meta.referenceNumber ? `Ref ${meta.referenceNumber}` : null,
    meta.shiftTeam || null,
  ].filter(Boolean)
  return parts.join(' · ')
}

function labelFor(field: keyof IncidentMetadata): string {
  const map: Record<string, string> = {
    eventType: 'Event type',
    eventTypeOther: 'Custom event type',
    severity: 'Severity',
    dateTimeLocal: 'Date and time',
    location: 'Location',
    generalAreaOnly: 'General area',
    callsign: 'Unit / callsign',
    referenceNumber: 'Reference number',
    shiftTeam: 'Shift / team',
    notes: 'Notes',
    tags: 'Tags',
  }
  return map[field] ?? field
}
