import { describe, expect, it } from 'vitest'

import type { PipelineDagEdge, PipelineDagNode } from '@/service/pipelines/pipeline-client'

import {
  canPipelineNodeAcceptInput,
  canPipelineNodeEmitOutput,
  isPipelineDagEdgeValid,
  pipelineNodeRule,
} from './pipeline-node-rules'

const node = (
  id: string,
  type: PipelineDagNode['type'],
  detail: string | null = null,
): PipelineDagNode => ({ id, type, detail, label: id, description: null })

const edge = (source: string, target: string, id = `${source}->${target}`): PipelineDagEdge => ({
  id,
  source,
  target,
  label: null,
})

describe('pipeline node rules', () => {
  it('keeps source and target ports directional', () => {
    expect(pipelineNodeRule(node('source', 'source'))).toEqual({ maxInputs: 0, maxOutputs: null })
    expect(pipelineNodeRule(node('target', 'target'))).toEqual({ maxInputs: 1, maxOutputs: 0 })
    expect(canPipelineNodeAcceptInput(node('source', 'source'), [])).toBe(false)
    expect(canPipelineNodeEmitOutput(node('target', 'target'), [])).toBe(false)
  })

  it('limits ordinary transforms to one input while allowing join-like fan-in', () => {
    const inputs = [edge('a', 'transform'), edge('b', 'transform')]
    expect(canPipelineNodeAcceptInput(node('transform', 'transform', 'filter'), inputs)).toBe(false)
    expect(canPipelineNodeAcceptInput(node('join', 'transform', 'join'), inputs)).toBe(true)
    expect(canPipelineNodeAcceptInput(node('union', 'transform', 'union'), inputs)).toBe(true)
    expect(canPipelineNodeAcceptInput(node('nest', 'transform', 'nest'), inputs)).toBe(true)
  })

  it('rejects duplicate edges, self-connections, cycles, and saturated ports', () => {
    const source = node('source', 'source')
    const transform = node('transform', 'transform', 'filter')
    const target = node('target', 'target')
    const sourceToTransform = edge(source.id, transform.id)
    const transformToTarget = edge(transform.id, target.id)

    expect(isPipelineDagEdgeValid(source, transform, [sourceToTransform])).toBe(false)
    expect(isPipelineDagEdgeValid(transform, transform, [])).toBe(false)
    expect(isPipelineDagEdgeValid(transform, source, [sourceToTransform])).toBe(false)
    expect(isPipelineDagEdgeValid(source, target, [sourceToTransform, transformToTarget])).toBe(
      false,
    )
    expect(
      isPipelineDagEdgeValid(source, transform, [sourceToTransform], {
        ignoreEdgeId: sourceToTransform.id,
      }),
    ).toBe(true)
  })
})
