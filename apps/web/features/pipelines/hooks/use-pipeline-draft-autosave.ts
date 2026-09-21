import { useCallback, useEffect, useRef, useState } from 'react'

import type { ApiFetcher } from '@/service/source-client'

import {
  createPipelineDraft,
  updatePipelineDraft,
  type PipelineDraft,
  type PipelineDraftMutation,
} from '@/service/pipelines/pipeline-client'

const AUTOSAVE_DELAY_MS = 750

export interface PipelineDraftSaveResult {
  draft: PipelineDraft
  etag: string
}

interface PipelineDraftAutosaveOptions {
  enabled: boolean
  mutation: PipelineDraftMutation | null
  initialEtag: string | null
  fetcher: ApiFetcher
  onSaved?: (result: PipelineDraftSaveResult) => void
  onError?: (error: unknown) => void
}

/**
 * Debounces local graph persistence and serializes writes so every request uses the revision returned by
 * the prior request. The response advances only the local CAS baseline; it never overwrites a newer graph.
 */
export function usePipelineDraftAutosave({
  enabled,
  mutation,
  initialEtag,
  fetcher,
  onSaved,
  onError,
}: PipelineDraftAutosaveOptions) {
  const mutationRef = useRef(mutation)
  const etagRef = useRef(initialEtag)
  const generationRef = useRef(0)
  const savedGenerationRef = useRef(0)
  const hasLoadedMutationRef = useRef(false)
  const savingRef = useRef<Promise<PipelineDraftSaveResult | null> | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [lastResult, setLastResult] = useState<PipelineDraftSaveResult | null>(null)
  const [hasPendingChanges, setHasPendingChanges] = useState(Boolean(mutation))

  useEffect(() => {
    mutationRef.current = mutation
    if (!hasLoadedMutationRef.current) {
      hasLoadedMutationRef.current = true
      return
    }
    generationRef.current += 1
    setHasPendingChanges(Boolean(mutation))
  }, [mutation])

  useEffect(() => {
    etagRef.current = initialEtag
  }, [initialEtag])

  const saveLatest = useCallback(async (): Promise<PipelineDraftSaveResult | null> => {
    if (!enabled || !mutationRef.current) return null
    if (savingRef.current) return savingRef.current
    if (savedGenerationRef.current >= generationRef.current) {
      generationRef.current += 1
      setHasPendingChanges(true)
    }

    const save = (async () => {
      setIsSaving(true)
      let result: PipelineDraftSaveResult | null = null
      try {
        while (mutationRef.current && savedGenerationRef.current < generationRef.current) {
          const generation = generationRef.current
          const current = mutationRef.current
          const response = etagRef.current
            ? await updatePipelineDraft(current.pipelineId, current, etagRef.current, fetcher)
            : await createPipelineDraft(current.pipelineId, current, fetcher)
          result = response
          etagRef.current = response.etag
          savedGenerationRef.current = generation
          setLastResult(response)
          onSaved?.(response)
        }
        setHasPendingChanges(false)
        return result
      } catch (error) {
        onError?.(error)
        throw error
      } finally {
        setIsSaving(false)
        savingRef.current = null
      }
    })()
    savingRef.current = save
    return save
  }, [enabled, fetcher, onError, onSaved])

  useEffect(() => {
    if (!enabled || !mutation) return
    const timer = window.setTimeout(() => {
      void saveLatest().catch(() => undefined)
    }, AUTOSAVE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [enabled, mutation, saveLatest])

  return {
    isSaving,
    hasPendingChanges,
    lastResult,
    saveLatest,
  }
}
