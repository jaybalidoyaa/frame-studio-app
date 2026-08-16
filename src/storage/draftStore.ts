import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type {
  AppSettings,
  FrameTemplate,
  IncidentDraft,
  RecentEntry,
} from '../domain/types'
import { defaultMetadata, DEFAULT_ADJUST } from '../domain/types'
import { DEFAULT_FILENAME_PATTERN } from '../domain/filename'

interface FrameStudioDB extends DBSchema {
  drafts: {
    key: string
    value: IncidentDraft
    indexes: { 'by-updated': string }
  }
  customTemplates: {
    key: string
    value: FrameTemplate
  }
  recents: {
    key: string
    value: { key: string; entries: RecentEntry[] }
  }
  settings: {
    key: string
    value: AppSettings & { id: string }
  }
}

const DB_NAME = 'frame-studio'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<FrameStudioDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<FrameStudioDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const drafts = db.createObjectStore('drafts', { keyPath: 'id' })
        drafts.createIndex('by-updated', 'updatedAt')
        db.createObjectStore('customTemplates', { keyPath: 'id' })
        db.createObjectStore('recents', { keyPath: 'key' })
        db.createObjectStore('settings', { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

export function createEmptyDraft(name = 'Untitled incident'): IncidentDraft {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
    archived: false,
    exportStatus: 'draft',
    metadata: defaultMetadata(),
    templateId: 'operational',
    photos: [],
    retainExifForArchive: false,
    filenamePattern: DEFAULT_FILENAME_PATTERN,
    shortId: shortId(),
  }
}

function shortId(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  const arr = crypto.getRandomValues(new Uint8Array(8))
  for (const n of arr) s += alphabet[n! % alphabet.length]
  return s
}

export async function listDrafts(): Promise<IncidentDraft[]> {
  const db = await getDb()
  const all = await db.getAll('drafts')
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getDraft(id: string): Promise<IncidentDraft | undefined> {
  const db = await getDb()
  return db.get('drafts', id)
}

export async function saveDraft(draft: IncidentDraft): Promise<void> {
  const db = await getDb()
  const toSave: IncidentDraft = {
    ...draft,
    updatedAt: new Date().toISOString(),
  }
  await db.put('drafts', toSave)
}

export async function deleteDraft(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('drafts', id)
}

export async function duplicateDraft(
  id: string,
): Promise<IncidentDraft | undefined> {
  const src = await getDraft(id)
  if (!src) return undefined
  const copy: IncidentDraft = {
    ...structuredClone(src),
    id: crypto.randomUUID(),
    name: `${src.name} (copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    exportStatus: 'draft',
    shortId: shortId(),
    photos: src.photos.map((p) => ({
      ...structuredClone(p),
      id: crypto.randomUUID(),
      adjust: { ...DEFAULT_ADJUST, ...p.adjust },
    })),
  }
  await saveDraft(copy)
  return copy
}

export async function clearSensitiveData(id: string): Promise<IncidentDraft | undefined> {
  const draft = await getDraft(id)
  if (!draft) return undefined
  const cleared: IncidentDraft = {
    ...draft,
    exportStatus: 'cleared',
    metadata: {
      ...draft.metadata,
      location: '',
      notes: '',
      tags: [],
    },
    photos: draft.photos.map((p) => {
      if (p.sourceUrl.startsWith('blob:')) URL.revokeObjectURL(p.sourceUrl)
      return {
        ...p,
        sourceUrl: '',
        blob: undefined,
        redactions: [],
        status: 'ok',
        warnings: [],
      }
    }),
  }
  await saveDraft(cleared)
  return cleared
}

export async function listCustomTemplates(): Promise<FrameTemplate[]> {
  const db = await getDb()
  return db.getAll('customTemplates')
}

export async function saveCustomTemplate(t: FrameTemplate): Promise<void> {
  const db = await getDb()
  await db.put('customTemplates', { ...t, isCustom: true })
}

export async function deleteCustomTemplate(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('customTemplates', id)
}

export async function pushRecent(
  key: 'callsigns' | 'locations',
  value: string,
): Promise<void> {
  const v = value.trim()
  if (!v) return
  const db = await getDb()
  const row = (await db.get('recents', key)) ?? { key, entries: [] }
  const entries = [
    { value: v, lastUsed: new Date().toISOString() },
    ...row.entries.filter((e) => e.value.toLowerCase() !== v.toLowerCase()),
  ].slice(0, 12)
  await db.put('recents', { key, entries })
}

export async function getRecents(
  key: 'callsigns' | 'locations',
): Promise<RecentEntry[]> {
  const db = await getDb()
  return (await db.get('recents', key))?.entries ?? []
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  powerUser: false,
  detectionConsent: false,
}

export async function loadSettings(): Promise<AppSettings> {
  const db = await getDb()
  const row = await db.get('settings', 'app')
  return row
    ? {
        theme: row.theme,
        powerUser: row.powerUser,
        detectionConsent: row.detectionConsent,
      }
    : DEFAULT_SETTINGS
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDb()
  await db.put('settings', { id: 'app', ...settings })
}
