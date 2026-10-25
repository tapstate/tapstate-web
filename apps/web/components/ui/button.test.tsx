import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'

import { Button } from '@/components/ui/button'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let root: Root | undefined
let container: HTMLDivElement | undefined

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
})

describe('shared Button compatibility export', () => {
  it('preserves canonical component sizes', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => {
      root?.render(
        <>
          <Button size="small">Small</Button>
          <Button size="medium">Medium</Button>
          <Button size="large">Large</Button>
        </>,
      )
    })

    const buttons = [...container.querySelectorAll('button')]
    expect(
      buttons.map((button) =>
        ['h-6', 'h-8', 'h-9'].find((size) => button.classList.contains(size)),
      ),
    ).toEqual(['h-6', 'h-8', 'h-9'])
  })
})
