import type {
  ContentstackPageContent,
  ProductlistingpageComponent,
} from '@shared/types/cms/contentstack'

/**
 * CMS listing content collections for product listing pages.
 */
export interface CMSListingContentBlocks {
  /** Teaser blocks rendered above the product grid. */
  teaserContent: NonNullable<ProductlistingpageComponent['teaser_content']>
  /** SEO blocks rendered below the product grid (first page only). */
  seoContent: NonNullable<ProductlistingpageComponent['seo_content']>
}

/**
 * Extracts CMS listing blocks for rendering above and below the product grid.
 * Reads `teaser_content` and `seo_content` arrays from a Contentstack listing page entry.
 *
 * @param data Contentstack entry containing listing content fields, or `null`/`undefined`
 * @returns Block collections for the listing page
 *
 * @example
 * ```ts
 * const { teaserContent, seoContent } = getCmsListingContent(listingEntry)
 * ```
 */
export const getCmsListingContent = (
  data: ContentstackPageContent | null | undefined,
): CMSListingContentBlocks => {
  const entry = data as ProductlistingpageComponent | undefined

  return {
    teaserContent: entry?.teaser_content ?? [],
    seoContent: entry?.seo_content ?? [],
  }
}
