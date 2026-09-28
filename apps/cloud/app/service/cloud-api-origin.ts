const configuredOrigin = import.meta.env.VITE_CLOUD_API_ORIGIN

const defaultOrigin = ''

export const cloudApiOrigin = configuredOrigin?.replace(/\/$/, '') || defaultOrigin
