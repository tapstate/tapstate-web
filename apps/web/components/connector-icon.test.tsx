import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ConnectorIcon } from './connector-icon'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let root: Root | undefined
let host: HTMLDivElement | undefined

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root?.unmount())
  host?.remove()
  root = undefined
  host = undefined
})

describe('ConnectorIcon', () => {
  it('renders the direct registered connector image URL', async () => {
    await act(async () => {
      root?.render(<ConnectorIcon connectorId="mysql" name="MySQL" iconPath="icons/mysql.png" />)
    })

    const images = [...(host?.querySelectorAll('img') ?? [])]
    expect(images).toHaveLength(1)
    expect(images.map((image) => image.getAttribute('src'))).toEqual(['/connector-icons/mysql'])
    expect(images[0]?.className).toContain('connector-icon__image')

    const icon = host?.querySelector('.connector-icon')
    expect(icon?.classList.contains('relative')).toBe(true)
    expect(icon?.classList.contains('overflow-hidden')).toBe(true)
    expect(icon?.classList.contains('isolate')).toBe(true)
  })

  it('can render a blurred image backdrop behind the primary connector mark', async () => {
    await act(async () => {
      root?.render(
        <ConnectorIcon
          connectorId="mysql"
          name="MySQL"
          iconPath="icons/mysql.png"
          withBackdropLayer
        />,
      )
    })

    const images = [...(host?.querySelectorAll('img') ?? [])]
    expect(images).toHaveLength(2)
    expect(images[0]?.className).toContain('connector-icon__image--backdrop')
    expect(images[1]?.className).toContain('connector-icon__image--foreground')
    expect(images[0]?.className).toContain('connector-icon__image')
    expect(images[1]?.className).toContain('connector-icon__image')
  })

  it('shows a monogram fallback when the direct image cannot load', async () => {
    await act(async () => {
      root?.render(<ConnectorIcon connectorId="mysql" name="MySQL" iconPath="icons/mysql.png" />)
    })

    const image = host?.querySelector('img')
    expect(image).toBeDefined()
    await act(async () => image?.dispatchEvent(new Event('error')))

    expect(host?.querySelector('[data-fallback="M"]')).toBeDefined()
    expect(host?.querySelector('img')).toBeNull()
  })

  it('uses the monogram fallback immediately when no icon is declared', async () => {
    await act(async () => root?.render(<ConnectorIcon connectorId="mysql" name="MySQL" />))

    expect(host?.querySelector('[data-fallback="M"]')).toBeDefined()
    expect(host?.querySelector('img')).toBeNull()
  })
})
