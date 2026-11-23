/**
 * Augments the tenant-invariant base `Customer` from `@scayle/storefront` with
 * the application's analytics hash, mirroring the `Campaign`/`NavigationItem`
 * augmentation pattern. The invariant fields (id, email, personal data, guest
 * flag, groups) come from the base type; `CustomerMapperService` maps them via
 * `super.mapCustomer()` and layers the hash.
 *
 * Import the augmented type from `@scayle/storefront/types`.
 */
declare module '@scayle/storefront/types' {
  interface Customer {
    /**
     * SHA-256 hex of the customer id. The GA4 tracking plugin sends it as
     * `user_id`.
     */
    idHash: string
  }
}

// Marks this file as a module, so the block above augments `@scayle/storefront/types`
// instead of declaring an ambient module that replaces it.
export {}
