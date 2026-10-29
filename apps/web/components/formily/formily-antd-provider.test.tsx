import { theme } from 'antd'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it } from 'vitest'

import { FormilyAntdProvider } from './formily-antd-provider'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

it('provides shared semantic colors to node forms without an explicit theme', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  function NodeFormTheme() {
    const { token } = theme.useToken()
    return (
      <output>
        {JSON.stringify({
          background: token.colorBgContainer,
          text: token.colorText,
          error: token.colorErrorText,
          selected: token.controlItemBgActive,
        })}
      </output>
    )
  }
  try {
    await act(async () =>
      root.render(
        <FormilyAntdProvider>
          <NodeFormTheme />
        </FormilyAntdProvider>,
      ),
    )
    expect(JSON.parse(host.querySelector('output')?.textContent ?? '{}')).toEqual({
      background: 'var(--color-components-input-bg-normal)',
      text: 'var(--color-text-primary)',
      error: 'var(--color-text-destructive)',
      selected: 'color-mix(in srgb, var(--color-text-accent) 10%, var(--color-background-default))',
    })
  } finally {
    await act(async () => root.unmount())
    host.remove()
  }
})
