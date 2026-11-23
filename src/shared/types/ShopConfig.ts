import type { DeliveryCosts } from './customData'

/**
 * Augments the tenant-invariant base `ShopConfig` shipped by
 * `@scayle/storefront` (the shop display name) with the one tenant-specific
 * field: `deliveryCost`, derived from Panel custom data with a localized
 * fallback by `ShopConfigMapperService`.
 *
 * Import the augmented type from `@scayle/storefront/types`.
 */
declare module '@scayle/storefront/types' {
  interface ShopConfig {
    /** Basket delivery copy shown in the basket summary. */
    deliveryCost: DeliveryCosts
  }
}
