import { useCallback, useEffect, useRef, useState } from 'react'

import type { ApiFetcher } from '@/service/source-client'

import {
  createPipelineDraft,
  updatePipelineDraft,
  type PipelineDraft,
  type PipelineDraftMutation,
} from '@/service/pipelines/pipeline-client'

const AUTOSAVE_DELAY_MS = 5000

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
 * Persists the latest dirty graph after a quiet period and serializes CAS writes. The timer is driven by
 * graph changes, not renders, and a completed save never creates another save without a new change.
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
  const pendingRef = useRef(false)
  const savingRef = useRef<Promise<PipelineDraftSaveResult | null> | null>(null)
  const fetcherRef = useRef(fetcher)
  const onSavedRef = useRef(onSaved)
  const onErrorRef = useRef(onError)
  const [isSaving, setIsSaving] = useState(false)
  const [lastResult, setLastResult] = useState<PipelineDraftSaveResult | null>(null)
  const [hasPendingChanges, setHasPendingChanges] = useState(false)

  fetcherRef.current = fetcher
  onSavedRef.current = onSaved
  onErrorRef.current = onError

  useEffect(() => {
    if (mutation === mutationRef.current) return
    mutationRef.current = mutation
    generationRef.current += 1
    pendingRef.current = Boolean(mutation)
    setHasPendingChanges(Boolean(mutation))
  }, [mutation])

  useEffect(() => {
    etagRef.current = initialEtag
  }, [initialEtag])

  const saveLatest = useCallback(
    async (keepalive = false): Promise<PipelineDraftSaveResult | null> => {
      if (!enabled || !mutationRef.current || !pendingRef.current) return null
      if (savingRef.current) return savingRef.current

      const save = (async () => {
        setIsSaving(true)
        let result: PipelineDraftSaveResult | null = null
        try {
          while (mutationRef.current && pendingRef.current) {
            const generation = generationRef.current
            const current = mutationRef.current
            const response = etagRef.current
              ? await updatePipelineDraft(
                  current.pipelineId,
                  current,
                  etagRef.current,
                  fetcherRef.current,
                  { keepalive },
                )
              : await createPipelineDraft(current.pipelineId, current, fetcherRef.current, {
                  keepalive,
                })
            result = response
            etagRef.current = response.etag
            savedGenerationRef.current = generation
            setLastResult(response)
            onSavedRef.current?.(response)

            if (savedGenerationRef.current === generationRef.current) {
              pendingRef.current = false
              setHasPendingChanges(false)
            }
          }
          return result
        } catch (error) {
          onErrorRef.current?.(error)
          throw error
        } finally {
          setIsSaving(false)
          savingRef.current = null
        }
      })()
      savingRef.current = save
      return save
    },
    [enabled],
  )

  useEffect(() => {
    if (!enabled || !mutation) return
    const timer = window.setTimeout(() => {
      void saveLatest().catch(() => undefined)
    }, AUTOSAVE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [enabled, mutation, saveLatest])

  const flushOnPageClose = useCallback(() => {
    void saveLatest(true).catch(() => undefined)
  }, [saveLatest])

  const saveMutation = useCallback(
    (nextMutation: PipelineDraftMutation) => {
      mutationRef.current = nextMutation
      generationRef.current += 1
      pendingRef.current = true
      setHasPendingChanges(true)
      return saveLatest()
    },
    [saveLatest],
  )

  return {
    isSaving,
    hasPendingChanges,
    lastResult,
    saveLatest,
    saveMutation,
    flushOnPageClose,
  }
}
