import { createFileRoute } from '@tanstack/react-router'

import { CheckoutCancelPage } from '../features/billing/checkout-cancel-page'

export const Route = createFileRoute('/_console/checkout/cancel')({
  component: CheckoutCancelPage,
})
