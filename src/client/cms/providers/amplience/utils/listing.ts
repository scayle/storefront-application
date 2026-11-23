import type {
  CMSPageData,
  ProductListingPageComponent,
  SEOContent,
  TeaserContent,
} from '@shared/types/cms/amplience'

/** Schema URI of the Amplience product listing page content type. */
const PRODUCT_LISTING_PAGE_SCHEMA_URI =
  'https://scayle.com/schemas/product-listing-page-component.json'

/**
 * CMS listing content collections for product listing pages.
 */
export interface CMSListingContentBlocks {
  /** Teaser blocks rendered above the product grid. */
  teaserContent: TeaserContent
  /** SEO blocks rendered below the product grid (first page only). */
  seoContent: SEOContent
}

/**
 * Extracts CMS listing blocks for rendering above and below the product grid.
 *
 * Amplience identifies a content item by the schema URI in `_meta.schema`, so
 * that is checked before reading listing-specific fields. A payload for any
 * other content type yields empty collections rather than throwing, since the
 * PLP renders with no CMS content at all for most categories.
 *
 * @param data Amplience page payload for a category page
 * @returns Block collections for the listing page
 *
 * @example
 * ```ts
 * const { teaserContent, seoContent } = getCmsListingContent(pageData)
 * ```
 */
export const getCmsListingContent = (
  data: CMSPageData | null | undefined,
): CMSListingContentBlocks => {
  // The schema check below is the runtime narrowing from the page/listing
  // union to the listing shape; the assertion only pre-states its result.
  // ESLint resolves `CMSPageData` through the default tsconfig, where it is the
  // Scayle placeholder type and the assertion looks redundant. The Amplience
  // tsconfig needs it.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  const content = data as ProductListingPageComponent | null | undefined

  if (content?._meta?.schema !== PRODUCT_LISTING_PAGE_SCHEMA_URI) {
    return { teaserContent: [], seoContent: [] }
  }

  return {
    teaserContent: content.teaser_content ?? [],
    seoContent: content.seo_content ?? [],
  }
}
