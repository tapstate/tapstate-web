import '../i18n'
import type { HTMLAttributes, ReactNode } from 'react'

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: { children: ReactNode } & HTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
  useRouterState: ({ select }: { select: (state: { location: { pathname: string } }) => string }) =>
    select({ location: { pathname: '/' } }),
}))
vi.mock('../features/clusters/use-cluster-entry', () => ({
  cancelPendingClusterEntries: vi.fn(),
  useClusterEntry: () => ({ enterCluster: vi.fn(), enteringId: null, entryError: null }),
}))
vi.mock('../state/cloud-app-state', () => ({
  useCloudAppState: () => ({
    activeOrganization: null,
    clusters: [],
    darkMode: false,
    setDarkMode: vi.fn(),
    setActiveOrganization: vi.fn(),
    clearIdentity: vi.fn(),
  }),
}))

import { CloudConsoleShell } from './cloud-console-shell'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

it('provides documentation and opens support from the Cloud sidebar', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const showWidget = vi.fn()
  const hideWidget = vi.fn()
  const maximize = vi.fn()
  window.Tawk_API = { showWidget, hideWidget, maximize }
  try {
    await act(async () =>
      root.render(
        <CloudConsoleShell
          organization={null}
          organizations={[]}
          clusters={[]}
          user={{ email: 'user@example.com' }}
        >
          <main />
        </CloudConsoleShell>,
      ),
    )
    const help = host.querySelector<HTMLButtonElement>('aside button[aria-label="Help"]')!
    expect(help).not.toBeNull()
    await act(async () => help.click())
    expect(document.querySelector('a[href="https://tapstate.dev/"]')).not.toBeNull()
    const support = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((item) =>
      item.textContent?.includes('Contact support'),
    )!
    expect(support).toBeDefined()
    await act(async () => support.click())
    expect(showWidget).toHaveBeenCalled()
    expect(maximize).toHaveBeenCalled()
  } finally {
    await act(async () => root.unmount())
    host.remove()
    document.getElementById('tapstate-tawk-feedback-widget')?.remove()
    delete window.Tawk_API
  }
})
