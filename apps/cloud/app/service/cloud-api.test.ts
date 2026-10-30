import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { cloudApi, CloudApiError } from './cloud-api'

const organization = {
  id: 'org-a',
  name: 'Acceptance organization',
  ownerEmail: 'owner@example.test',
  status: 'ACTIVE',
}

let requests: { path: string; init: RequestInit }[]

function envelope(data: unknown, status = 200, code = 'ok') {
  return new Response(JSON.stringify({ opId: 'org-operation', code, msg: code, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  requests = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit) => {
      const path = new URL(input, 'http://localhost').pathname
      requests.push({ path, init })
      if (path === '/v1/api/orgs' && init.method === 'POST') {
        const body = JSON.parse(String(init.body))
        return envelope({ ...organization, name: body.name })
      }
      if (path === '/v1/api/orgs') return envelope([organization])
      if (path === '/v1/api/orgs/org-a') return envelope(organization)
      return envelope(null, 404, 'not-found')
    }),
  )
})

afterEach(() => vi.unstubAllGlobals())

describe('organization API contract', () => {
  it('loads the signed-in user organization list from the supported endpoint', async () => {
    expect(await cloudApi.organizations()).toEqual([organization])
    expect(requests).toHaveLength(1)
    expect(requests[0]?.init.credentials).toBe('include')
  })

  it('creates an organization with the existing name-only request and response envelope', async () => {
    expect(await cloudApi.createOrganization({ name: 'New organization' })).toEqual({
      ...organization,
      name: 'New organization',
    })
    expect(requests).toHaveLength(1)
    expect(JSON.parse(String(requests[0]?.init.body))).toEqual({ name: 'New organization' })
    expect(requests[0]?.init.headers).toMatchObject({ 'Content-Type': 'application/json' })
  })

  it('loads the selected organization without changing its identity or owner fields', async () => {
    expect(await cloudApi.organization(organization.id)).toEqual(organization)
  })

  it('preserves a refused organization lookup without trying an alternate endpoint', async () => {
    await expect(cloudApi.organization('other/org')).rejects.toMatchObject({
      name: CloudApiError.name,
      status: 404,
      code: 'not-found',
      opId: 'org-operation',
    })
    expect(requests.map(({ path }) => path)).toEqual(['/v1/api/orgs/other%2Forg'])
  })
})
