import type { PipelineTransformDefinition, PipelineTransformSchema } from './schema-types'

import { FilterEditor } from './filter-editor'
import { JoinEditor } from './join-editor'
import { JsEditor } from './js-editor'
import { MapEditor } from './map-editor'
import { NestEditor } from './nest-editor'
import {
  filterTransformSchema,
  jsTransformSchema,
  joinTransformSchema,
  mapTransformSchema,
  nestTransformSchema,
  unionTransformSchema,
} from './schemas'
import { UnionEditor } from './union-editor'

const definitions = new Map<string, PipelineTransformDefinition>()

function registerBuiltIn(
  schema: PipelineTransformSchema,
  editor: PipelineTransformDefinition['editor'],
) {
  definitions.set(schema.type, { schema, editor })
}

registerBuiltIn(filterTransformSchema, FilterEditor)
registerBuiltIn(mapTransformSchema, MapEditor)
registerBuiltIn(joinTransformSchema, JoinEditor)
registerBuiltIn(unionTransformSchema, UnionEditor)
registerBuiltIn(nestTransformSchema, NestEditor)
registerBuiltIn(jsTransformSchema, JsEditor)

/** Registers a built-in or extension processor without changing the canvas/editor switch. */
export function registerPipelineTransform(definition: PipelineTransformDefinition) {
  if (!definition.schema.type.trim()) throw new Error('Pipeline transform type is required')
  definitions.set(definition.schema.type, definition)
  return () => definitions.delete(definition.schema.type)
}

export function getPipelineTransformDefinition(type: string) {
  return definitions.get(type)
}

export function listPipelineTransformDefinitions() {
  return [...definitions.values()]
}
