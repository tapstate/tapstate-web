import {
  Braces,
  ChevronDown,
  Filter,
  FolderTree,
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  WandSparkles,
  X,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
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
  SelectItem,
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
  children,
  childrenCount,
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
  onAddRelatedTable,
}: {
  relation: WizardRelation
  children: ReactNode
  childrenCount: number
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
  onAddRelatedTable: (shape: WizardRelationShape) => void
}) {
  const { t } = useTranslation()
  const [transformMenuOpen, setTransformMenuOpen] = useState(false)
  const [tableSelectionOpen, setTableSelectionOpen] = useState(!relation.table)
  const [preprocessingOpen, setPreprocessingOpen] = useState(false)
  const [pathEditing, setPathEditing] = useState(false)
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
  const availableEntities = useMemo(
    () => entities.filter((entity) => !excludedEntityIds.has(entity.id)),
    [entities, excludedEntityIds],
  )

  function changeParentEntity(parentId: string) {
    if (parentId === relation.parentId) return
    onChange({
      ...relation,
      parentId,
      conditions: relation.conditions.map((condition) => ({ ...condition, parentField: '' })),
    })
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
        <div className="pipeline-wizard__relation-heading">
          <div className="pipeline-wizard__relation-heading-main">
            <div
              className="pipeline-wizard__relation-shapes"
              role="group"
              aria-label={t('wizard.relations.shape')}
            >
              {(['object', 'array', 'flat'] as const).map((shape) => {
                const ShapeIcon =
                  shape === 'object' ? Braces : shape === 'array' ? FolderTree : Layers
                return (
                  <button
                    key={shape}
                    type="button"
                    aria-pressed={relation.shape === shape}
                    data-active={relation.shape === shape}
                    onClick={() => onChangeShape(shape)}
                  >
                    <ShapeIcon className="size-3.5" aria-hidden="true" />
                    {t(`wizard.relations.shapes.${shape}`)}
                  </button>
                )
              })}
            </div>
            <div className="pipeline-wizard__relation-title-row">
              <strong>{relation.table || t('wizard.relations.newTable')}</strong>
              {relation.table && (
                <button
                  type="button"
                  className="pipeline-wizard__relation-edit-table"
                  onClick={() => setTableSelectionOpen(true)}
                >
                  {t('wizard.relations.editTable')}
                </button>
              )}
              {relation.table &&
                relation.shape !== 'flat' &&
                (pathEditing ? (
                  <label className="pipeline-wizard__relation-path-edit">
                    <span>{t('wizard.relations.outputField')}</span>
                    <input
                      autoFocus
                      className="pipeline-wizard__input"
                      value={relation.path}
                      onChange={(event) => onChange({ ...relation, path: event.target.value })}
                      onBlur={() => setPathEditing(false)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === 'Escape') setPathEditing(false)
                      }}
                      aria-label={t('wizard.relations.outputField')}
                    />
                  </label>
                ) : (
                  <button
                    type="button"
                    className="pipeline-wizard__relation-alias"
                    onClick={() => setPathEditing(true)}
                    aria-label={t('wizard.relations.editOutputField')}
                  >
                    <span>{t('wizard.relations.as')}</span>
                    <code>{relation.path || t('wizard.relations.outputFieldPlaceholder')}</code>
                    <Pencil className="size-3" aria-hidden="true" />
                  </button>
                ))}
            </div>
          </div>
          {relation.table && (
            <button
              type="button"
              className="pipeline-wizard__relation-source-summary"
              onClick={() => setTableSelectionOpen((open) => !open)}
            >
              {selectedSource && (
                <ConnectorIcon
                  connectorId={selectedSource.connector}
                  name={selectedSource.connectorName}
                  iconPath={selectedSource.connectorIcon}
                  size={18}
                />
              )}
              <span>{t('wizard.relations.source')}:</span>
              <strong>{selectedSource?.id ?? relation.sourceId}</strong>
              <ChevronDown className="size-3" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="pipeline-wizard__relation-actions">
          {relation.table && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTableSelectionOpen((open) => !open)}
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              {tableSelectionOpen
                ? t('wizard.relations.closeTablePicker')
                : t('wizard.switchTable')}
            </Button>
          )}
          <button
            type="button"
            className="pipeline-wizard__preprocess-action"
            aria-expanded={preprocessingOpen}
            disabled={!relation.table}
            onClick={() => setPreprocessingOpen((open) => !open)}
          >
            {t('wizard.relations.preprocess')}
            {relation.transforms.length > 0 && <span>{relation.transforms.length}</span>}
          </button>
          <button
            type="button"
            className="pipeline-wizard__icon-button"
            aria-label={t('wizard.relations.remove')}
            onClick={onRemove}
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </header>

      {(!relation.table || tableSelectionOpen) && (
        <div className="pipeline-wizard__relation-fields">
          <label className="pipeline-wizard__field">
            <span>{t('wizard.relations.source')}</span>
            <Select
              value={relation.sourceId}
              onValueChange={(sourceId) => {
                onChangeSource(sourceId ?? '')
                setTableSelectionOpen(true)
              }}
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
              onValueChange={(table) => {
                onChangeTable(table ?? '')
                if (table) setTableSelectionOpen(false)
              }}
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
      )}

      {relation.shape === 'flat' && (
        <p className="pipeline-wizard__flat-hint">{t('wizard.relations.flatHint')}</p>
      )}

      {relation.table && (tableSelectionOpen || relation.key.length === 0) && (
        <div className="pipeline-wizard__identity">
          <span>{t('wizard.relations.rowKey')}</span>
          <label className="pipeline-wizard__identity-select">
            <span className="sr-only">{t('wizard.relations.chooseRowKey')}</span>
            <Select
              value={relation.key[0] ?? ''}
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
        </div>
      )}

      {relation.table && (
        <section
          className="pipeline-wizard__relation-conditions"
          aria-label={t('wizard.relations.conditions')}
        >
          <div className="sr-only">
            <div>
              <strong>{t('wizard.relations.conditions')}</strong>
              <span>{t('wizard.relations.conditionsHint')}</span>
            </div>
          </div>

          {relation.conditions.map((condition) => {
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
                    <SelectValue placeholder={t('wizard.relations.chooseChildField')}>
                      {(value: string | null) =>
                        value ? (
                          <>
                            <span className="pipeline-wizard__field-prefix">
                              {relation.table.split('.').at(-1)}.
                            </span>
                            {value}
                          </>
                        ) : (
                          t('wizard.relations.chooseChildField')
                        )
                      }
                    </SelectValue>
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
                <div className="pipeline-wizard__relation-parent-fields">
                  <Select
                    value={relation.parentId}
                    onValueChange={(parentId) => parentId && changeParentEntity(parentId)}
                    disabled={!relation.table || availableEntities.length === 0}
                  >
                    <SelectTrigger
                      className="pipeline-wizard__select pipeline-wizard__parent-table-select"
                      aria-label={t('wizard.relations.parentTable')}
                    >
                      <SelectValue placeholder={t('wizard.relations.chooseTarget')}>
                        {(value: string | null) =>
                          value
                            ? `${
                                availableEntities
                                  .find((entity) => entity.id === value)
                                  ?.table.split('.')
                                  .at(-1) ?? value
                              }${value === 'root' ? ` (${t('wizard.relations.rootTable')})` : ''}`
                            : t('wizard.relations.chooseTarget')
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {availableEntities.map((entity) => (
                        <SelectItem key={entity.id} value={entity.id}>
                          {entity.label}
                          {entity.id === 'root' ? ` (${t('wizard.relations.rootTable')})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={condition.parentField}
                    onValueChange={(parentField) =>
                      updateCondition(condition.id, { parentField: parentField ?? '' })
                    }
                    disabled={!relation.table || !parentEntity || parentEntity.fields.length === 0}
                  >
                    <SelectTrigger
                      className="pipeline-wizard__select pipeline-wizard__parent-field-select"
                      aria-label={t('wizard.relations.parentField')}
                    >
                      <SelectValue placeholder={t('wizard.relations.chooseParentField')} />
                    </SelectTrigger>
                    <SelectContent>
                      {parentEntity?.fields.map((field) => (
                        <SelectItem key={field.name} value={field.name}>
                          {field.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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

          <button
            type="button"
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
          </button>
        </section>
      )}

      {preprocessingOpen && (
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
                        setPreprocessingOpen(true)
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
          {relation.transforms.length === 0 && (
            <p className="pipeline-wizard__preprocess-hint">
              {t('wizard.relations.noPreprocessing')}
            </p>
          )}
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
      )}

      {relation.table && (
        <section className="pipeline-wizard__nested-relations">
          <div className="pipeline-wizard__nested-heading">
            <div>
              <FolderTree className="size-4" aria-hidden="true" />
              <strong>{t('wizard.relations.nestedSubRelations')}</strong>
              <span>({childrenCount})</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="pipeline-wizard__nested-add"
              onClick={() => onAddRelatedTable('array')}
            >
              <Plus className="size-3.5" aria-hidden="true" />
              {t('wizard.relations.addSubRelation', {
                table: relation.table.split('.').at(-1) ?? relation.table,
              })}
            </Button>
          </div>
          {childrenCount > 0 ? (
            <div className="pipeline-wizard__nested-content">{children}</div>
          ) : null}
        </section>
      )}
    </article>
  )
}
