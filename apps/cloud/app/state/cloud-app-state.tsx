import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import type { Cluster, Organization } from '../service/cloud-api'
import type { UserProfile } from '../types'

interface CloudAppState {
  darkMode: boolean
  user: UserProfile | null
  organizations: Organization[]
  activeOrganization: Organization | null
  clusters: Cluster[]
  activeCluster: Cluster | null
  setDarkMode: (enabled: boolean) => void
  setIdentity: (user: UserProfile, organizations: Organization[], clusters?: Cluster[]) => void
  completeOnboarding: (user: UserProfile, organization: Organization, cluster: Cluster) => void
  setActiveOrganization: (organization: Organization) => void
  setClusters: (clusters: Cluster[]) => void
  clearIdentity: () => void
}

const CloudAppStateContext = createContext<CloudAppState | null>(null)

export function CloudAppStateProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(false)
  const [identity, setIdentityState] = useState<{
    user: UserProfile | null
    organizations: Organization[]
    activeOrganization: Organization | null
    clusters: Cluster[]
    activeCluster: Cluster | null
  }>({
    user: null,
    organizations: [],
    activeOrganization: null,
    clusters: [],
    activeCluster: null,
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
  }, [darkMode])

  const setIdentity = useCallback(
    (user: UserProfile, organizations: Organization[], clusters: Cluster[] = []) => {
      setIdentityState({
        user,
        organizations,
        activeOrganization: organizations[0] ?? null,
        clusters,
        activeCluster: clusters[0] ?? null,
      })
    },
    [],
  )

  const completeOnboarding = useCallback(
    (user: UserProfile, organization: Organization, cluster: Cluster) => {
      setIdentityState((current) => ({
        ...current,
        user,
        organizations: [
          organization,
          ...current.organizations.filter((item) => item.id !== organization.id),
        ],
        activeOrganization: organization,
        clusters: [cluster, ...current.clusters.filter((item) => item.id !== cluster.id)],
        activeCluster: cluster,
      }))
    },
    [],
  )

  const setActiveOrganization = useCallback((organization: Organization) => {
    setIdentityState((current) => ({
      ...current,
      activeOrganization: organization,
      clusters: [],
      activeCluster: null,
    }))
  }, [])

  const setClusters = useCallback((clusters: Cluster[]) => {
    setIdentityState((current) => ({
      ...current,
      clusters,
      activeCluster:
        clusters.find((cluster) => cluster.id === current.activeCluster?.id) ?? clusters[0] ?? null,
    }))
  }, [])

  const clearIdentity = useCallback(() => {
    setIdentityState({
      user: null,
      organizations: [],
      activeOrganization: null,
      clusters: [],
      activeCluster: null,
    })
  }, [])

  const value = useMemo<CloudAppState>(
    () => ({
      ...identity,
      darkMode,
      setDarkMode,
      setIdentity,
      completeOnboarding,
      setActiveOrganization,
      setClusters,
      clearIdentity,
    }),
    [
      darkMode,
      identity,
      setIdentity,
      completeOnboarding,
      setActiveOrganization,
      setClusters,
      clearIdentity,
    ],
  )

  return <CloudAppStateContext.Provider value={value}>{children}</CloudAppStateContext.Provider>
}

export function useCloudAppState() {
  const state = useContext(CloudAppStateContext)
  if (!state) throw new Error('Cloud app state is unavailable outside its provider.')
  return state
}
