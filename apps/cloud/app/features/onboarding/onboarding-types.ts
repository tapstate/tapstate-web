import type { Region } from '../../service/cloud-api'

export interface OnboardingInput {
  organizationName: string
  organizationSlug: string
  region: Region
  clusterName: string
}
