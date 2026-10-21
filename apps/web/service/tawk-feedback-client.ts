import { cloudConsoleUrl } from '@/utils/cloud-console'

const offlineSubmissionPath = '/v1/api/feedback/tawk/offline-submissions'

export class TawkNotificationError extends Error {
  constructor(readonly status: number) {
    super('Could not queue the Tawk offline feedback notification.')
    this.name = 'TawkNotificationError'
  }
}

export async function notifyTawkOfflineSubmission(eventId: string, propertyId: string) {
  let response: Response
  try {
    response = await fetch(new URL(offlineSubmissionPath, cloudConsoleUrl), {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ eventId, propertyId }),
      keepalive: true,
    })
  } catch {
    throw new TawkNotificationError(0)
  }

  if (!response.ok) throw new TawkNotificationError(response.status)
}
