import type { IncidentMetadata } from './types'
import { eventLabel } from './templates'

export interface FilenameParts {
  date: string
  eventSlug: string
  callsign: string
  index: number
  ext: string
}

/** Sanitize a single filename segment */
export function slugify(input: string, fallback = 'item'): string {
  const s = input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return s || fallback
}

export function buildFilenameParts(
  meta: IncidentMetadata,
  index: number,
  ext: 'png' | 'jpg' | 'jpeg' = 'png',
): FilenameParts {
  const d = meta.dateTimeLocal ? new Date(meta.dateTimeLocal) : new Date()
  const date = Number.isNaN(d.getTime())
    ? new Date().toISOString().slice(0, 10)
    : d.toISOString().slice(0, 10)
  return {
    date,
    eventSlug: slugify(eventLabel(meta), 'incident'),
    callsign: slugify(meta.callsign || 'unit', 'unit').toUpperCase(),
    index,
    ext: ext === 'jpeg' ? 'jpg' : ext,
  }
}

/**
 * Default pattern tokens: {date} {event} {callsign} {index} {ext}
 * Example: 2026-08-16_traffic-incident_NOVA-17_001.png
 */
export function generateFilename(
  pattern: string,
  parts: FilenameParts,
): string {
  const indexStr = String(parts.index).padStart(3, '0')
  const raw = pattern
    .replaceAll('{date}', parts.date)
    .replaceAll('{event}', parts.eventSlug)
    .replaceAll('{callsign}', parts.callsign)
    .replaceAll('{index}', indexStr)
    .replaceAll('{ext}', parts.ext)

  const safe = raw
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 180)

  if (!safe.toLowerCase().endsWith(`.${parts.ext}`)) {
    return `${safe}.${parts.ext}`
  }
  return safe || `export_${indexStr}.${parts.ext}`
}

export const DEFAULT_FILENAME_PATTERN =
  '{date}_{event}_{callsign}_{index}.{ext}'
