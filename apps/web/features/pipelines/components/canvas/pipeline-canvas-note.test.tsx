import '@/i18n/index'
import type { NodeProps } from '@xyflow/react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'

import type { CanvasNode } from './pipeline-canvas-types'

import { PipelineCanvasNote } from './pipeline-canvas-note'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let root: Root | undefined
let container: HTMLDivElement | undefined

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
})

describe('PipelineCanvasNote', () => {
  it('keeps text selection out of React Flow pan and drag gestures', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    const props = {
      id: 'note-a',
      selected: false,
      data: {
        label: 'Note',
        detail: null,
        description: '',
        nodeType: 'note',
        connector: null,
        hasInput: false,
        hasOutput: false,
        showInput: false,
        showOutput: false,
        configuration: null,
        noteText: 'Select this text',
        noteReadOnly: false,
      },
    } as unknown as NodeProps<CanvasNode>

    await act(async () => root?.render(<PipelineCanvasNote {...props} />))

    const input = container.querySelector('textarea')
    expect(input?.classList.contains('nodrag')).toBe(true)
    expect(input?.classList.contains('nopan')).toBe(true)
  })
})
