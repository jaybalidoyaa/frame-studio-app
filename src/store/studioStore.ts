import { create } from 'zustand'
import type {
  AppSettings,
  FrameTemplate,
  IncidentDraft,
  IncidentMetadata,
  PhotoAdjust,
  PrivacyClass,
  RedactionMark,
  StudioPhoto,
  WorkflowStep,
} from '../domain/types'
import { DEFAULT_ADJUST } from '../domain/types'
import { BUILTIN_TEMPLATES, getTemplateById } from '../domain/templates'
import { validateMetadata } from '../domain/validation'
import {
  clearSensitiveData,
  createEmptyDraft,
  deleteDraft,
  duplicateDraft,
  getRecents,
  listCustomTemplates,
  listDrafts,
  loadSettings,
  pushRecent,
  saveCustomTemplate,
  saveDraft,
  saveSettings,
} from '../storage/draftStore'
import { ingestImageFile } from '../pipeline/ingest'
import { providers } from '../providers'

interface Toast {
  id: string
  message: string
  tone?: 'info' | 'success' | 'warn' | 'error'
}

interface StudioState {
  ready: boolean
  draft: IncidentDraft
  drafts: IncidentDraft[]
  customTemplates: FrameTemplate[]
  settings: AppSettings
  step: WorkflowStep
  activePhotoId: string | null
  selectedPhotoIds: string[]
  saveState: 'idle' | 'saving' | 'saved' | 'error'
  lastSavedAt: number | null
  toasts: Toast[]
  inspectorOpen: boolean
  recents: { callsigns: string[]; locations: string[] }
  exportProgress: { current: number; total: number; label: string } | null

  init: () => Promise<void>
  toast: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: string) => void
  setStep: (step: WorkflowStep) => void
  setTheme: (theme: 'dark' | 'light') => void
  setPowerUser: (v: boolean) => void
  setDetectionConsent: (v: boolean) => void
  setInspectorOpen: (v: boolean) => void

  newDraft: (name?: string) => Promise<void>
  loadDraft: (id: string) => Promise<void>
  renameDraft: (name: string) => void
  persist: () => Promise<void>
  refreshDraftList: () => Promise<void>
  duplicateCurrent: () => Promise<void>
  archiveCurrent: () => Promise<void>
  deleteCurrent: () => Promise<void>
  clearSensitive: () => Promise<void>

  updateMetadata: (patch: Partial<IncidentMetadata>) => void
  copyMetadataFromDraft: (id: string) => Promise<void>
  setTemplateId: (id: string) => void
  saveTemplateLocal: (t: FrameTemplate) => Promise<void>

  addFiles: (files: FileList | File[]) => Promise<void>
  removePhoto: (id: string) => void
  replacePhoto: (id: string, file: File) => Promise<void>
  duplicatePhoto: (id: string) => void
  reorderPhotos: (from: number, to: number) => void
  setCover: (id: string) => void
  setActivePhoto: (id: string | null) => void
  toggleSelectPhoto: (id: string) => void
  selectAllPhotos: () => void
  clearSelection: () => void
  updatePhotoAdjust: (id: string, patch: Partial<PhotoAdjust>) => void
  applyAdjustToAll: (adjust: PhotoAdjust) => void
  setPhotoPrivacy: (id: string, privacy: PrivacyClass) => void
  addRedaction: (id: string, mark: RedactionMark) => void
  clearRedactions: (id: string) => void
  batchSetPrivacy: (privacy: PrivacyClass) => void
  batchSetTemplateOverride: (templateId: string | undefined) => void
  setFilenamePattern: (pattern: string) => void
  setRetainExif: (v: boolean) => void
  setExportStatus: (status: IncidentDraft['exportStatus']) => void
  setExportProgress: (
    p: { current: number; total: number; label: string } | null,
  ) => void

  templates: () => FrameTemplate[]
  activePhoto: () => StudioPhoto | null
  validationIssues: () => ReturnType<typeof validateMetadata>
  isReadyToExport: () => boolean
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

function schedulePersist(get: () => StudioState, set: (p: Partial<StudioState>) => void) {
  set({ saveState: 'saving' })
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    void (async () => {
      try {
        await saveDraft(get().draft)
        void providers.sync.enqueue({
          id: crypto.randomUUID(),
          type: 'draft.upsert',
          payload: { id: get().draft.id },
          createdAt: new Date().toISOString(),
        })
        set({ saveState: 'saved', lastSavedAt: Date.now() })
        await get().refreshDraftList()
      } catch {
        set({ saveState: 'error' })
        get().toast('Autosave failed', 'error')
      }
    })()
  }, 400)
}

export const useStudioStore = create<StudioState>((set, get) => ({
  ready: false,
  draft: createEmptyDraft(),
  drafts: [],
  customTemplates: [],
  settings: { theme: 'dark', powerUser: false, detectionConsent: false },
  step: 'photos',
  activePhotoId: null,
  selectedPhotoIds: [],
  saveState: 'idle',
  lastSavedAt: null,
  toasts: [],
  inspectorOpen: true,
  recents: { callsigns: [], locations: [] },
  exportProgress: null,

  init: async () => {
    try {
      const [drafts, customTemplates, settings, callsigns, locations] =
        await Promise.all([
          listDrafts(),
          listCustomTemplates(),
          loadSettings(),
          getRecents('callsigns'),
          getRecents('locations'),
        ])
      document.documentElement.setAttribute('data-theme', settings.theme)
      let draft = drafts.find((d) => !d.archived) ?? createEmptyDraft()
      if (!drafts.length) {
        await saveDraft(draft)
      }
      set({
        ready: true,
        drafts,
        customTemplates,
        settings,
        draft,
        activePhotoId: draft.photos[0]?.id ?? null,
        recents: {
          callsigns: callsigns.map((c) => c.value),
          locations: locations.map((l) => l.value),
        },
      })
    } catch (err) {
      console.error('Frame Studio init failed', err)
      const draft = createEmptyDraft()
      set({
        ready: true,
        draft,
        drafts: [],
        customTemplates: [],
        activePhotoId: null,
        saveState: 'error',
      })
      get().toast(
        'Local storage unavailable — working in memory only',
        'warn',
      )
    }
  },

  toast: (message, tone = 'info') => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }))
    setTimeout(() => get().dismissToast(id), 3800)
  },
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  setStep: (step) => set({ step }),
  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme)
    const settings = { ...get().settings, theme }
    set({ settings })
    void saveSettings(settings)
  },
  setPowerUser: (powerUser) => {
    const settings = { ...get().settings, powerUser }
    set({ settings })
    void saveSettings(settings)
  },
  setDetectionConsent: (detectionConsent) => {
    const settings = { ...get().settings, detectionConsent }
    set({ settings })
    void saveSettings(settings)
  },
  setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),

  newDraft: async (name) => {
    const draft = createEmptyDraft(name)
    await saveDraft(draft)
    set({
      draft,
      activePhotoId: null,
      selectedPhotoIds: [],
      step: 'photos',
    })
    await get().refreshDraftList()
    get().toast('Incident draft created', 'success')
  },

  loadDraft: async (id) => {
    const drafts = await listDrafts()
    const draft = drafts.find((d) => d.id === id)
    if (!draft) {
      get().toast('Draft not found', 'error')
      return
    }
    set({
      draft,
      drafts,
      activePhotoId: draft.photos[0]?.id ?? null,
      selectedPhotoIds: [],
      step: 'photos',
    })
  },

  renameDraft: (name) => {
    set((s) => ({ draft: { ...s.draft, name } }))
    schedulePersist(get, set)
  },

  persist: async () => {
    await saveDraft(get().draft)
    set({ saveState: 'saved', lastSavedAt: Date.now() })
    await get().refreshDraftList()
  },

  refreshDraftList: async () => {
    set({ drafts: await listDrafts() })
  },

  duplicateCurrent: async () => {
    const copy = await duplicateDraft(get().draft.id)
    if (!copy) return
    set({ draft: copy, activePhotoId: copy.photos[0]?.id ?? null })
    await get().refreshDraftList()
    get().toast('Draft duplicated', 'success')
  },

  archiveCurrent: async () => {
    const draft = { ...get().draft, archived: true }
    set({ draft })
    await saveDraft(draft)
    await get().refreshDraftList()
    get().toast('Draft archived', 'info')
  },

  deleteCurrent: async () => {
    const id = get().draft.id
    await deleteDraft(id)
    const drafts = await listDrafts()
    const next = drafts.find((d) => !d.archived) ?? createEmptyDraft()
    if (!drafts.find((d) => d.id === next.id)) await saveDraft(next)
    set({
      draft: next,
      drafts: await listDrafts(),
      activePhotoId: next.photos[0]?.id ?? null,
    })
    get().toast('Draft deleted', 'warn')
  },

  clearSensitive: async () => {
    const cleared = await clearSensitiveData(get().draft.id)
    if (!cleared) return
    set({ draft: cleared, activePhotoId: cleared.photos[0]?.id ?? null })
    get().toast('Sensitive local data cleared', 'success')
  },

  updateMetadata: (patch) => {
    set((s) => ({
      draft: { ...s.draft, metadata: { ...s.draft.metadata, ...patch } },
    }))
    const meta = get().draft.metadata
    if (patch.callsign) void pushRecent('callsigns', patch.callsign)
    if (patch.location) void pushRecent('locations', patch.location)
    void getRecents('callsigns').then((c) =>
      getRecents('locations').then((l) =>
        set({
          recents: {
            callsigns: c.map((x) => x.value),
            locations: l.map((x) => x.value),
          },
        }),
      ),
    )
    void meta
    schedulePersist(get, set)
  },

  copyMetadataFromDraft: async (id) => {
    const drafts = await listDrafts()
    const src = drafts.find((d) => d.id === id)
    if (!src) return
    set((s) => ({
      draft: { ...s.draft, metadata: structuredClone(src.metadata) },
    }))
    schedulePersist(get, set)
    get().toast('Metadata copied', 'success')
  },

  setTemplateId: (templateId) => {
    set((s) => ({ draft: { ...s.draft, templateId } }))
    schedulePersist(get, set)
  },

  saveTemplateLocal: async (t) => {
    await saveCustomTemplate(t)
    set({ customTemplates: await listCustomTemplates() })
    get().toast('Custom template saved', 'success')
  },

  addFiles: async (files) => {
    const list = [...files]
    const added: StudioPhoto[] = []
    for (const file of list) {
      try {
        const photo = await ingestImageFile(file)
        added.push(photo)
      } catch (err) {
        get().toast(
          err instanceof Error ? err.message : `Failed: ${file.name}`,
          'error',
        )
      }
    }
    if (!added.length) return
    set((s) => {
      const photos = [...s.draft.photos, ...added]
      if (!photos.some((p) => p.isCover) && photos[0]) {
        photos[0] = { ...photos[0], isCover: true }
      }
      return {
        draft: { ...s.draft, photos },
        activePhotoId: added[0]?.id ?? s.activePhotoId,
      }
    })
    schedulePersist(get, set)
    get().toast(
      `Added ${added.length} photo${added.length === 1 ? '' : 's'}`,
      'success',
    )
  },

  removePhoto: (id) => {
    set((s) => {
      const photos = s.draft.photos.filter((p) => p.id !== id)
      if (photos.length && !photos.some((p) => p.isCover)) {
        photos[0] = { ...photos[0]!, isCover: true }
      }
      return {
        draft: { ...s.draft, photos },
        activePhotoId:
          s.activePhotoId === id ? (photos[0]?.id ?? null) : s.activePhotoId,
        selectedPhotoIds: s.selectedPhotoIds.filter((x) => x !== id),
      }
    })
    schedulePersist(get, set)
  },

  replacePhoto: async (id, file) => {
    try {
      const next = await ingestImageFile(file)
      set((s) => ({
        draft: {
          ...s.draft,
          photos: s.draft.photos.map((p) =>
            p.id === id
              ? {
                  ...next,
                  id: p.id,
                  isCover: p.isCover,
                  privacy: p.privacy,
                  adjust: p.adjust,
                  redactions: p.redactions,
                  modified: true,
                }
              : p,
          ),
        },
      }))
      schedulePersist(get, set)
      get().toast('Photo replaced', 'success')
    } catch (err) {
      get().toast(err instanceof Error ? err.message : 'Replace failed', 'error')
    }
  },

  duplicatePhoto: (id) => {
    set((s) => {
      const src = s.draft.photos.find((p) => p.id === id)
      if (!src) return s
      const copy: StudioPhoto = {
        ...structuredClone(src),
        id: crypto.randomUUID(),
        isCover: false,
        name: src.name.replace(/(\.[^.]+)?$/, '_copy$1'),
      }
      const idx = s.draft.photos.findIndex((p) => p.id === id)
      const photos = [...s.draft.photos]
      photos.splice(idx + 1, 0, copy)
      return { draft: { ...s.draft, photos }, activePhotoId: copy.id }
    })
    schedulePersist(get, set)
  },

  reorderPhotos: (from, to) => {
    set((s) => {
      const photos = [...s.draft.photos]
      const [item] = photos.splice(from, 1)
      if (!item) return s
      photos.splice(to, 0, item)
      return { draft: { ...s.draft, photos } }
    })
    schedulePersist(get, set)
  },

  setCover: (id) => {
    set((s) => ({
      draft: {
        ...s.draft,
        photos: s.draft.photos.map((p) => ({ ...p, isCover: p.id === id })),
      },
    }))
    schedulePersist(get, set)
  },

  setActivePhoto: (activePhotoId) => set({ activePhotoId }),
  toggleSelectPhoto: (id) =>
    set((s) => ({
      selectedPhotoIds: s.selectedPhotoIds.includes(id)
        ? s.selectedPhotoIds.filter((x) => x !== id)
        : [...s.selectedPhotoIds, id],
    })),
  selectAllPhotos: () =>
    set((s) => ({ selectedPhotoIds: s.draft.photos.map((p) => p.id) })),
  clearSelection: () => set({ selectedPhotoIds: [] }),

  updatePhotoAdjust: (id, patch) => {
    set((s) => ({
      draft: {
        ...s.draft,
        photos: s.draft.photos.map((p) =>
          p.id === id
            ? {
                ...p,
                adjust: { ...p.adjust, ...patch },
                modified: true,
              }
            : p,
        ),
      },
    }))
    schedulePersist(get, set)
  },

  applyAdjustToAll: (adjust) => {
    set((s) => ({
      draft: {
        ...s.draft,
        photos: s.draft.photos.map((p) => ({
          ...p,
          adjust: { ...adjust },
          modified: true,
        })),
      },
    }))
    schedulePersist(get, set)
    get().toast('Applied adjustments to all photos', 'success')
  },

  setPhotoPrivacy: (id, privacy) => {
    set((s) => ({
      draft: {
        ...s.draft,
        photos: s.draft.photos.map((p) =>
          p.id === id ? { ...p, privacy } : p,
        ),
      },
    }))
    schedulePersist(get, set)
  },

  addRedaction: (id, mark) => {
    set((s) => ({
      draft: {
        ...s.draft,
        photos: s.draft.photos.map((p) =>
          p.id === id
            ? {
                ...p,
                redactions: [...p.redactions, mark],
                modified: true,
              }
            : p,
        ),
      },
    }))
    schedulePersist(get, set)
  },

  clearRedactions: (id) => {
    set((s) => ({
      draft: {
        ...s.draft,
        photos: s.draft.photos.map((p) =>
          p.id === id ? { ...p, redactions: [], modified: true } : p,
        ),
      },
    }))
    schedulePersist(get, set)
  },

  batchSetPrivacy: (privacy) => {
    const ids = new Set(get().selectedPhotoIds)
    if (!ids.size) return
    set((s) => ({
      draft: {
        ...s.draft,
        photos: s.draft.photos.map((p) =>
          ids.has(p.id) ? { ...p, privacy } : p,
        ),
      },
    }))
    schedulePersist(get, set)
  },

  batchSetTemplateOverride: (templateId) => {
    const ids = new Set(get().selectedPhotoIds)
    if (!ids.size) return
    set((s) => ({
      draft: {
        ...s.draft,
        photos: s.draft.photos.map((p) =>
          ids.has(p.id)
            ? { ...p, templateIdOverride: templateId, modified: true }
            : p,
        ),
      },
    }))
    schedulePersist(get, set)
  },

  setFilenamePattern: (filenamePattern) => {
    set((s) => ({ draft: { ...s.draft, filenamePattern } }))
    schedulePersist(get, set)
  },

  setRetainExif: (retainExifForArchive) => {
    set((s) => ({ draft: { ...s.draft, retainExifForArchive } }))
    schedulePersist(get, set)
  },

  setExportStatus: (exportStatus) => {
    set((s) => ({ draft: { ...s.draft, exportStatus } }))
    schedulePersist(get, set)
  },

  setExportProgress: (exportProgress) => set({ exportProgress }),

  templates: () => [...BUILTIN_TEMPLATES, ...get().customTemplates],

  activePhoto: () => {
    const { draft, activePhotoId } = get()
    return draft.photos.find((p) => p.id === activePhotoId) ?? null
  },

  validationIssues: () => {
    const { draft } = get()
    const template = getTemplateById(draft.templateId, get().customTemplates)
    return validateMetadata(draft.metadata, template, draft.photos.length)
  },

  isReadyToExport: () => {
    const issues = get().validationIssues()
    const needsReview = get().draft.photos.some(
      (p) => p.privacy === 'needs_review' || p.status === 'error',
    )
    return issues.length === 0 && !needsReview && get().draft.photos.length > 0
  },
}))

export { DEFAULT_ADJUST }
