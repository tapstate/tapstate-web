import { createFileRoute } from '@tanstack/react-router'

import { OrganizationsPage } from '../features/organizations/organizations-page'

export const Route = createFileRoute('/_console/organizations')({ component: OrganizationsPage })
