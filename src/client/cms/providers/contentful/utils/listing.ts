import type {
  ContentfulEntry,
  TypeProductListingPageComponentWithoutUnresolvableLinksResponse,
} from '@shared/types/cms/contentful'

type ListingEntry =
  TypeProductListingPageComponentWithoutUnresolvableLinksResponse

/**
 * CMS listing content collections for product listing pages.
 */
export interface CMSListingContentBlocks {
  /** Teaser blocks rendered above the product grid. */
  teaserContent: NonNullable<ListingEntry['fields']['teaserContent']>
  /** SEO blocks rendered below the product grid (first page only). */
  seoContent: NonNullable<ListingEntry['fields']['seoContent']>
}

/**
 * Extracts CMS listing blocks for rendering above and below the product grid.
 * Reads `teaserContent` and `seoContent` arrays from a Contentful listing page entry.
 *
 * @param data Contentful entry containing listing content fields, or `null`/`undefined`
 * @returns Block collections for the listing page
 *
 * @example
 * ```ts
 * const { teaserContent, seoContent } = getCmsListingContent(listingEntry)
 * ```
 */
export const getCmsListingContent = (
  data: ContentfulEntry | null | undefined,
): CMSListingContentBlocks => {
  const fields = (data as ListingEntry | undefined)?.fields

  return {
    teaserContent: fields?.teaserContent ?? [],
    seoContent: fields?.seoContent ?? [],
  }
}
