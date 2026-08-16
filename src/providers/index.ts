/** Provider interfaces for optional future integrations. Local no-ops by default. */

export interface MapSearchResult {
  label: string
  lat?: number
  lon?: number
}

export interface MapProvider {
  id: string
  search(query: string): Promise<MapSearchResult[]>
}

export const localMapProvider: MapProvider = {
  id: 'local-noop',
  async search() {
    return []
  },
}

export type DetectionKind = 'face' | 'license_plate' | 'text'

export interface DetectionSuggestion {
  kind: DetectionKind
  /** Normalized rect on source image 0–1 */
  rect: { x: number; y: number; w: number; h: number }
  confidence: number
  label?: string
}

export interface DetectionProvider {
  id: string
  /** Must never send images remotely unless explicitly configured + consented */
  suggest(
    imageBitmap: ImageBitmap,
    consent: boolean,
  ): Promise<DetectionSuggestion[]>
}

export const localDetectionProvider: DetectionProvider = {
  id: 'local-noop',
  async suggest(_image, consent) {
    if (!consent) return []
    // No on-device model bundled — returns empty suggestions.
    return []
  },
}

export interface SyncOperation {
  id: string
  type: string
  payload: unknown
  createdAt: string
}

export interface SyncProvider {
  id: string
  enqueue(op: SyncOperation): Promise<void>
  flush(): Promise<{ ok: boolean; remaining: number }>
}

const syncQueue: SyncOperation[] = []

export const localSyncProvider: SyncProvider = {
  id: 'local-noop',
  async enqueue(op) {
    syncQueue.push(op)
  },
  async flush() {
    // No backend configured — keep queued for future
    return { ok: true, remaining: syncQueue.length }
  },
}

export interface ExportSink {
  id: string
  upload?(blob: Blob, filename: string): Promise<void>
}

export const localExportSink: ExportSink = {
  id: 'local-download',
}

export interface ProviderRegistry {
  map: MapProvider
  detection: DetectionProvider
  sync: SyncProvider
  exportSink: ExportSink
}

export const providers: ProviderRegistry = {
  map: localMapProvider,
  detection: localDetectionProvider,
  sync: localSyncProvider,
  exportSink: localExportSink,
}
