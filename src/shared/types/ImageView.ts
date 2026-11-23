/**
 * One selectable image view on the PLP and the Search Results Page, built
 * from a value of the `imageType` attribute group. The default view is not an
 * option: the client always adds it in front.
 */
export interface ImageViewOption {
  /**
   * Stable attribute value. Written to the `imageView` query parameter and
   * matched against `ProductImage.imageType`.
   */
  value: string
  /** Label as the Storefront API delivers it, already translated in the Panel. */
  label: string
}
