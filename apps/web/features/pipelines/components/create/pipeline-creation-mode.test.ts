import { describe, expect, it } from 'vitest'

import {
  availablePipelineCreationModes,
  normalizePipelineCreationMode,
} from './pipeline-creation-mode'

describe('pipeline creation modes', () => {
  it('offers only the supported builders', () => {
    expect(availablePipelineCreationModes.map((mode) => mode.value)).toEqual(['wizard', 'dag'])
  })

  it.each(['sql', 'ai'] as const)(
    'normalizes the unavailable %s default to DAG Designer',
    (mode) => {
      expect(normalizePipelineCreationMode(mode)).toBe('dag')
    },
  )
})
