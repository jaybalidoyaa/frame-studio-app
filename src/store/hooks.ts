import { useMemo } from 'react'
import { useStudioStore } from '../store/studioStore'
import { BUILTIN_TEMPLATES, getTemplateById } from '../domain/templates'
import { validateMetadata } from '../domain/validation'
import type { FrameTemplate, StudioPhoto } from '../domain/types'

export function useTemplates(): FrameTemplate[] {
  const customTemplates = useStudioStore((s) => s.customTemplates)
  return useMemo(
    () => [...BUILTIN_TEMPLATES, ...customTemplates],
    [customTemplates],
  )
}

export function useActivePhoto(): StudioPhoto | null {
  const activePhotoId = useStudioStore((s) => s.activePhotoId)
  const photos = useStudioStore((s) => s.draft.photos)
  return useMemo(
    () => photos.find((p) => p.id === activePhotoId) ?? null,
    [photos, activePhotoId],
  )
}

export function useValidationIssues() {
  const metadata = useStudioStore((s) => s.draft.metadata)
  const templateId = useStudioStore((s) => s.draft.templateId)
  const photoCount = useStudioStore((s) => s.draft.photos.length)
  const customTemplates = useStudioStore((s) => s.customTemplates)
  return useMemo(() => {
    const template = getTemplateById(templateId, customTemplates)
    return validateMetadata(metadata, template, photoCount)
  }, [metadata, templateId, photoCount, customTemplates])
}

export function useReadyToExport(): boolean {
  const issues = useValidationIssues()
  const photos = useStudioStore((s) => s.draft.photos)
  return useMemo(() => {
    const needsReview = photos.some(
      (p) => p.privacy === 'needs_review' || p.status === 'error',
    )
    return issues.length === 0 && !needsReview && photos.length > 0
  }, [issues, photos])
}
