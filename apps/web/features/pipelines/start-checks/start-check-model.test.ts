import { describe, expect, it } from 'vitest'

import type { StartCheckReport } from '@/service/pipelines/pipeline-client'

import fixture from './__fixtures__/client-fixture-v1.json'
import {
  canStart,
  carryDecisions,
  changeLine,
  definitionRewritten,
  findingBehavior,
  groupFindings,
  openQuestions,
  startDecisions,
} from './start-check-model'

const answerable: StartCheckReport = fixture.answerable

describe('start-check model', () => {
  it('groups findings by what they ask and reads an unknown behavior as BLOCK', () => {
    const groups = groupFindings(answerable)
    expect(groups.confirm.map(({ key }) => key)).toEqual([
      'target-not-empty/views/lead',
      'derived-schema-drift/join_orders',
    ])
    expect(groups.warn.map(({ key }) => key)).toEqual(['source-retention/src_pg'])
    expect(groups.pass.map(({ key }) => key)).toEqual(['target-not-empty/warehouse/orders_archive'])
    expect(findingBehavior(fixture.unknownBehavior.findings[0]!)).toBe('BLOCK')
  })

  it('answers only the questions, and only with actions the question offers', () => {
    const choices = {
      'target-not-empty/views/lead': 'clear',
      'derived-schema-drift/join_orders': 'drop-everything',
      'source-retention/src_pg': 'keep',
    }
    expect(openQuestions(answerable, choices).map(({ key }) => key)).toEqual([
      'derived-schema-drift/join_orders',
    ])
    expect(canStart(answerable, choices)).toBe(false)
    expect(startDecisions(answerable, choices)).toEqual([
      { finding: 'target-not-empty/views/lead', action: 'clear' },
    ])
  })

  it('carries earlier answers into a new report and lists the ones no longer asked', () => {
    const reevaluated: StartCheckReport = {
      ...answerable,
      findings: answerable.findings.filter(({ key }) => key !== 'derived-schema-drift/join_orders'),
    }
    expect(
      carryDecisions(
        [
          { finding: 'target-not-empty/views/lead', action: 'keep' },
          { finding: 'derived-schema-drift/join_orders', action: 'accept' },
          { finding: 'source-retention/src_pg', action: 'keep' },
        ],
        reevaluated,
      ),
    ).toEqual({
      kept: [{ finding: 'target-not-empty/views/lead', action: 'keep' }],
      stale: [
        { finding: 'derived-schema-drift/join_orders', action: 'accept' },
        { finding: 'source-retention/src_pg', action: 'keep' },
      ],
    })
  })

  it('reads a definition change from the applied answers that rewrote it', () => {
    const change = { element: 'lead', field: 'on_full_load', from: 'append', to: 'clear' }
    expect(changeLine(change)).toBe('lead: on_full_load append → clear')
    expect(changeLine({ ...change, from: null })).toBe('lead: on_full_load → clear')
    expect(
      definitionRewritten([
        { finding: 'f', action: 'keep', kind: 'ACKNOWLEDGE', changes: [], contentHash: null },
      ]),
    ).toBe(false)
    expect(
      definitionRewritten([
        {
          finding: 'f',
          action: 'clear',
          kind: 'CHANGE_DEFINITION',
          changes: [change],
          contentHash: 'a'.repeat(64),
        },
      ]),
    ).toBe(true)
  })
})
