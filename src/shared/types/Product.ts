/**
 * Renderable product detail information block (e.g. fit & size, extras).
 * Mapper produces these in declaration order so the PDP renders sections in
 * a stable, deterministic sequence. The server resolves the section title
 * via `ServerI18nService` and emits it as `label` so the client renders
 * sections without recomputing translations.
 */
export interface ProductDetailSection {
  /** Stable attribute group key (e.g. `'fit_size'`, `'extras'`, `'design'`). */
  key: string
  /** Localized section title (e.g. `'Fit & Size'`), produced by the server mapper. */
  label: string
  /**
   * Free-text paragraph rendered above the bullet content. Used to surface
   * the product description in the design section without requiring the
   * client to know which section it belongs to.
   */
  intro?: string
  /** Lines of body content rendered as a list under the section title. */
  content: string[]
}

/**
 * Tenant-specific fields layered onto the base product types shipped by
 * `@scayle/storefront`, produced by `ProductMapperService`.
 *
 * Import the augmented types from `@scayle/storefront/types`.
 */
declare module '@scayle/storefront/types' {
  interface ProductVariant {
    /** Display label for the variant (typically the size attribute). */
    label: string
  }

  interface DetailedProduct {
    /**
     * Renderable product-detail sections in display order (serializable for Inertia).
     * Empty array when the product has no matching attributes.
     */
    details: ProductDetailSection[]
    /** Product description (from the description attribute). Undefined when the attribute is absent. */
    description?: string
  }

  interface ListingProduct {
    /** Color label (empty string when the product has no color attribute). */
    color: string
    /** Optional badge label (e.g. "Sale", "Bestseller"). */
    badge?: string
  }

  interface ProductImage {
    /**
     * Stable value of the image's `imageType` attribute, matched against the
     * image view the user selects on the PLP and the Search Results Page.
     * Absent when the image carries no `imageType` value.
     */
    imageType?: string
  }

  interface ProductSibling {
    /** Color label (empty string when the sibling has no color attribute). */
    color: string
  }
}
