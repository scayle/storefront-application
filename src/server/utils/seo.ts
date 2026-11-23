import type {
  BreadcrumbItem,
  Category,
  Hreflang,
  ListingProduct,
  DetailedProduct,
  ProductVariant,
} from '@scayle/storefront/types'
import type { StorefrontContext } from '@scayle/storefront'
import type { CMSPageMeta } from '@scayle/storefront/cms'
import type {
  HomepageJsonLd,
  ProductDetailPageJsonLd,
  ProductListingPageJsonLd,
  SearchPageJsonLd,
  SEOMeta,
} from '@shared/types/SEO'
import {
  appendImageModifiers,
  buildCanonicalUrl,
  composeHreflangs,
  localizeLink,
} from '@scayle/storefront/shared'
import type { ServerI18nService } from '@server/services/i18n'
import { toCurrencyUnits } from '@shared/utils/price'
import type {
  BreadcrumbList,
  ItemList,
  ListItem,
  Offer,
  OnlineStore,
  Product,
  ProductGroup,
  VideoObject,
  WithContext,
} from 'schema-dts'

/**
 * Resolves a mapper link to the absolute URL of the active country. Mapper links
 * carry no country prefix, because the client adds it when it renders a link.
 * JSON-LD is built on the server, so the prefix is added here.
 *
 * @param link Site-relative link from a mapper (e.g. `/p/jeans-401870`).
 * @param storefront Server storefront context; provides the active country and
 *   the `config.countrySelector` used by `localizeLink`.
 * @param origin Resolved public origin of the current request (`request.origin`).
 * @returns Absolute URL, with the country prefix when the country selector uses one.
 */
function toAbsoluteUrl(
  link: string,
  storefront: StorefrontContext,
  origin: string,
): string {
  return new URL(localizeLink(storefront, link), origin).href
}

/**
 * Builds a schema.org BreadcrumbList from already-ordered breadcrumb items.
 * Internal helper; callers should use `generateCategoryBreadcrumbSchema` or the
 * product variant inside `getProductJsonLd`.
 *
 * @param items Breadcrumb items, ordered root → leaf.
 * @param storefront Server storefront context used to localize the breadcrumb links.
 * @param origin Resolved public origin of the current request (`request.origin`).
 * @returns BreadcrumbList schema object for the JSON-LD script tag.
 *
 * @see https://schema.org/BreadcrumbList
 */
function buildBreadcrumbListSchema(
  items: BreadcrumbItem[],
  storefront: StorefrontContext,
  origin: string,
): WithContext<BreadcrumbList> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.value,
      item: toAbsoluteUrl(item.to, storefront, origin),
    })),
  }
}

/**
 * Builds BreadcrumbList JSON-LD for a category page. Appends the active category
 * to its `breadcrumbs` (which hold ancestors only) so the structured data lists
 * the full trail from root to the current page.
 *
 * @param category Mapped category with ancestor breadcrumbs and its own link/name.
 * @param storefront Server storefront context used to localize the breadcrumb links.
 * @param origin Resolved public origin of the current request (`request.origin`).
 * @returns BreadcrumbList schema object for the JSON-LD script tag.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/seo
 */
export function generateCategoryBreadcrumbSchema(
  category: Category,
  storefront: StorefrontContext,
  origin: string,
): WithContext<BreadcrumbList> {
  return buildBreadcrumbListSchema(
    [
      ...category.breadcrumbs,
      { to: category.link, value: category.name, id: category.id },
    ],
    storefront,
    origin,
  )
}

/**
 * Generates a schema.org Offer for a product variant (price, availability, SKU).
 * Used when building ProductGroup hasVariant entries.
 *
 * @param variant Product variant with price, stock, and reference key.
 * @param baseUrl Base URL for the variant (variantId is appended as query param).
 * @returns Offer schema object for JSON-LD.
 *
 * @see https://schema.org/Offer
 * @see https://schema.org/InStock
 * @see https://schema.org/OutOfStock
 */
function generateSchemaProductOffer(
  variant: ProductVariant,
  baseUrl: string,
): Offer {
  const url = new URL(baseUrl)
  url.searchParams.set('variantId', variant.id.toString())

  return {
    '@type': 'Offer',
    url: url.href,
    ...(variant.referenceKey ? { mpn: variant.referenceKey } : {}),
    sku: variant.id.toString(),
    price: toCurrencyUnits(variant.price.finalPriceInCents),
    priceCurrency: variant.price.currency,
    availability:
      variant.stock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    itemCondition: 'https://schema.org/NewCondition',
  }
}

/**
 * Generates a schema.org Product for one variant, including its Offer.
 * Used when building ProductGroup hasVariant entries.
 *
 * @param params Product variant schema parameters.
 * @param params.productName Display name for the product (e.g. "Name, Color").
 * @param params.variant Product variant with price and stock.
 * @param params.url Full URL for the variant (used in the Offer).
 * @param params.image Image URL for the variant.
 * @param params.size Size label (e.g. "S", "M").
 * @returns Product schema object for JSON-LD.
 *
 * @see https://schema.org/Product
 */
function generateProductSchema({
  productName,
  variant,
  url,
  image,
  size,
}: {
  productName: string
  variant: ProductVariant
  url: string
  image: string
  size: string
}): Product {
  return {
    '@type': 'Product',
    name: `${productName} (${size})`,
    size,
    offers: generateSchemaProductOffer(variant, url),
    image,
  }
}

/**
 * Strips HTML tags from a product description so JSON-LD values stay plain text.
 *
 * @param value Product description that may contain markup.
 * @returns Trimmed plain text, or `undefined` when nothing remains.
 */
function toPlainText(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }
  return value.replace(/<[^<>]+>/g, '').trim() || undefined
}

/**
 * Generates ProductGroup JSON-LD with hasVariant (Product with Offer per variant) and
 * variesBy when multiple variants exist. Used inside getProductJsonLd.
 * Aligned with Nuxt storefront-product-detail seo utils.
 *
 * @param params ProductGroup schema parameters.
 * @param params.productId Product ID (string) for productGroupID.
 * @param params.name Product name.
 * @param params.description Product description (or name as fallback).
 * @param params.brandName Brand name for the Brand schema.
 * @param params.color Color for the ProductGroup.
 * @param params.variants Variants to emit as hasVariant (Product + Offer each).
 * @param params.productUrl Full product page URL (variantId appended per variant in Offer).
 * @param params.image Image URL for the product.
 * @param params.subjectOf VideoObject nodes for rendered product videos, when any.
 * @returns ProductGroup schema object for JSON-LD.
 *
 * @see https://schema.org/ProductGroup
 */
function generateProductGroupSchema({
  productId,
  name,
  description,
  brandName,
  color,
  variants,
  productUrl,
  image,
  subjectOf,
}: {
  productId: string
  name: string
  description: string
  brandName: string
  color: string
  variants: ProductVariant[]
  productUrl: string
  image: string
  subjectOf?: VideoObject[]
}): WithContext<ProductGroup> {
  const productName = `${name}, ${color}`
  const hasVariant = variants.map((v) =>
    generateProductSchema({
      productName,
      variant: v,
      url: productUrl,
      image,
      size: v.label,
    }),
  )

  return {
    '@context': 'https://schema.org',
    '@type': 'ProductGroup',
    productGroupID: productId,
    name: productName,
    description,
    brand: { '@type': 'Brand', name: brandName },
    color,
    ...(image && { image: [image] }),
    ...(hasVariant.length > 0 && {
      hasVariant,
      ...(hasVariant.length > 1 && {
        variesBy: ['https://schema.org/size'],
      }),
    }),
    ...(subjectOf && subjectOf.length > 0 && { subjectOf }),
  }
}

/**
 * Builds product page JSON-LD (ProductGroup and BreadcrumbList) from the mapped product and
 * public page URL. Used by the product detail controller for the server-only `jsonLd` prop.
 *
 * @param product Mapped product with breadcrumbs, variants, and detail fields.
 * @param pageUrl Public URL of the page (`request.url`), used as the product URL.
 * @param storefront Server storefront context used to localize the breadcrumb links.
 * @param origin Resolved public origin of the current request (`request.origin`).
 * @param i18n Translator from the `i18n` mapper registry slot, used for VideoObject names.
 * @returns Tuple of [ProductGroup, BreadcrumbList] for a single JSON-LD script.
 */
export function getProductJsonLd(
  product: DetailedProduct,
  pageUrl: string,
  storefront: StorefrontContext,
  origin: string,
  i18n: ServerI18nService,
): ProductDetailPageJsonLd {
  const parsed = new URL(pageUrl)
  const productUrl = parsed.origin + parsed.pathname + parsed.search
  const imageBaseUrl = product.images[0]?.url
  const imageUrl = imageBaseUrl
    ? appendImageModifiers(imageBaseUrl, { width: 1200 })
    : ''
  const videoDescription = toPlainText(product.description)
  // uploadDate is omitted until ProductVideo.customData (or attributes) exposes
  // a reliable publication date. Without it, Google video rich results are
  // ineligible. Externally hosted videos have no posterUrl and are excluded
  // (VideoObject requires thumbnailUrl).
  const subjectOf = product.videos.flatMap((video, index) => {
    if (!video.posterUrl) {
      return []
    }
    return [
      {
        '@type': 'VideoObject' as const,
        name: i18n.t('product_video.json_ld_name', {
          name: product.name,
          index: index + 1,
        }),
        contentUrl: video.url,
        thumbnailUrl: video.posterUrl,
        ...(videoDescription && { description: videoDescription }),
      },
    ]
  })
  const productJsonLd = generateProductGroupSchema({
    productId: product.id.toString(),
    name: product.name,
    description: product.description ?? product.name,
    brandName: product.brand,
    color: product.color,
    variants: product.variants,
    productUrl,
    image: imageUrl,
    subjectOf,
  })
  const productBreadcrumbJsonLd = buildBreadcrumbListSchema(
    product.breadcrumbs,
    storefront,
    origin,
  )
  return [productJsonLd, productBreadcrumbJsonLd]
}

/**
 * Resolves the listing image URL as an absolute string for JSON-LD.
 *
 * @param product Listing product carrying its images in Storefront API order.
 * @returns Sized absolute image URL, or `undefined` when the product has no image.
 */
function resolveListingProductImageUrl(
  product: ListingProduct,
): string | undefined {
  const url = product.images[0]?.url

  if (!url) {
    return undefined
  }

  // The image `url` is already absolute; size it for the JSON-LD listing image.
  return appendImageModifiers(url, { width: 1200 })
}

/**
 * Builds a schema.org Offer for a listing product (price, availability, SKU).
 * Used when building Product entries on category PLPs.
 *
 * @param product Listing product with price, stock flag, and link.
 * @param productUrl Absolute product detail URL for the offer.
 * @returns Offer schema object for JSON-LD.
 *
 * @see https://schema.org/Offer
 */
function generateListingProductOffer(
  product: ListingProduct,
  productUrl: string,
): Offer {
  return {
    '@type': 'Offer',
    url: productUrl,
    sku: product.id.toString(),
    price: toCurrencyUnits(product.price.finalPriceInCents),
    priceCurrency: product.price.currency,
    availability: product.isSoldOut
      ? 'https://schema.org/OutOfStock'
      : 'https://schema.org/InStock',
    itemCondition: 'https://schema.org/NewCondition',
  }
}

/**
 * Generates Product JSON-LD for one product on a category listing page.
 * Uses root-level `offers` so each ItemList entry satisfies Google
 * [product snippet](https://developers.google.com/search/docs/appearance/structured-data/product-snippet)
 * requirements (`Product` with `offers`, `review`, or `aggregateRating`).
 * PDP pages keep {@link generateProductGroupSchema} with `hasVariant` for variant detail.
 *
 * @param product Mapped listing product from the current PLP page.
 * @param storefront Server storefront context used to localize the product link.
 * @param origin Resolved public origin of the current request (`request.origin`).
 * @returns Product schema object nested under ItemList `item` (no `@context`).
 *
 * @see https://schema.org/Product
 */
export function generateListingProductSchema(
  product: ListingProduct,
  storefront: StorefrontContext,
  origin: string,
): Product {
  const productUrl = toAbsoluteUrl(product.link, storefront, origin)
  const imageUrl = resolveListingProductImageUrl(product)

  return {
    '@type': 'Product',
    name: product.name,
    ...(product.color ? { color: product.color } : {}),
    url: productUrl,
    sku: product.id.toString(),
    inProductGroupWithID: product.id.toString(),
    brand: { '@type': 'Brand', name: product.brand },
    ...(imageUrl ? { image: [imageUrl] } : {}),
    offers: generateListingProductOffer(product, productUrl),
  }
}

/**
 * Generates ItemList JSON-LD for products on the current category PLP page.
 * Each list entry is a Product with Offer for the visible page slice only.
 *
 * @param params ItemList generation parameters.
 * @param params.name Listing title (category trail and optional page suffix).
 * @param params.products Products on the current page, in display order.
 * @param params.storefront Server storefront context used to localize the product links.
 * @param params.origin Resolved public origin of the current request (`request.origin`).
 * @returns ItemList schema object for JSON-LD.
 *
 * @see https://schema.org/ItemList
 */
export function generateProductListingItemListSchema(params: {
  name: string
  products: ListingProduct[]
  storefront: StorefrontContext
  origin: string
}): WithContext<ItemList> {
  const { name, products, storefront, origin } = params

  const itemListElement: ListItem[] = products.map((product, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    item: generateListingProductSchema(product, storefront, origin),
  }))

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: products.length,
    itemListElement,
  }
}

/**
 * Combines a page title with the shop name through the localized
 * `global.seo_title_with_shop_name` pattern ("{title} | {shopName}"). Used by every page whose
 * title carries the shop name, so a locale can change the order or the separator in one string.
 *
 * @param i18n Translator from the `i18n` mapper registry slot.
 * @param title Page title without the shop name.
 * @param shopName Shop name from `ShopConfigService.getShopName()`.
 * @returns The title with the shop name, or the title alone when the shop configuration could not
 *   be read, so it never carries a dangling separator.
 */
export function withShopName(
  i18n: ServerI18nService,
  title: string,
  shopName: string | undefined,
): string {
  return shopName
    ? i18n.t('global.seo_title_with_shop_name', { title, shopName })
    : title
}

/**
 * Builds category PLP JSON-LD (ItemList and BreadcrumbList) from the mapped category
 * and the current-page products. Used by the product listing controller for the
 * server-only `jsonLd` prop.
 *
 * @param params PLP JSON-LD parameters.
 * @param params.category Mapped category with breadcrumbs and name.
 * @param params.products Products on the current listing page.
 * @param params.storefront Server storefront context used to localize product and breadcrumb links.
 * @param params.origin Resolved public origin of the current request (`request.origin`).
 * @param params.listingName Listing title for the ItemList `name` (category trail plus page suffix).
 * @returns Tuple of [ItemList, BreadcrumbList] for the JSON-LD script tag.
 */
export function getProductListingJsonLd(params: {
  category: Category
  products: ListingProduct[]
  storefront: StorefrontContext
  origin: string
  listingName: string
}): ProductListingPageJsonLd {
  const { category, products, storefront, origin, listingName } = params

  const itemListSchema = generateProductListingItemListSchema({
    name: listingName,
    products,
    storefront,
    origin,
  })
  const breadcrumbSchema = generateCategoryBreadcrumbSchema(
    category,
    storefront,
    origin,
  )

  return [itemListSchema, breadcrumbSchema]
}

/**
 * Builds search results JSON-LD (ItemList only) from the current page of products.
 * Used by the search controller for the server-only `jsonLd` prop.
 *
 * @param params Search JSON-LD parameters.
 * @param params.products Products on the current search results page.
 * @param params.storefront Server storefront context used to localize the product links.
 * @param params.origin Resolved public origin of the current request (`request.origin`).
 * @param params.listName ItemList title (typically the localized search results title).
 * @returns ItemList schema object for the JSON-LD script tag.
 */
export function getSearchJsonLd(params: {
  products: ListingProduct[]
  storefront: StorefrontContext
  origin: string
  listName: string
}): SearchPageJsonLd {
  const { products, storefront, origin, listName } = params

  return generateProductListingItemListSchema({
    name: listName,
    products,
    storefront,
    origin,
  })
}

/**
 * Generates OnlineStore JSON-LD for the homepage.
 * Used by the CMS homepage controller for the server-only `jsonLd` prop.
 *
 * @param params OnlineStore schema parameters.
 * @param params.name Shop name from the shop configuration.
 * @param params.url Storefront homepage URL (origin).
 * @param params.logo Optional absolute logo URL.
 * @returns OnlineStore schema object for JSON-LD, or undefined when name or url are missing.
 *
 * @see https://schema.org/OnlineStore
 */
export function generateOnlineStoreSchema(params: {
  /** Shop name from the shop configuration, `undefined` when it could not be read. */
  name: string | undefined
  /** Storefront homepage URL (origin). */
  url: string
  /** Optional absolute logo URL. */
  logo?: string
}): HomepageJsonLd | undefined {
  const { name, url, logo } = params

  if (!name || !url) {
    return undefined
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name,
    url,
    ...(logo && { logo }),
  } satisfies WithContext<OnlineStore>
}

/**
 * Builds CMS page head meta (title, description, canonical, robots, image) from
 * provider-supplied `CMSPageMeta`.
 *
 * Fallbacks:
 * - `title`: falls back to `shopName` when the CMS provider returned no title so every page
 *   renders a non-empty `<title>` (AC 1.2). Empty only when the CMS entry has no title and the
 *   shop configuration could not be read either.
 * - `description`: passed through as is; `PageMetaHead` leaves out the description meta tags
 *   when the CMS provider returned none.
 * - `robots`: omitted when not supplied so crawlers apply their default behavior. Avoids
 *   inadvertently flagging preview/draft pages as `index, follow`.
 *
 * @param params Inputs required to build the SEO meta.
 * @param params.cmsMeta Raw meta returned by the CMS provider (may be undefined).
 * @param params.shopName Shop display name used as the title fallback, or `undefined` when the
 *   shop configuration could not be read.
 * @param params.pageUrl Public URL of the page (`request.url`) used to derive the canonical link (query params stripped).
 * @returns SEOMeta for the CmsPage Vue component.
 */
export function mapCmsPageMeta(params: {
  cmsMeta: CMSPageMeta | undefined
  shopName: string | undefined
  pageUrl: string
}): SEOMeta {
  const { cmsMeta, shopName, pageUrl } = params

  return {
    // An empty title is useless for SEO, so fall back to the shop name. It
    // stays empty only when the shop configuration cannot be read either.
    title: cmsMeta?.title || shopName || '',
    description: cmsMeta?.description,
    canonicalLink: buildCanonicalUrl(pageUrl, []),
    ...(cmsMeta?.robots ? { robots: cmsMeta.robots } : {}),
    image: cmsMeta?.image,
  }
}

/**
 * Builds hreflang alternate links for a CMS page across all configured countries.
 *
 * When `alternatePagePaths` is provided, each country resolves its own page path
 * (e.g. Storyblok folder-mapped slugs that differ per locale). When omitted or
 * when a country has no entry in the map, falls back to the shared `pagePath`.
 *
 * Emits one `x-default` entry pointing at the country flagged as `isDefault`,
 * consistent with the PDP/PLP hreflang behavior. Config validation guarantees
 * at most one default country.
 *
 * @param params Hreflang generation parameters.
 * @param params.pagePath Default path portion of the CMS page URL (e.g. `/` for homepage, `/content/about`).
 * @param params.storefront Server storefront context; provides the configured
 *   countries and the `config.countrySelector` used by `composeHreflangs`.
 * @param params.origin Resolved public origin of the current request (`request.origin`).
 * @param params.alternatePagePaths Optional per-locale page paths from the CMS provider. Looked up
 *   by full locale (e.g. `de-AT`) first, then by language code (e.g. `de`), then by `country.path`
 *   for back-compat, before falling back to `pagePath` (e.g. `{ 'de-AT': '/content/ueber-uns-oesterreich' }`).
 * @returns Array of hreflang link objects for the `<head>`.
 */
export function buildCmsHreflangs(params: {
  pagePath: string
  storefront: StorefrontContext
  origin: string
  alternatePagePaths?: Record<string, string>
}): Hreflang[] {
  const { pagePath, storefront, origin, alternatePagePaths } = params

  // Only the per-country path resolution is CMS knowledge; the emission rule
  // (one alternate per country, x-default on the default) lives in the SDK's
  // `composeHreflangs` so it cannot drift from the PDP/PLP behavior.
  const paths = storefront.config.countries.map((country) => {
    const countryPath = 'path' in country ? country.path : undefined
    // `split` always returns at least one element.
    const languageCode = country.locale.split('-')[0]!
    const path =
      alternatePagePaths?.[country.locale] ||
      alternatePagePaths?.[languageCode] ||
      (countryPath && alternatePagePaths?.[countryPath]) ||
      pagePath
    return {
      shopCountryId: country.shopCountryId,
      path,
    }
  })

  return composeHreflangs(storefront, paths, origin)
}
