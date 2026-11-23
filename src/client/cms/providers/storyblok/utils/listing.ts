import type {
  ProductListingPageComponent,
  CMSPageData,
} from '@shared/types/cms/storyblok'

/**
 * CMS listing content collections for product listing pages.
 */
export interface CMSListingContentBlocks {
  /** Teaser blocks rendered above the product grid. */
  teaserContent: NonNullable<ProductListingPageComponent['teaserContent']>
  /** SEO blocks rendered below the product grid (first page only). */
  seoContent: NonNullable<ProductListingPageComponent['seoContent']>
}

/**
 * Extracts CMS listing blocks for rendering above and below the product grid.
 * Uses the `component` discriminator to verify the story contains a
 * `ProductListingPageComponent` before accessing listing-specific fields.
 *
 * @param data Storyblok page data containing a story with listing content
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
  const content = data?.story?.content

  if (!content || content.component !== 'ProductListingPageComponent') {
    return { teaserContent: [], seoContent: [] }
  }

  return {
    teaserContent: content.teaserContent ?? [],
    seoContent: content.seoContent ?? [],
  }
}
