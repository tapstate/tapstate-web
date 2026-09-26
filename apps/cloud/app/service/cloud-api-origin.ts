const configuredOrigin = import.meta.env.VITE_CLOUD_API_ORIGIN

export const cloudApiOrigin = configuredOrigin?.replace(/\/$/, '') || '/api'
