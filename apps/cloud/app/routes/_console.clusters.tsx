import { createFileRoute } from '@tanstack/react-router'

import { ClustersPage } from '../features/clusters/clusters-page'

export const Route = createFileRoute('/_console/clusters')({ component: ClustersPage })
