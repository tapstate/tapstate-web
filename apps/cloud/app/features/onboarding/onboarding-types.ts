import type { Region } from '../../service/cloud-api'

export interface OnboardingInput {
  organizationName: string
  userEmail: string
  region: Region
  clusterName: string
  specKey: string
}
