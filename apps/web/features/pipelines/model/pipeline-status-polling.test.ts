import { describe, expect, it } from 'vitest'

import { PipelineClientError } from '@/service/pipelines/pipeline-client'

import { pipelineStatusRefetchInterval } from './pipeline-status-polling'

describe('pipelineStatusRefetchInterval', () => {
  it('polls a transient missing observation more frequently during startup', () => {
    expect(
      pipelineStatusRefetchInterval(
        new PipelineClientError('server', 'No observation yet', 404, 'monitor.no-observation'),
      ),
    ).toBe(1500)
  })

  it('stops polling when the pipeline itself is not found', () => {
    expect(
      pipelineStatusRefetchInterval(
        new PipelineClientError('server', 'Unknown pipeline', 404, 'lifecycle.unknown-pipeline'),
      ),
    ).toBe(false)
  })

  it('keeps the normal refresh cadence for other results', () => {
    expect(pipelineStatusRefetchInterval(null)).toBe(5000)
  })
})
