import '@/i18n/index'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ConnectorSummary, SourceView } from '@/service/source-client'

import type { PipelineNodeInsertionContext } from './pipeline-node-library-types'

import { PipelineNodeSelector } from './pipeline-node-selector'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let root: Root | undefined
let container: HTMLDivElement | undefined

const sources = [
  {
    id: 'mysql_feynman',
    connector: 'mysql',
    tables: [
      { name: 'Player', pattern: null },
      { name: null, pattern: 'player_*' },
    ],
  },
] as SourceView[]

const connectors = [
  { id: 'mysql', name: 'MySQL', icon: '/connectors/mysql.svg' },
] as ConnectorSummary[]

const insertion: PipelineNodeInsertionContext = {
  position: { x: 240, y: 120 },
  screenPosition: { x: 440, y: 180 },
  connectFrom: null,
}

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
})

async function renderSelector(
  props: Partial<React.ComponentProps<typeof PipelineNodeSelector>> = {},
) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const onChoose = vi.fn()
  const onOpenChange = vi.fn()

  await act(async () => {
    root?.render(
      <PipelineNodeSelector
        open
        insertion={insertion}
        sources={sources}
        connectors={connectors}
        sourceState="success"
        onChoose={onChoose}
        onOpenChange={onOpenChange}
        {...props}
      />,
    )
  })

  return { onChoose, onOpenChange }
}

describe('PipelineNodeSelector', () => {
  it('expands a Source and returns a catalog-backed Source choice', async () => {
    const { onChoose } = await renderSelector()

    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    await act(async () =>
      document.querySelector<HTMLElement>('[data-node-selector-source="mysql_feynman"]')?.click(),
    )
    await act(async () =>
      document
        .querySelector<HTMLElement>('[data-node-selector-table="mysql_feynman:Player"]')
        ?.click(),
    )

    expect(onChoose).toHaveBeenCalledWith({
      kind: 'source',
      sourceId: 'mysql_feynman',
      table: 'Player',
      connectorId: 'mysql',
    })
  })

  it('keeps transform choices available when loading Sources failed', async () => {
    const { onChoose } = await renderSelector({
      sources: undefined,
      connectors: undefined,
      sourceState: 'error',
    })

    expect(container?.textContent).toContain('Unable to load data sources')
    await act(async () =>
      document.querySelector<HTMLElement>('[data-node-choice="transform:filter"]')?.click(),
    )

    expect(onChoose).toHaveBeenCalledWith({ kind: 'transform', transformType: 'filter' })
  })

  it('keeps transform choices available while Sources are loading', async () => {
    const { onChoose } = await renderSelector({
      sources: undefined,
      connectors: undefined,
      sourceState: 'loading',
    })

    expect(container?.textContent).toContain('Loading data sources')
    await act(async () =>
      document.querySelector<HTMLElement>('[data-node-choice="transform:join"]')?.click(),
    )

    expect(onChoose).toHaveBeenCalledWith({ kind: 'transform', transformType: 'join' })
  })

  it('creates an unconfigured Target only from the explicit Target entry', async () => {
    const { onChoose } = await renderSelector()

    await act(async () =>
      document.querySelector<HTMLElement>('[data-node-choice="target"]')?.click(),
    )

    expect(onChoose).toHaveBeenCalledWith({ kind: 'target' })
  })

  it('closes on Escape and resets the search term on the next open', async () => {
    const { onOpenChange } = await renderSelector()
    const search = document.querySelector<HTMLInputElement>('[data-node-selector-search]')
    const value = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set

    await act(async () => {
      value?.call(search, 'player')
      search?.dispatchEvent(new Event('input', { bubbles: true }))
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(onOpenChange).toHaveBeenCalledWith(false)

    await act(async () =>
      root?.render(
        <PipelineNodeSelector
          open={false}
          insertion={insertion}
          sources={sources}
          connectors={connectors}
          sourceState="success"
          onChoose={vi.fn()}
          onOpenChange={vi.fn()}
        />,
      ),
    )
    await act(async () =>
      root?.render(
        <PipelineNodeSelector
          open
          insertion={insertion}
          sources={sources}
          connectors={connectors}
          sourceState="success"
          onChoose={vi.fn()}
          onOpenChange={vi.fn()}
        />,
      ),
    )

    expect(document.querySelector<HTMLInputElement>('[data-node-selector-search]')?.value).toBe('')
  })
})
