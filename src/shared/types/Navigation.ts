/**
 * Augments the tenant-invariant base `NavigationItem` from
 * `@scayle/storefront` with the tenant-specific fields this storefront derives
 * from navigation `customData`. Populated by `NavigationMapperService`.
 *
 * Import the augmented type from `@scayle/storefront/types`.
 */
declare module '@scayle/storefront/types' {
  interface NavigationItem {
    /** The link color of the navigation item (from `customData.linkColor`). */
    linkColor?: string
    /** Whether the navigation item is disabled when clicked (from `customData.disabledLink`). */
    disabled: boolean
  }
}

// Marks this file as a module, so the block above augments `@scayle/storefront/types`
// instead of declaring an ambient module that replaces it.
export {}
