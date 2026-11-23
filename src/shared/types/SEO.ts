import type { CanonicalLink } from '@scayle/storefront/types'
import type {
  BreadcrumbList,
  ItemList,
  OnlineStore,
  ProductGroup,
  WithContext,
} from 'schema-dts'

/** Product detail page structured data: ProductGroup and BreadcrumbList */
export type ProductDetailPageJsonLd = [
  WithContext<ProductGroup>,
  WithContext<BreadcrumbList>,
]

/** Product listing page structured data: ItemList and BreadcrumbList */
export type ProductListingPageJsonLd = [
  WithContext<ItemList>,
  WithContext<BreadcrumbList>,
]

/** Search results page structured data: ItemList of products on the current page */
export type SearchPageJsonLd = WithContext<ItemList>

/** Homepage structured data: OnlineStore */
export type HomepageJsonLd = WithContext<OnlineStore>

/**
 * Structured data of any page that sends a `jsonLd` prop. Pages send it as a
 * server-only prop, so only the server-rendered HTML carries it.
 */
export type PageJsonLd =
  | ProductDetailPageJsonLd
  | ProductListingPageJsonLd
  | SearchPageJsonLd
  | HomepageJsonLd

/** Shared head meta fields for all pages. */
export interface SEOMeta {
  /**
   * The title of the page.
   */
  title: string
  /**
   * The description of the page, used for the `description` and Open Graph description meta tags.
   * Omitted on pages without a description, so both tags are left out.
   */
  description?: string
  /**
   * The canonical link of the page.
   */
  canonicalLink?: CanonicalLink
  /**
   * The robots meta tag of the page.
   */
  robots?: string
  /**
   * The image of the page, used for the Open Graph image.
   */
  image?: string
}
