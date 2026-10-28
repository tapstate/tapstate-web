export const cloudSections = [
  { id: 'overview', path: '/', label: 'Overview' },
  { id: 'clusters', path: '/clusters', label: 'Clusters' },
  { id: 'alerts', path: '/alerts', label: 'Alerts' },
  { id: 'billing', path: '/billing', label: 'Usage & billing' },
  { id: 'settings', path: '/settings', label: 'Settings' },
] as const

export type CloudSectionId = (typeof cloudSections)[number]['id']
