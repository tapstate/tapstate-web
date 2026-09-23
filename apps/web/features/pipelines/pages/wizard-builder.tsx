import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ArrowDown,
  Braces,
  Check,
  Database,
  LoaderCircle,
  Plus,
  Table2,
  Trash2,
  WandSparkles,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type {
  PipelineJsonObject,
  PipelineDraft,
  PipelineDraftWrite,
} from '@/service/pipelines/pipeline-client'
import type { SourceSchemaTable } from '@/service/source-client'

import { ConnectorIcon } from '@/components/connector-icon'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getPipelineDraft,
  previewPipelineDraft,
  publishPipelineDraft,
  runPipeline,
  updatePipelineDraft,
  type PipelineDraftPreview,
} from '@/service/pipelines/pipeline-client'
import { getSourceSchema, listConnectors, listSources } from '@/service/source-client'
import { useAuthStore } from '@/stores/auth-store'

import type { PipelineTransformType } from '../components/node-library/pipeline-node-library-types'
import type { PipelineTransformConfigurationPatch } from '../components/transform/types'

import { PipelineSourceTablePicker } from '../components/node-config/pipeline-node-config-panel'
import { TransformEditor } from '../components/transform/transform-editor'
import {
  WizardRelationCard,
  type WizardPipelineEntity,
  type WizardRelationSource,
} from '../components/wizard-relation-card'
import {
  canCompileWizardRelations,
  wizardRelationChildren,
  wizardRelationDescendants,
  wizardRelationTransformsPreserveRequiredFields,
  wizardSourceRef,
  wizardRelationTransformReady,
  type WizardRelation,
  type WizardRelationShape,
  type WizardRelationTransform,
  type WizardRelationTransformType,
  type WizardRootTable,
} from '../model/pipeline-wizard-model'

const ATLAS_CONNECTOR_ID = 'mongodb-atlas'
const transformTypes: PipelineTransformType[] = ['filter', 'map']

interface WizardStep {
  id: string
  type: PipelineTransformType
  body: PipelineJsonObject
  from?: unknown
  options?: PipelineJsonObject | null
}

function createWizardStep(type: PipelineTransformType, id: string, from: string): WizardStep {
  if (type === 'js') return { id, type, from, body: { engine: 'javascript', script: '' } }
  if (type === 'filter') return { id, type, from, body: { expr: '' } }
  return { id, type, from, body: { fields: {} } }
}

function transformStepReady(step: WizardStep) {
  if (step.type === 'filter')
    return typeof step.body.expr === 'string' && step.body.expr.trim() !== ''
  if (step.type === 'map') {
    return wizardRelationTransformReady({ id: step.id, type: 'map', body: step.body })
  }
  return (
    step.type === 'js' && typeof step.body.script === 'string' && step.body.script.trim() !== ''
  )
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function transformFields(step: WizardStep): PipelineJsonObject {
  if (step.type === 'filter') return { expr: step.body.expr ?? '' }
  if (step.type === 'map') return objectValue(step.body.fields) ?? {}
  return { script: step.body.script ?? '' }
}

interface WizardInitialState {
  sourceId: string
  rootTable: string
  rootKey: string[]
  relations: WizardRelation[]
  steps: WizardStep[]
  destinationId: string
  destinationTable: string
}

function initialWizardState(draft: PipelineDraft): WizardInitialState {
  const wizard = objectValue(draft.wizard) ?? {}
  const root = objectValue(wizard.root) ?? {}
  const output = objectValue(wizard.output) ?? {}
  const outputConfig = objectValue(output.config) ?? {}
  const relations = Array.isArray(wizard.related) ? wizard.related : []
  const transforms = Array.isArray(wizard.transforms) ? wizard.transforms : []

  return {
    sourceId: stringValue(root.sourceId),
    rootTable: stringValue(root.table),
    rootKey: stringList(root.key),
    relations: relations.flatMap((value) => {
      const item = objectValue(value)
      const relation = objectValue(item?.relation)
      if (!item || !relation || typeof item.id !== 'string') return []
      const conditions = Array.isArray(relation.on) ? relation.on : []
      const preTransforms = Array.isArray(item.preTransforms) ? item.preTransforms : []
      const conditionRows = conditions.flatMap((conditionValue) => {
        const condition = objectValue(conditionValue)
        return condition
          ? [
              {
                id: crypto.randomUUID(),
                childField: stringValue(condition.childField),
                parentField: stringValue(condition.parentField),
              },
            ]
          : []
      })
      return [
        {
          id: item.id,
          sourceId: stringValue(item.sourceId),
          table: stringValue(item.table),
          parentId: stringValue(item.parentId) || 'root',
          shape:
            relation.shape === 'flat' || relation.shape === 'array' ? relation.shape : 'object',
          path: stringValue(relation.path),
          key:
            stringList(relation.key).length > 0
              ? stringList(relation.key)
              : stringList(relation.arrayKey),
          arrayKey:
            stringList(relation.arrayKey).length > 0
              ? stringList(relation.arrayKey)
              : stringList(relation.key),
          conditions:
            conditionRows.length > 0
              ? conditionRows
              : [{ id: crypto.randomUUID(), childField: '', parentField: '' }],
          transforms: preTransforms.flatMap<WizardRelationTransform>((transformValue) => {
            const transform = objectValue(transformValue)
            const fields = objectValue(transform?.fields)
            if (
              typeof transform?.id !== 'string' ||
              (transform.type !== 'filter' && transform.type !== 'map')
            ) {
              return []
            }
            return transform.type === 'filter'
              ? [
                  {
                    id: transform.id,
                    type: 'filter',
                    body: { expr: stringValue(fields?.expr) },
                  } satisfies WizardRelationTransform,
                ]
              : [
                  {
                    id: transform.id,
                    type: 'map',
                    body: { fields: fields ?? {} },
                  } satisfies WizardRelationTransform,
                ]
          }),
        } satisfies WizardRelation,
      ]
    }),
    steps: transforms.flatMap((value) => {
      const step = objectValue(value)
      const fields = objectValue(step?.fields) ?? {}
      if (typeof step?.id !== 'string' || (step.type !== 'filter' && step.type !== 'map')) return []
      return [
        {
          id: step.id,
          type: step.type,
          body: step.type === 'filter' ? { expr: stringValue(fields.expr) } : { fields },
        } satisfies WizardStep,
      ]
    }),
    destinationId: stringValue(outputConfig.sourceId),
    destinationTable: stringValue(outputConfig.table ?? outputConfig.destinationTable),
  }
}

export function WizardBuilder({ pipelineId, draft }: { pipelineId: string; draft: PipelineDraft }) {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const queryClient = useQueryClient()
  const [initial] = useState(() => initialWizardState(draft))
  const [sourceId, setSourceId] = useState(initial.sourceId)
  const [rootTable, setRootTable] = useState(initial.rootTable)
  const [rootKey, setRootKey] = useState<string[]>(initial.rootKey)
  const [relations, setRelations] = useState<WizardRelation[]>(initial.relations)
  const [steps, setSteps] = useState<WizardStep[]>(initial.steps)
  const [destinationSourceId, setDestinationSourceId] = useState(initial.destinationId)
  const [destinationTable, setDestinationTable] = useState(initial.destinationTable)
  const description = draft.description ?? ''
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState('')
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error'>('saved')
  const [preview, setPreview] = useState<PipelineDraftPreview | null>(null)
  const [previewError, setPreviewError] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const persistedDraftRef = useRef(draft)
  const lastSavedFingerprint = useRef<string | null>(null)
  const saveBaselineInitialized = useRef(false)
  const currentWriteRef = useRef<PipelineDraftWrite | null>(null)
  const pendingSaveRef = useRef<Promise<PipelineDraft> | null>(null)

  const sourcesQuery = useQuery({
    queryKey: ['wizard', 'sources'],
    queryFn: () => listSources(apiFetch),
  })
  const connectorsQuery = useQuery({
    queryKey: ['wizard', 'connectors'],
    queryFn: () => listConnectors(apiFetch),
  })
  const sources = sourcesQuery.data ?? []
  const source = sources.find((item) => item.id === sourceId)
  const schemaSourceIds = useMemo(
    () =>
      Array.from(
        new Set([sourceId, ...relations.map((relation) => relation.sourceId)].filter(Boolean)),
      ),
    [relations, sourceId],
  )
  const schemaQueries = useQueries({
    queries: schemaSourceIds.map((id) => ({
      queryKey: ['wizard', 'source-schema', id],
      queryFn: () => getSourceSchema(id, apiFetch),
      enabled: Boolean(sources.find((item) => item.id === id)),
      retry: false,
    })),
  })
  const schemasBySourceId = useMemo(
    () =>
      new Map<string, (typeof schemaQueries)[number]['data']>(
        schemaSourceIds.map((id, index) => [id, schemaQueries[index]?.data]),
      ),
    [schemaQueries, schemaSourceIds],
  )
  const sourceSchema = schemasBySourceId.get(sourceId)
  const rootSchemaQuery = schemaQueries[schemaSourceIds.indexOf(sourceId)]
  const connectorsById = useMemo(
    () => new Map((connectorsQuery.data ?? []).map((connector) => [connector.id, connector])),
    [connectorsQuery.data],
  )
  const sourceTableOptions = useMemo(() => {
    if (!source) return []
    if (source.tables === null) {
      return (sourceSchema?.tables ?? []).map((table) => ({ label: table.name, value: table.name }))
    }
    return (source.tables ?? [])
      .map((table) => table.name)
      .filter((table): table is string => Boolean(table))
      .map((table) => ({ label: table, value: table }))
  }, [source, sourceSchema?.tables])
  const sourceTableLoading = Boolean(
    source?.tables === null && schemaQueries[schemaSourceIds.indexOf(sourceId)]?.isPending,
  )
  const tableDetailsBySource = useMemo(() => {
    const details = new Map<string, Map<string, SourceSchemaTable>>()
    for (const [id, schema] of schemasBySourceId) {
      details.set(id, new Map((schema?.tables ?? []).map((table) => [table.name, table])))
    }
    return details
  }, [schemasBySourceId])
  const rootDetails = tableDetailsBySource.get(sourceId)?.get(rootTable)
  const rootFields = rootDetails?.fields ?? []
  const saveBaselineReady =
    !sourcesQuery.isPending &&
    !connectorsQuery.isPending &&
    !(Boolean(source && rootTable) && rootSchemaQuery?.isPending)

  const atlasDestination = useMemo(
    () => sources.find((item) => item.connector === ATLAS_CONNECTOR_ID) ?? null,
    [sources],
  )
  const mongodbDestination = useMemo(() => {
    const candidates = sources.filter((item) => item.connector === 'mongodb')
    return (
      candidates.find((item) => /(?:target|destination|sink|out)/i.test(item.id)) ??
      candidates[0] ??
      null
    )
  }, [sources])
  const destinationSource =
    sources.find((item) => item.id === destinationSourceId) ??
    atlasDestination ??
    mongodbDestination
  useEffect(() => {
    if (destinationSource && destinationSource.id !== destinationSourceId) {
      setDestinationSourceId(destinationSource.id)
    }
  }, [destinationSource, destinationSourceId])
  const destinationSchemaQuery = useQuery({
    queryKey: ['wizard', 'destination-schema', destinationSource?.id],
    queryFn: () => getSourceSchema(destinationSource!.id, apiFetch),
    enabled: Boolean(destinationSource && destinationSource.tables === null),
    retry: false,
  })
  const destinationTablesLoading = Boolean(
    destinationSource?.tables === null && destinationSchemaQuery.isPending,
  )
  const destinationTableOptions = useMemo(() => {
    if (!destinationSource) return []
    if (destinationSource.tables === null) {
      return (destinationSchemaQuery.data?.tables ?? []).map((table) => table.name)
    }
    return (destinationSource.tables ?? [])
      .map((table) => table.name)
      .filter((table): table is string => Boolean(table))
  }, [destinationSchemaQuery.data?.tables, destinationSource])
  const destinationConnector = destinationSource
    ? connectorsById.get(destinationSource.connector)
    : undefined

  const draftWrite = useMemo<PipelineDraftWrite>(
    () => ({
      pipelineId,
      schemaVersion: draft.schemaVersion,
      mode: 'wizard',
      name: draft.name ?? pipelineId,
      description: description.trim() || null,
      graph: null,
      wizard: {
        root: { id: 'root', sourceId, table: rootTable, key: rootKey, preTransforms: [] },
        related: relations.map((relation) => ({
          id: relation.id,
          parentId: relation.parentId,
          sourceId: relation.sourceId,
          table: relation.table,
          relation: {
            on: relation.conditions.map(({ childField, parentField }) => ({
              childField,
              parentField,
            })),
            shape: relation.shape,
            path: relation.shape === 'flat' ? null : relation.path,
            key: relation.key,
            arrayKey:
              relation.shape === 'array'
                ? relation.arrayKey.length > 0
                  ? relation.arrayKey
                  : relation.key
                : [],
          },
          preTransforms: relation.transforms.map((transform) => ({
            id: transform.id,
            type: transform.type,
            fields:
              transform.type === 'filter'
                ? { expr: transform.body.expr ?? '' }
                : (objectValue(transform.body.fields) ?? {}),
          })),
        })),
        transforms: steps.map((step) => ({
          id: step.id,
          type: step.type,
          fields: transformFields(step),
        })),
        output: {
          kind: 'atlas',
          config: {
            sourceId: destinationSource?.id ?? destinationSourceId,
            table: destinationTable.trim(),
            inputTable: rootTable,
            writeMode: 'upsert',
          },
        },
      },
    }),
    [
      description,
      destinationSource?.id,
      destinationSourceId,
      destinationTable,
      draft.name,
      draft.schemaVersion,
      pipelineId,
      relations,
      rootKey,
      rootTable,
      sourceId,
      steps,
    ],
  )
  const draftFingerprint = JSON.stringify(draftWrite)
  currentWriteRef.current = draftWrite

  const entities = useMemo<WizardPipelineEntity[]>(() => {
    const items: WizardPipelineEntity[] = []
    if (sourceId && rootTable) {
      items.push({
        id: 'root',
        sourceId,
        table: rootTable,
        label: `${rootTable} · ${sourceId}`,
        fields: rootDetails?.fields ?? [],
      })
    }
    for (const relation of relations) {
      if (!relation.sourceId || !relation.table) continue
      const detail = tableDetailsBySource.get(relation.sourceId)?.get(relation.table)
      items.push({
        id: relation.id,
        sourceId: relation.sourceId,
        table: relation.table,
        label: `${relation.table} · ${relation.sourceId}`,
        fields: detail?.fields ?? [],
      })
    }
    return items
  }, [relations, rootDetails?.fields, rootTable, sourceId, tableDetailsBySource])

  const wizardRoot: WizardRootTable = { id: 'root', sourceId, table: rootTable, key: rootKey }
  const relationReady = canCompileWizardRelations({ root: wizardRoot, relations })
  const ready = Boolean(
    pipelineId &&
    saveBaselineReady &&
    sourceId &&
    rootTable &&
    steps.every(transformStepReady) &&
    relations.every((relation) => relation.transforms.every(wizardRelationTransformReady)) &&
    relationReady &&
    destinationSource &&
    destinationTable.trim(),
  )
  const persistCurrentDraft = useCallback(async () => {
    while (true) {
      const write = currentWriteRef.current
      if (!write) throw new Error(t('wizard.errors.save'))
      const fingerprint = JSON.stringify(write)
      if (fingerprint === lastSavedFingerprint.current) return persistedDraftRef.current
      if (pendingSaveRef.current) {
        await pendingSaveRef.current
        continue
      }

      setIsSaving(true)
      setSaveState('saving')
      const pending = updatePipelineDraft(write, persistedDraftRef.current.revision, apiFetch)
      pendingSaveRef.current = pending
      try {
        const saved = await pending
        persistedDraftRef.current = saved
        lastSavedFingerprint.current = fingerprint
        queryClient.setQueryData(['pipelines', pipelineId, 'draft'], saved)
        setSaveState('saved')
      } catch (cause) {
        setSaveState('error')
        throw cause
      } finally {
        if (pendingSaveRef.current === pending) pendingSaveRef.current = null
        setIsSaving(false)
      }
    }
  }, [apiFetch, pipelineId, queryClient, t])

  useEffect(() => {
    if (!saveBaselineReady) return
    if (!saveBaselineInitialized.current) {
      const suggestedRootKey = rootDetails?.primaryKey
      if (rootKey.length === 0 && suggestedRootKey && suggestedRootKey.length > 0) {
        setRootKey(suggestedRootKey)
        return
      }
      saveBaselineInitialized.current = true
      lastSavedFingerprint.current = draftFingerprint
      return
    }
    if (draftFingerprint === lastSavedFingerprint.current) return
    const timer = window.setTimeout(() => {
      void persistCurrentDraft().catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : t('wizard.errors.save'))
      })
    }, 550)
    return () => window.clearTimeout(timer)
  }, [
    draftFingerprint,
    persistCurrentDraft,
    rootDetails?.primaryKey,
    rootKey,
    saveBaselineReady,
    t,
  ])

  useEffect(() => {
    if (!ready) {
      setPreview(null)
      setPreviewError('')
      setPreviewLoading(false)
      return
    }
    let cancelled = false
    const timer = window.setTimeout(() => {
      void (async () => {
        setPreviewLoading(true)
        setPreviewError('')
        try {
          const saved = await persistCurrentDraft()
          const result = await previewPipelineDraft(pipelineId, saved.revision, apiFetch)
          if (!cancelled && draftFingerprint === JSON.stringify(currentWriteRef.current)) {
            setPreview(result)
          }
        } catch (cause) {
          if (!cancelled) {
            setPreview(null)
            setPreviewError(cause instanceof Error ? cause.message : t('wizard.preview.failed'))
          }
        } finally {
          if (!cancelled) setPreviewLoading(false)
        }
      })()
    }, 700)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [apiFetch, draftFingerprint, persistCurrentDraft, pipelineId, ready, t])

  async function handleSave(startAfterPublish = false) {
    if (!ready || !destinationSource || isPublishing || isStarting) return
    setError('')
    setIsPublishing(true)
    if (startAfterPublish) setIsStarting(true)
    try {
      const saved = await persistCurrentDraft()
      await previewPipelineDraft(pipelineId, saved.revision, apiFetch)
      await publishPipelineDraft(pipelineId, saved.revision, saved.baseArtifactHash, apiFetch)
      const published = await getPipelineDraft(pipelineId, apiFetch)
      if (published) {
        persistedDraftRef.current = published
        queryClient.setQueryData(['pipelines', pipelineId, 'draft'], published)
      }
      await queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      if (startAfterPublish) {
        await runPipeline(pipelineId, apiFetch)
        await queryClient.invalidateQueries({ queryKey: ['pipelines', pipelineId, 'status'] })
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('wizard.errors.save'))
    } finally {
      setIsPublishing(false)
      setIsStarting(false)
    }
  }

  const isLoading = sourcesQuery.isPending || connectorsQuery.isPending
  const schemaTablesBySource = useMemo(() => {
    const result = new Map<string, readonly string[]>()
    for (const currentSource of sources) {
      const tableNames =
        currentSource.tables === null
          ? (schemasBySourceId.get(currentSource.id)?.tables ?? []).map((table) => table.name)
          : (currentSource.tables ?? [])
              .map((table) => table.name)
              .filter((table): table is string => Boolean(table))
      result.set(currentSource.id, tableNames)
    }
    return result
  }, [schemasBySourceId, sources])
  const wizardRelationSources = useMemo<WizardRelationSource[]>(
    () =>
      sources.map((item) => {
        const connector = connectorsById.get(item.connector)
        return {
          id: item.id,
          connector: item.connector,
          connectorName: connector?.name ?? item.connector,
          connectorIcon: connector?.icon ?? undefined,
          tables: schemaTablesBySource.get(item.id) ?? [],
          loadingTables:
            item.tables === null &&
            Boolean(schemaQueries[schemaSourceIds.indexOf(item.id)]?.isPending),
        }
      }),
    [connectorsById, schemaQueries, schemaSourceIds, schemaTablesBySource, sources],
  )

  function resetForSource(nextSourceId: string) {
    setSourceId(nextSourceId)
    setRootTable('')
    setRootKey([])
    setRelations([])
    setSteps([])
  }

  function setRootTableAndKey(table: string) {
    setRootTable(table)
    setRootKey(tableDetailsBySource.get(sourceId)?.get(table)?.primaryKey ?? [])
    setRelations([])
    setSteps([])
  }

  function addRelation(parentId: string, shape: WizardRelationShape) {
    const id = `relation_${crypto.randomUUID()}`
    setRelations((current) => [
      ...current,
      {
        id,
        sourceId,
        table: '',
        parentId,
        shape,
        path: '',
        key: [],
        arrayKey: [],
        conditions: [{ id: `condition_${crypto.randomUUID()}`, childField: '', parentField: '' }],
        transforms: [],
      },
    ])
  }

  function updateRelation(nextRelation: WizardRelation) {
    setRelations((current) =>
      current.map((relation) => (relation.id === nextRelation.id ? nextRelation : relation)),
    )
  }

  function changeRelationSource(relationId: string, nextSourceId: string) {
    setRelations((current) =>
      current.map((item) => {
        if (item.id === relationId) {
          return {
            ...item,
            sourceId: nextSourceId,
            table: '',
            path: '',
            key: [],
            arrayKey: [],
            conditions: item.conditions.map((condition) => ({
              ...condition,
              childField: '',
              parentField: '',
            })),
            transforms: [],
          }
        }
        if (item.parentId === relationId) {
          return {
            ...item,
            conditions: item.conditions.map((condition) => ({ ...condition, parentField: '' })),
          }
        }
        return item
      }),
    )
  }

  function changeRelationTable(relationId: string, table: string) {
    const relation = relations.find((item) => item.id === relationId)
    if (!relation) return
    const details = tableDetailsBySource.get(relation.sourceId)?.get(table)
    setRelations((current) =>
      current.map((item) => {
        if (item.id === relationId) {
          return {
            ...item,
            table,
            path:
              item.shape === 'flat'
                ? ''
                : !item.path || item.path === item.table
                  ? table
                  : item.path,
            key: details?.primaryKey ?? [],
            arrayKey: details?.primaryKey ?? [],
            conditions: item.conditions.map((condition) => ({
              ...condition,
              childField: '',
              parentField: '',
            })),
            transforms: [],
          }
        }
        if (item.parentId === relationId) {
          return {
            ...item,
            conditions: item.conditions.map((condition) => ({ ...condition, parentField: '' })),
          }
        }
        return item
      }),
    )
  }

  function changeRelationShape(relationId: string, shape: WizardRelationShape) {
    const relation = relations.find((item) => item.id === relationId)
    if (!relation) return
    updateRelation({
      ...relation,
      shape,
      path: shape === 'flat' ? '' : relation.path || relation.table,
      arrayKey:
        shape === 'array' && relation.arrayKey.length === 0 ? relation.key : relation.arrayKey,
    })
  }

  function addRelationTransform(relationId: string, type: WizardRelationTransformType) {
    const relation = relations.find((item) => item.id === relationId)
    if (!relation?.table) return
    const transform: WizardRelationTransform = {
      id: `${relationId}_${type}_${crypto.randomUUID()}`,
      type,
      body: type === 'filter' ? { expr: '' } : { fields: {} },
    }
    updateRelation({ ...relation, transforms: [...relation.transforms, transform] })
  }

  function updateRelationTransform(
    relationId: string,
    stepId: string,
    patch: PipelineTransformConfigurationPatch,
  ) {
    const relation = relations.find((item) => item.id === relationId)
    if (!relation) return
    updateRelation({
      ...relation,
      transforms: relation.transforms.map((transform) =>
        transform.id === stepId ? { ...transform, body: patch.body ?? transform.body } : transform,
      ),
    })
  }

  function removeRelation(relationId: string) {
    const relation = relations.find((item) => item.id === relationId)
    if (!relation) return
    setRelations((current) =>
      current
        .filter((item) => item.id !== relationId)
        .map((item) =>
          item.parentId === relationId
            ? {
                ...item,
                parentId: relation.parentId,
                conditions: item.conditions.map((condition) => ({ ...condition, parentField: '' })),
              }
            : item,
        ),
    )
  }

  function addTransform(type: PipelineTransformType) {
    if (!rootTable) return
    const from =
      steps.at(-1)?.id ?? (relations.length ? 'wizard_nest' : wizardSourceRef(sourceId, rootTable))
    const id = `${type}_${crypto.randomUUID()}`
    setSteps((current) => [...current, createWizardStep(type, id, from)])
  }

  function removeStep(index: number) {
    setSteps((current) => current.filter((_, currentIndex) => currentIndex !== index))
  }

  function updateStep(index: number, patch: PipelineTransformConfigurationPatch) {
    setSteps((current) =>
      current.map((step, currentIndex) =>
        currentIndex === index
          ? {
              ...step,
              body: patch.body ?? step.body,
              ...(patch.from !== undefined ? { from: patch.from } : {}),
              ...(patch.options !== undefined ? { options: patch.options } : {}),
            }
          : step,
      ),
    )
  }

  const [previewMode, setPreviewMode] = useState<'dsl' | 'rows'>('dsl')

  function renderRelationTree(parentId: string): ReactNode {
    return wizardRelationChildren(relations, parentId).map((relation) => {
      const childFields =
        tableDetailsBySource.get(relation.sourceId)?.get(relation.table)?.fields ?? []
      const excludedEntityIds = new Set([
        relation.id,
        ...wizardRelationDescendants(relations, relation.id),
      ])
      return (
        <div className="pipeline-wizard__relation-branch" key={relation.id}>
          <WizardRelationCard
            relation={relation}
            sources={wizardRelationSources}
            entities={entities}
            excludedEntityIds={excludedEntityIds}
            childFields={childFields}
            childSchemaLoading={Boolean(
              schemaQueries[schemaSourceIds.indexOf(relation.sourceId)]?.isPending,
            )}
            processingSafe={wizardRelationTransformsPreserveRequiredFields(relations, relation.id)}
            sourcesLoading={isLoading}
            onChange={updateRelation}
            onChangeShape={(shape) => changeRelationShape(relation.id, shape)}
            onChangeSource={(sourceId) => changeRelationSource(relation.id, sourceId)}
            onChangeTable={(table) => changeRelationTable(relation.id, table)}
            onAddTransform={(type) => addRelationTransform(relation.id, type)}
            onUpdateTransform={(stepId, patch) =>
              updateRelationTransform(relation.id, stepId, patch)
            }
            onRemoveTransform={(stepId) =>
              updateRelation({
                ...relation,
                transforms: relation.transforms.filter((transform) => transform.id !== stepId),
              })
            }
            onRemove={() => removeRelation(relation.id)}
          />
          <AddRelationControl onAdd={(shape) => addRelation(relation.id, shape)} />
          {renderRelationTree(relation.id)}
        </div>
      )
    })
  }

  return (
    <section className="pipeline-wizard" data-testid="wizard-builder">
      <div className="pipeline-wizard__workspace">
        <main
          className="pipeline-wizard__stack pr-2 pl-3"
          aria-label={t('wizard.flowLabel')}
          aria-busy={!saveBaselineReady}
          inert={!saveBaselineReady}
        >
          <WizardNodeCard tone="source">
            <div className="pipeline-wizard__node-heading">
              <span className="pipeline-wizard__node-icon pipeline-wizard__node-icon--source">
                <Database className="size-4" aria-hidden="true" />
              </span>
              <div className="pipeline-wizard__node-title">
                <h1>{rootTable || t('wizard.sourceTitle')}</h1>
                <p>{t('wizard.sourceHint')}</p>
              </div>
            </div>
            <div className="pipeline-wizard__fields">
              <label className="pipeline-wizard__field">
                <span>{t('wizard.sourceSelect')}</span>
                <Select value={sourceId} onValueChange={(value) => resetForSource(value ?? '')}>
                  <SelectTrigger
                    className="pipeline-wizard__select"
                    aria-label={t('wizard.sourceSelect')}
                  >
                    <SelectValue
                      placeholder={isLoading ? t('wizard.loading') : t('wizard.sourceSelect')}
                    />
                  </SelectTrigger>
                  <SelectContent className="pipeline-wizard__source-select-content">
                    {sources.map((item) => {
                      const connector = connectorsById.get(item.connector)
                      return (
                        <SelectItem key={item.id} value={item.id}>
                          <ConnectorIcon
                            connectorId={item.connector}
                            name={connector?.name ?? item.connector}
                            iconPath={connector?.icon}
                            size={20}
                          />
                          <span className="pipeline-wizard__source-option-label">{item.id}</span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </label>
              {source && (
                <div className="pipeline-wizard__field">
                  <span>{t('wizard.tableSelect')}</span>
                  <PipelineSourceTablePicker
                    key={source.id}
                    sourceId={source.id}
                    sources={sources}
                    options={sourceTableOptions}
                    loading={sourceTableLoading}
                    value={rootTable}
                    selectionMode="single"
                    allowPatterns={false}
                    onChange={(tables) => setRootTableAndKey(tables[0] ?? '')}
                  />
                </div>
              )}
            </div>
            {source && (
              <p className="pipeline-wizard__meta">
                <Check className="size-3.5" aria-hidden="true" />
                {connectorsById.get(source.connector)?.name ?? source.connector}
                <span aria-hidden="true">·</span>
                <code>
                  {rootTable ? wizardSourceRef(source.id, rootTable) : t('wizard.awaitingTable')}
                </code>
              </p>
            )}
            {rootTable && relations.length > 0 && (
              <div className="pipeline-wizard__identity">
                <span>{t('wizard.relations.documentKey')}</span>
                {rootKey.length > 0 ? (
                  <code>{rootKey.join(', ')}</code>
                ) : (
                  <label className="pipeline-wizard__identity-select">
                    <span className="sr-only">{t('wizard.relations.chooseDocumentKey')}</span>
                    <Select
                      value={rootKey[0] ?? ''}
                      onValueChange={(value) => setRootKey(value ? [value] : [])}
                    >
                      <SelectTrigger className="pipeline-wizard__select">
                        <SelectValue placeholder={t('wizard.relations.chooseDocumentKey')} />
                      </SelectTrigger>
                      <SelectContent>
                        {rootFields.map((field) => (
                          <SelectItem key={field.name} value={field.name}>
                            {field.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                )}
                {rootKey.length === 0 && rootFields.length === 0 && (
                  <span className="pipeline-wizard__field-hint">
                    {rootSchemaQuery?.isPending
                      ? t('wizard.relations.loadingSchema')
                      : t('wizard.relations.schemaRequired')}
                  </span>
                )}
              </div>
            )}
          </WizardNodeCard>

          {rootTable && (
            <>
              {relations.length > 0 || steps.length > 0 ? (
                <AddRelationControl onAdd={(shape) => addRelation('root', shape)} />
              ) : (
                <AddStepControl
                  canAdd
                  includeRelations
                  onAdd={addTransform}
                  onAddRelation={(shape) => addRelation('root', shape)}
                />
              )}
              {renderRelationTree('root')}
            </>
          )}

          {steps.map((step, index) => (
            <div key={step.id} className="pipeline-wizard__segment">
              <FlowConnector />
              <WizardNodeCard tone="transform">
                <div className="pipeline-wizard__node-heading">
                  <span className="pipeline-wizard__node-icon pipeline-wizard__node-icon--transform">
                    <WandSparkles className="size-4" aria-hidden="true" />
                  </span>
                  <div className="pipeline-wizard__node-title">
                    <h2>{t(`wizard.transforms.${step.type}`)}</h2>
                    <p>{t(`wizard.transformDescriptions.${step.type}`)}</p>
                  </div>
                  <span className="pipeline-wizard__step-kind">{step.type}</span>
                  <button
                    type="button"
                    className="pipeline-wizard__icon-button"
                    aria-label={t('wizard.removeStep')}
                    onClick={() => removeStep(index)}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
                <div className="pipeline-wizard__step-context">
                  <span>{t('wizard.input')}</span>
                  <code>
                    {String(
                      steps[index - 1]?.id ??
                        (relations.length ? 'wizard_nest' : wizardSourceRef(sourceId, rootTable)),
                    )}
                  </code>
                </div>
                <div className="pipeline-wizard__step-editor">
                  <TransformEditor
                    config={{
                      kind: 'transform',
                      nodeId: `wizard:${step.id}`,
                      stepId: step.id,
                      transformType: step.type,
                      from:
                        steps[index - 1]?.id ??
                        (relations.length ? 'wizard_nest' : wizardSourceRef(sourceId, rootTable)),
                      options: step.options ?? null,
                      body: step.body,
                    }}
                    onChange={(patch) => updateStep(index, patch)}
                  />
                </div>
                {!transformStepReady(step) && (
                  <p className="pipeline-wizard__step-warning">
                    {t('wizard.stepNeedsConfiguration')}
                  </p>
                )}
              </WizardNodeCard>
            </div>
          ))}

          {rootTable && (relations.length > 0 || steps.length > 0) && (
            <AddStepControl canAdd onAdd={addTransform} />
          )}

          <FlowConnector />
          <WizardNodeCard tone="output">
            <div className="pipeline-wizard__node-heading">
              <span className="pipeline-wizard__node-icon pipeline-wizard__node-icon--output">
                <Table2 className="size-4" aria-hidden="true" />
              </span>
              <div className="pipeline-wizard__node-title">
                <h2>{t('wizard.outputTitle')}</h2>
                <p>{t('wizard.outputHint')}</p>
              </div>
            </div>
            <div className="pipeline-wizard__atlas-row">
              <span className="pipeline-wizard__atlas-mark" aria-hidden="true">
                {destinationSource ? (
                  <ConnectorIcon
                    connectorId={destinationSource.connector}
                    name={destinationConnector?.name ?? destinationSource.connector}
                    iconPath={destinationConnector?.icon}
                    size={18}
                    className="rounded-md border-0 bg-transparent"
                  />
                ) : (
                  <Database className="size-4" />
                )}
              </span>
              <div>
                <strong>{destinationSource?.id ?? t('wizard.atlasNotConfigured')}</strong>
                <span>
                  {atlasDestination
                    ? (destinationConnector?.name ?? t('wizard.atlasHint'))
                    : destinationSource
                      ? t('wizard.mongodbFallbackHint', { source: destinationSource.id })
                      : t('wizard.atlasHint')}
                </span>
              </div>
              {!atlasDestination && destinationSource && (
                <span className="pipeline-wizard__atlas-badge">{t('wizard.previewTarget')}</span>
              )}
              {!destinationSource && (
                <Link to="/sources" className="pipeline-wizard__configure-link">
                  {t('wizard.configureAtlas')}
                </Link>
              )}
            </div>
            {destinationSource && (
              <label className="pipeline-wizard__field">
                <span>{t('wizard.destinationTableSelect')}</span>
                <input
                  className="pipeline-wizard__input"
                  list="pipeline-wizard-destination-tables"
                  value={destinationTable}
                  onChange={(event) => setDestinationTable(event.target.value)}
                  placeholder={
                    destinationTablesLoading
                      ? t('wizard.loadingTables')
                      : t('wizard.destinationTablePlaceholder')
                  }
                />
                {destinationTableOptions.length > 0 && (
                  <datalist id="pipeline-wizard-destination-tables">
                    {destinationTableOptions.map((table) => (
                      <option key={table} value={table} />
                    ))}
                  </datalist>
                )}
                {!atlasDestination && (
                  <small className="pipeline-wizard__field-hint">
                    {t('wizard.mongodbFallbackTableHint')}
                  </small>
                )}
              </label>
            )}
          </WizardNodeCard>

          <div className="pipeline-wizard__actions">
            {error && (
              <p className="pipeline-wizard__error" role="alert">
                {error}
              </p>
            )}
            <span className="pipeline-wizard__save-state" role="status">
              {saveState === 'saving'
                ? t('wizard.autosaving')
                : saveState === 'error'
                  ? t('wizard.autosaveError')
                  : t('wizard.autosaved')}
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={!ready || isSaving || isPublishing || isStarting}
              onClick={() => void handleSave(false)}
            >
              {isPublishing && (
                <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
              )}
              {isPublishing ? t('wizard.saving') : t('wizard.savePipeline')}
            </Button>
            <Button
              type="button"
              disabled={!ready || isSaving || isPublishing || isStarting}
              onClick={() => void handleSave(true)}
            >
              {isStarting && <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />}
              {isStarting ? t('wizard.starting') : t('wizard.startPipeline')}
            </Button>
          </div>
        </main>

        <aside className="pipeline-wizard__preview" aria-label={t('wizard.preview.title')}>
          <div className="pipeline-wizard__preview-header">
            <h2>{t('wizard.preview.title')}</h2>
            <div className="pipeline-wizard__preview-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={previewMode === 'dsl'}
                aria-label={t('wizard.preview.codeLabel')}
                data-active={previewMode === 'dsl'}
                onClick={() => setPreviewMode('dsl')}
              >
                <Braces className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={previewMode === 'rows'}
                aria-label={t('wizard.preview.grid')}
                data-active={previewMode === 'rows'}
                onClick={() => setPreviewMode('rows')}
              >
                <Table2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="pipeline-wizard__preview-body">
            {previewMode === 'dsl' ? (
              previewLoading ? (
                <div className="pipeline-wizard__empty-preview" role="status">
                  <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
                  <span>{t('wizard.preview.compiling')}</span>
                </div>
              ) : previewError ? (
                <div className="pipeline-wizard__preview-error" role="alert">
                  {previewError}
                </div>
              ) : preview ? (
                <pre className="pipeline-wizard__dsl" aria-label={t('wizard.preview.codeLabel')}>
                  {preview.dsl}
                </pre>
              ) : (
                <div className="pipeline-wizard__empty-preview">
                  <span className="pipeline-wizard__empty-icon" aria-hidden="true">
                    <Braces className="size-5" />
                  </span>
                  <strong>{t('wizard.preview.awaitingConfiguration')}</strong>
                  <span>{t('wizard.preview.awaitingConfigurationHint')}</span>
                </div>
              )
            ) : (
              <div className="pipeline-wizard__empty-preview">
                <span className="pipeline-wizard__empty-icon" aria-hidden="true">
                  <Table2 className="size-5" />
                </span>
                <strong>{t('wizard.preview.empty')}</strong>
                <span>{t('wizard.preview.emptyHint')}</span>
              </div>
            )}
          </div>
          <div className="pipeline-wizard__preview-footer">
            <span className="pipeline-wizard__preview-dot" aria-hidden="true" />
            <span>{t('wizard.preview.note')}</span>
          </div>
        </aside>
      </div>
    </section>
  )
}

function WizardNodeCard({
  tone,
  children,
}: {
  tone: 'source' | 'transform' | 'output'
  children: ReactNode
}) {
  return (
    <article
      className={`pipeline-wizard__node-card-wrapper pipeline-wizard__node-card-wrapper--${tone}`}
    >
      {children}
    </article>
  )
}

function FlowConnector() {
  return (
    <div className="pipeline-wizard__connector" aria-hidden="true">
      <span />
      <ArrowDown className="size-3.5" />
    </div>
  )
}

function AddRelationControl({ onAdd }: { onAdd: (shape: WizardRelationShape) => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <div className="pipeline-wizard__relation-add-control">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="pipeline-wizard__add-button"
              aria-label={t('wizard.relations.addRelatedTable')}
              title={t('wizard.relations.addRelatedTable')}
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          }
        />
        <DropdownMenuContent align="center" sideOffset={8} className="pipeline-wizard__step-menu">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t('wizard.relations.addRelatedTable')}</DropdownMenuLabel>
            {(['object', 'array'] as const).map((shape) => (
              <DropdownMenuItem
                key={shape}
                onClick={() => {
                  onAdd(shape)
                  setOpen(false)
                }}
              >
                <Database className="size-3.5" aria-hidden="true" />
                {t(`wizard.relations.addAs.${shape}`)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function AddStepControl({
  canAdd,
  includeRelations = false,
  onAdd,
  onAddRelation,
}: {
  canAdd: boolean
  includeRelations?: boolean
  onAdd: (type: PipelineTransformType) => void
  onAddRelation?: (shape: WizardRelationShape) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <div className="pipeline-wizard__add-control">
      <div className="pipeline-wizard__add-line" aria-hidden="true" />
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="pipeline-wizard__add-button"
              disabled={!canAdd}
              aria-label={t(includeRelations ? 'wizard.addPipelineStep' : 'wizard.chooseTransform')}
              title={t(includeRelations ? 'wizard.addPipelineStep' : 'wizard.chooseTransform')}
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          }
        />
        <DropdownMenuContent align="center" sideOffset={8} className="pipeline-wizard__step-menu">
          {includeRelations && onAddRelation && (
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t('wizard.relations.addRelatedTable')}</DropdownMenuLabel>
              {(['object', 'array'] as const).map((shape) => (
                <DropdownMenuItem
                  key={shape}
                  onClick={() => {
                    onAddRelation(shape)
                    setOpen(false)
                  }}
                >
                  <Database className="size-3.5" aria-hidden="true" />
                  {t(`wizard.relations.addAs.${shape}`)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          )}
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              {t(includeRelations ? 'wizard.addProcessor' : 'wizard.chooseTransform')}
            </DropdownMenuLabel>
            {transformTypes.map((type) => (
              <DropdownMenuItem
                key={type}
                disabled={!canAdd}
                onClick={() => {
                  onAdd(type)
                  setOpen(false)
                }}
              >
                <WandSparkles className="size-3.5" aria-hidden="true" />
                <span className="pipeline-wizard__step-menu-copy">
                  <strong>{t(`wizard.transforms.${type}`)}</strong>
                  <small>{t(`wizard.transformDescriptions.${type}`)}</small>
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
