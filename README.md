# Frame Studio

Production-oriented, **local-first** incident documentation studio. Responders upload photos, attach operational metadata, apply branded templates, redact sensitive content, review, and export a consistent **940 × 788** package.

The live Brigada Onse Camera `/studio` workflow (upload → metadata → frame → export) is inspiration only. This app is **Frame Studio only**—no camera booth, gallery, accounts, or social features.

## Quick start

```bash
npm install
npm run dev
```

```bash
npm test
npm run build
```

## Architecture

```
src/
  domain/      # Types, templates, validation, filenames
  pipeline/    # EXIF, ingest, compose, export package
  storage/     # IndexedDB drafts, recents, settings, custom templates
  providers/   # Map / detection / sync / export sink interfaces (local no-ops)
  store/       # Zustand app state + autosave
  features/    # Photos, Details, Template, Edit, Review, Export panels
  ui/          # Shell, preview, toasts, export bar
```

**Editing stays on-device.** Drafts, source images (as data URLs/blobs), custom templates, and recent callsigns/locations are stored in IndexedDB (`frame-studio`). A `SyncProvider` queue exists for a future backend but does nothing until you register a real implementation.

### Canvas pipeline

1. Ingest + EXIF orientation correction  
2. High-quality compose at export size (pan/zoom/rotate/flip + reversible enhancements)  
3. Bake redactions permanently into the bitmap  
4. Draw template chrome (logo, title, metadata, watermark, confidentiality, optional QR)  
5. Export **exactly 940 × 788** PNG/JPEG (canvas-encoded → no EXIF on public path)

### Local privacy behavior

- Redactions (blur / pixelate / blackout / crop) are **baked into exports** and cannot be removed from the output file.  
- GPS/EXIF is stripped from JPEG public exports by default.  
- “Retain metadata for internal archive” is an explicit opt-in.  
- Detection suggestions use `DetectionProvider` and require **local consent**; the default provider never sends images remotely and returns no suggestions until a real on-device model is wired.  
- “Clear sensitive data” removes stored source images and sensitive metadata from the local draft after export.

### Templates

Built-in categories: Operational Report, Minimal, Fire, Medical, Traffic, Public Information, Internal/Confidential, plus **No frame**.

Templates are plain TypeScript/JSON-shaped objects (`FrameTemplate`) controlling layers, layout rects (0–1), accent color, font scale, watermark/confidentiality copy, and required metadata fields.

Power users can open **Power user** in the header, customize a template visually, and save it to IndexedDB.

### Adding providers

```ts
// src/providers/index.ts
import { providers } from './index'

// Example: swap map search
providers.map = {
  id: 'my-geocoder',
  async search(query) {
    // call your API
    return [{ label: query }]
  },
}

// Example: export sink (upload after local download)
providers.exportSink = {
  id: 's3',
  async upload(blob, filename) {
    // PUT to your storage
  },
}
```

Keep remote AI/OCR behind explicit configuration **and** UI consent. Do not send incident imagery by default.

## Keyboard & accessibility

- Workflow stepper and controls are keyboard reachable with visible focus rings.  
- Preview supports pointer pan and scroll zoom.  
- `prefers-reduced-motion` disables decorative motion.  
- Dark (default) and light themes use WCAG-oriented contrast tokens.

## Scripts

| Command        | Purpose              |
|----------------|----------------------|
| `npm run dev`  | Local Vite server    |
| `npm run build`| Typecheck + production build |
| `npm test`     | Vitest unit tests    |
| `npm run preview` | Preview production build |

## License

Private / operational use unless otherwise specified by the project owner.
