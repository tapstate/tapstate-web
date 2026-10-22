import { createFileRoute } from '@tanstack/react-router'

import { CheckoutSuccessPage } from '../features/billing/checkout-success-page'

export const Route = createFileRoute('/_console/checkout/success')({
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: typeof search.session_id === 'string' ? search.session_id : undefined,
  }),
  component: CheckoutSuccessPage,
})
