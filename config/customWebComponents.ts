/**
 * Custom web component tag names for SCAYLE embeds (checkout, auth, subscriptions).
 * Shared by Vite and Vitest Vue compiler options so dev and test treat them consistently.
 */
export const customWebComponentTags = [
  'scayle-checkout',
  'scayle-auth',
  'scayle-auth-new-password',
  'scayle-express-checkout',
  'subscription-overview',
  'subscription-cancellation',
] as const

/** Checks whether a template tag is a registered custom web component. */
export function isCustomWebComponent(tag: string): boolean {
  return (customWebComponentTags as readonly string[]).includes(tag)
}
