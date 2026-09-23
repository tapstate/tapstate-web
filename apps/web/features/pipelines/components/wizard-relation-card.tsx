import { Database, Filter, Plus, Trash2, WandSparkles, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { SourceSchemaField } from '@/service/source-client'

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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type {
  WizardRelation,
  WizardRelationCondition,
  WizardRelationShape,
  WizardRelationTransformType,
} from '../model/pipeline-wizard-model'
import type { PipelineTransformConfigurationPatch } from './transform/types'

import { wizardRelationTransformReady } from '../model/pipeline-wizard-model'
import { TransformEditor } from './transform/transform-editor'

export interface WizardPipelineEntity {
  id: string
  sourceId: string
  table: string
  label: string
  fields: readonly SourceSchemaField[]
}

export interface WizardRelationSource {
  id: string
  connector: string
  connectorName: string
  connectorIcon?: string
  tables: readonly string[]
  loadingTables: boolean
}

export function WizardRelationCard({
  relation,
  sources,
  entities,
  excludedEntityIds,
  childFields,
  childSchemaLoading,
  processingSafe,
  sourcesLoading,
  onChange,
  onChangeShape,
  onChangeSource,
  onChangeTable,
  onAddTransform,
  onUpdateTransform,
  onRemoveTransform,
  onRemove,
}: {
  relation: WizardRelation
  sources: readonly WizardRelationSource[]
  entities: readonly WizardPipelineEntity[]
  excludedEntityIds: ReadonlySet<string>
  childFields: readonly SourceSchemaField[]
  childSchemaLoading: boolean
  processingSafe: boolean
  sourcesLoading: boolean
  onChange: (next: WizardRelation) => void
  onChangeShape: (shape: WizardRelationShape) => void
  onChangeSource: (sourceId: string) => void
  onChangeTable: (table: string) => void
  onAddTransform: (type: WizardRelationTransformType) => void
  onUpdateTransform: (stepId: string, patch: PipelineTransformConfigurationPatch) => void
  onRemoveTransform: (stepId: string) => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const [transformMenuOpen, setTransformMenuOpen] = useState(false)
  const selectedSource = sources.find((source) => source.id === relation.sourceId)
  const parentEntity = entities.find((entity) => entity.id === relation.parentId)
  const associationFields = relation.conditions.map((condition) => condition.childField)
  const isRelationshipComplete = Boolean(
    (relation.shape === 'flat' || relation.path.trim()) &&
    relation.key.length > 0 &&
    relation.conditions.length > 0 &&
    relation.conditions.every((condition) => condition.childField && condition.parentField) &&
    new Set(associationFields).size === associationFields.length,
  )
  const availableFieldGroups = useMemo(() => {
    const groups: { entity: WizardPipelineEntity; fields: readonly SourceSchemaField[] }[] = []
    const items = new Map<string, { entity: WizardPipelineEntity; field: SourceSchemaField }>()
    for (const entity of entities) {
      if (excludedEntityIds.has(entity.id)) continue
      if (entity.fields.length === 0) continue
      groups.push({ entity, fields: entity.fields })
      for (const field of entity.fields) {
        items.set(`${entity.id}::${field.name}`, { entity, field })
      }
    }
    return { groups, items }
  }, [entities, excludedEntityIds])

  function fieldsForCondition(index: number) {
    const groups =
      index === 0
        ? availableFieldGroups.groups
        : availableFieldGroups.groups.filter(({ entity }) => entity.id === relation.parentId)
    const items = new Map<string, { entity: WizardPipelineEntity; field: SourceSchemaField }>()
    for (const { entity, fields } of groups) {
      for (const field of fields) items.set(`${entity.id}::${field.name}`, { entity, field })
    }
    return { groups, items }
  }

  function updateCondition(conditionId: string, patch: Partial<WizardRelationCondition>) {
    onChange({
      ...relation,
      conditions: relation.conditions.map((condition) =>
        condition.id === conditionId ? { ...condition, ...patch } : condition,
      ),
    })
  }

  return (
    <article className="pipeline-wizard__relation-card">
      <header className="pipeline-wizard__relation-header">
        <span className="pipeline-wizard__relation-icon" aria-hidden="true">
          <Database className="size-4" />
        </span>
        <div className="pipeline-wizard__relation-heading">
          <strong>{relation.table || t('wizard.relations.newTable')}</strong>
          <span>{t('wizard.relations.relationship')}</span>
        </div>
        <div
          className="pipeline-wizard__relation-shapes"
          role="group"
          aria-label={t('wizard.relations.shape')}
        >
          {(['flat', 'object', 'array'] as const).map((shape) => (
            <button
              key={shape}
              type="button"
              aria-pressed={relation.shape === shape}
              data-active={relation.shape === shape}
              onClick={() => onChangeShape(shape)}
            >
              {t(`wizard.relations.shapes.${shape}`)}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="pipeline-wizard__icon-button"
          aria-label={t('wizard.relations.remove')}
          onClick={onRemove}
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </button>
      </header>

      <div className="pipeline-wizard__relation-fields">
        <label className="pipeline-wizard__field">
          <span>{t('wizard.relations.source')}</span>
          <Select
            value={relation.sourceId}
            onValueChange={(sourceId) => onChangeSource(sourceId ?? '')}
            disabled={sourcesLoading}
          >
            <SelectTrigger
              className="pipeline-wizard__select"
              aria-label={t('wizard.relations.source')}
            >
              <SelectValue
                placeholder={
                  sourcesLoading ? t('wizard.loading') : t('wizard.relations.chooseSource')
                }
              />
            </SelectTrigger>
            <SelectContent>
              {sources.map((source) => (
                <SelectItem key={source.id} value={source.id}>
                  <ConnectorIcon
                    connectorId={source.connector}
                    name={source.connectorName}
                    iconPath={source.connectorIcon}
                    size={18}
                  />
                  <span>{source.id}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="pipeline-wizard__field">
          <span>{t('wizard.relations.table')}</span>
          <Select
            value={relation.table}
            onValueChange={(table) => onChangeTable(table ?? '')}
            disabled={!selectedSource || selectedSource.loadingTables}
          >
            <SelectTrigger
              className="pipeline-wizard__select"
              aria-label={t('wizard.relations.table')}
            >
              <SelectValue
                placeholder={
                  !selectedSource
                    ? t('wizard.relations.chooseSourceFirst')
                    : selectedSource.loadingTables
                      ? t('wizard.loadingTables')
                      : t('wizard.relations.chooseTable')
                }
              />
            </SelectTrigger>
            <SelectContent>
              {selectedSource?.tables.length ? (
                selectedSource.tables.map((table) => (
                  <SelectItem key={table} value={table}>
                    {table}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="__no_tables__" disabled>
                  {t('wizard.relations.noTables')}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </label>
      </div>

      {relation.shape === 'flat' ? (
        <p className="pipeline-wizard__flat-hint">{t('wizard.relations.flatHint')}</p>
      ) : (
        <label className="pipeline-wizard__field pipeline-wizard__relation-path">
          <span>{t('wizard.relations.outputField')}</span>
          <input
            className="pipeline-wizard__input"
            value={relation.path}
            onChange={(event) => onChange({ ...relation, path: event.target.value })}
            placeholder={t('wizard.relations.outputFieldPlaceholder')}
            disabled={!relation.table}
          />
        </label>
      )}

      {relation.table && (
        <div className="pipeline-wizard__identity">
          <span>{t('wizard.relations.rowKey')}</span>
          {relation.key.length > 0 ? (
            <code>{relation.key.join(', ')}</code>
          ) : (
            <label className="pipeline-wizard__identity-select">
              <span className="sr-only">{t('wizard.relations.chooseRowKey')}</span>
              <Select
                value=""
                onValueChange={(value) =>
                  onChange({
                    ...relation,
                    key: value ? [value] : [],
                    arrayKey: value ? [value] : [],
                  })
                }
                disabled={childFields.length === 0}
              >
                <SelectTrigger className="pipeline-wizard__select">
                  <SelectValue placeholder={t('wizard.relations.chooseRowKey')} />
                </SelectTrigger>
                <SelectContent>
                  {childFields.map((field) => (
                    <SelectItem key={field.name} value={field.name}>
                      {field.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          )}
        </div>
      )}

      <section
        className="pipeline-wizard__relation-conditions"
        aria-label={t('wizard.relations.conditions')}
      >
        <div className="pipeline-wizard__relation-section-heading">
          <div>
            <strong>{t('wizard.relations.conditions')}</strong>
            <span>{t('wizard.relations.conditionsHint')}</span>
          </div>
          <span className="pipeline-wizard__relation-parent rounded-full">
            {parentEntity?.label ?? t('wizard.relations.chooseTarget')}
          </span>
        </div>

        {relation.conditions.map((condition, index) => {
          const fieldOptions = fieldsForCondition(index)
          return (
            <div className="pipeline-wizard__relation-condition" key={condition.id}>
              <Select
                value={condition.childField}
                onValueChange={(childField) =>
                  updateCondition(condition.id, { childField: childField ?? '' })
                }
                disabled={!relation.table || childFields.length === 0}
              >
                <SelectTrigger
                  className="pipeline-wizard__select"
                  aria-label={t('wizard.relations.childField')}
                >
                  <SelectValue placeholder={t('wizard.relations.chooseChildField')} />
                </SelectTrigger>
                <SelectContent>
                  {childFields.map((field) => (
                    <SelectItem key={field.name} value={field.name}>
                      {field.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="pipeline-wizard__relation-equals" aria-hidden="true">
                =
              </span>
              <Select
                value={
                  condition.parentField ? `${relation.parentId}::${condition.parentField}` : ''
                }
                onValueChange={(value) => {
                  if (!value) {
                    updateCondition(condition.id, { parentField: '' })
                    return
                  }
                  const selection = fieldOptions.items.get(value)
                  if (!selection) return
                  onChange({
                    ...relation,
                    parentId: selection.entity.id,
                    conditions: relation.conditions.map((item) =>
                      item.id === condition.id
                        ? { ...item, parentField: selection.field.name }
                        : relation.parentId !== selection.entity.id
                          ? { ...item, parentField: '' }
                          : item,
                    ),
                  })
                }}
                disabled={!relation.table || fieldOptions.items.size === 0}
              >
                <SelectTrigger
                  className="pipeline-wizard__select"
                  aria-label={t('wizard.relations.parentField')}
                >
                  <SelectValue placeholder={t('wizard.relations.chooseParentField')} />
                </SelectTrigger>
                <SelectContent>
                  {fieldOptions.groups.map(({ entity, fields }) => (
                    <SelectGroup key={entity.id}>
                      <SelectLabel>{entity.label}</SelectLabel>
                      {fields.map((field) => (
                        <SelectItem key={field.name} value={`${entity.id}::${field.name}`}>
                          {field.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              {relation.conditions.length > 1 && (
                <button
                  type="button"
                  className="pipeline-wizard__icon-button"
                  aria-label={t('wizard.relations.removeCondition')}
                  onClick={() =>
                    onChange({
                      ...relation,
                      conditions: relation.conditions.filter((item) => item.id !== condition.id),
                    })
                  }
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              )}
              {relation.conditions.length === 1 && <span aria-hidden="true" />}
            </div>
          )
        })}

        {relation.table && childFields.length === 0 && (
          <p className="pipeline-wizard__field-hint">
            {childSchemaLoading
              ? t('wizard.relations.loadingSchema')
              : t('wizard.relations.schemaUnavailable')}
          </p>
        )}
        {relation.table && parentEntity && parentEntity.fields.length === 0 && (
          <p className="pipeline-wizard__field-hint">
            {t('wizard.relations.parentSchemaUnavailable')}
          </p>
        )}
        {relation.table && childFields.length > 0 && !isRelationshipComplete && (
          <p className="pipeline-wizard__field-hint">
            {t('wizard.relations.completeRelationship')}
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="pipeline-wizard__add-condition"
          disabled={!relation.table || !parentEntity}
          onClick={() =>
            onChange({
              ...relation,
              conditions: [
                ...relation.conditions,
                { id: crypto.randomUUID(), childField: '', parentField: '' },
              ],
            })
          }
        >
          <Plus className="size-3.5" aria-hidden="true" />
          {t('wizard.relations.addCondition')}
        </Button>
      </section>

      <section className="pipeline-wizard__relation-processing">
        <div className="pipeline-wizard__relation-section-heading">
          <div>
            <strong>{t('wizard.relations.preprocessing')}</strong>
            <span>{t('wizard.relations.preprocessingHint')}</span>
          </div>
          <DropdownMenu open={transformMenuOpen} onOpenChange={setTransformMenuOpen}>
            <DropdownMenuTrigger
              render={
                <Button type="button" variant="outline" size="sm" disabled={!relation.table}>
                  <Plus className="size-3.5" aria-hidden="true" />
                  {t('wizard.relations.addTransform')}
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="pipeline-wizard__step-menu">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t('wizard.relations.preprocessing')}</DropdownMenuLabel>
                {(['filter', 'map'] as const).map((type) => (
                  <DropdownMenuItem
                    key={type}
                    onClick={() => {
                      onAddTransform(type)
                      setTransformMenuOpen(false)
                    }}
                  >
                    {type === 'filter' ? (
                      <Filter className="size-3.5" aria-hidden="true" />
                    ) : (
                      <WandSparkles className="size-3.5" aria-hidden="true" />
                    )}
                    {t(`wizard.transforms.${type}`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {relation.transforms.map((step, index) => (
          <div className="pipeline-wizard__relation-transform" key={step.id}>
            <div className="pipeline-wizard__relation-transform-title">
              <span>
                {step.type === 'filter' ? (
                  <Filter className="size-3.5" aria-hidden="true" />
                ) : (
                  <WandSparkles className="size-3.5" aria-hidden="true" />
                )}
                {t(`wizard.transforms.${step.type}`)}
              </span>
              <button
                type="button"
                className="pipeline-wizard__icon-button"
                aria-label={t('wizard.removeStep')}
                onClick={() => onRemoveTransform(step.id)}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            </div>
            <div className="pipeline-wizard__relation-transform-editor">
              <TransformEditor
                config={{
                  kind: 'transform',
                  nodeId: `wizard:${relation.id}:${step.id}`,
                  stepId: step.id,
                  transformType: step.type,
                  from:
                    index === 0
                      ? `${relation.sourceId}.${relation.table}`
                      : relation.transforms[index - 1]?.id,
                  options: null,
                  body: step.body,
                }}
                onChange={(patch) => onUpdateTransform(step.id, patch)}
              />
            </div>
          </div>
        ))}
        {!processingSafe && relation.transforms.some((step) => step.type === 'map') && (
          <p className="pipeline-wizard__field-hint" role="alert">
            {t('wizard.relations.requiredFieldsHint')}
          </p>
        )}
        {relation.transforms.some((step) => !wizardRelationTransformReady(step)) && (
          <p className="pipeline-wizard__field-hint" role="alert">
            {t('wizard.stepNeedsConfiguration')}
          </p>
        )}
      </section>
    </article>
  )
}
