import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const pipelineEdgeSource = readFileSync(
  resolve(process.cwd(), 'features/pipelines/components/canvas/pipeline-edge.tsx'),
  'utf8',
)

describe('PipelineEdge insertion control', () => {
  it('keeps the insert action keyboard reachable while visually hidden', () => {
    expect(pipelineEdgeSource).toContain('data-edge-insert="true"')
    expect(pipelineEdgeSource).toContain('tabIndex={0}')
    expect(pipelineEdgeSource).toContain('focus-within:opacity-100')
    expect(pipelineEdgeSource).toContain('focus-visible:ring-2')
  })
})
