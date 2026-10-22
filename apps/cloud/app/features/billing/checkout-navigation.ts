/** Full-page handoff to Stripe Checkout — the SPA cannot proxy the hosted page. */
export function navigateToCheckout(url: string): void {
  window.location.assign(url)
}
