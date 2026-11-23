import { BaseProductListingController } from '@scayle/storefront/controllers'
import { getValidAccessToken, Inertia, lazyPromise } from '@scayle/storefront'
import type { ProductListingViewData } from '@scayle/storefront/controllers'
import { buildCanonicalUrl, createLogger } from '@scayle/storefront/shared'
import type { Components, Props } from '@scayle/storefront'
import type { Category } from '@scayle/storefront/types'
import { CMSContentNotFoundError } from '@scayle/storefront/cms'
import type { CMSPageMeta } from '@scayle/storefront/cms'
import type { SEOMeta } from '@shared/types/SEO'
import { getProductListingJsonLd, withShopName } from '@server/utils/seo'
import { getPageMeta } from '@cms-server/service'
import type { CMSPageData } from '@cms-shared'
import type { Promisable } from 'type-fest'

const log = createLogger('product-listing')

/**
 * Product listing page controller. Extends the SDK base controller for category
 * fetch, canonical redirect, and URL param parsing, and supplies tenant-specific
 * props (listing, deferred filters, meta, server-only hreflangs and JSON-LD,
 * navigation, CMS).
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/browsing/product-listing-page
 */
export class ProductListingController extends BaseProductListingController<'ProductListing'> {
  /**
   * Number of products fetched per listing page.
   * Change this to use a different page size than the SDK default.
   */
  protected override readonly productsPerPage: number = 32

  /**
   * Whether sold-out products are included in listing queries.
   * Set to `true` to keep sold-out products in the product grid. The filter
   * counts follow automatically, because the base controller passes this flag
   * to both the product fetch and the filter fetch.
   */
  protected override readonly includeSoldOut: boolean = false

  /**
   * Whether sellable-for-free products are included in listing queries.
   * Set to `true` to include products sellable at zero price.
   */
  protected override readonly includeSellableForFree: boolean = false

  /**
   * Returns the Inertia page for this category.
   *
   * Override to choose a different page from category attributes (e.g. brand
   * vs standard PLP). Always called with a resolved category after the not-found
   * guard in the base `view()`.
   *
   * @param _category Mapped category for the current request
   * @returns Inertia page component name
   */
  protected override getTemplate(_category: Category): 'ProductListing' {
    return 'ProductListing'
  }

  /**
   * Runs before the category is fetched. Nothing is resolved yet.
   *
   * Override to short-circuit (redirect, auth gate) before the SAPI category
   * call. Return a `Response` to stop the lifecycle, or `undefined` to continue.
   *
   * @returns Response to short-circuit, or `undefined` to continue
   */
  protected override beforeFetch(): Promisable<Response | undefined> {
    return super.beforeFetch()
  }

  /**
   * Runs after category and listing state are resolved and before `ctx.render()`.
   *
   * Override to short-circuit from category or filter state. Return a `Response`
   * to stop the lifecycle, or `undefined` to continue.
   *
   * @param data Resolved category and URL-derived listing state
   * @returns Response to short-circuit, or `undefined` to continue
   */
  protected override beforeRender(
    data: ProductListingViewData,
  ): Promisable<Response | undefined> {
    return super.beforeRender(data)
  }

  /**
   * Fetches the CMS content for a category listing page. Most categories carry
   * no CMS content, so a `CMSContentNotFoundError` resolves to `undefined`
   * rather than being logged; any other provider error is logged and also
   * resolves to `undefined`, so a CMS outage costs the teaser, not the page.
   *
   * @param category Category the listing page renders
   * @returns CMS content for the category, or undefined when there is none
   */
  private async fetchCMSContent(
    category: Category,
  ): Promise<CMSPageData | undefined> {
    try {
      // The `cms` registry slot is provider-agnostic, so the fetch returns an
      // untyped payload. The provider this application registers produces
      // `CMSPageData` (resolved per `CMS_PROVIDER` via `@cms-shared`).
      const content = await this.services.cms.fetchListingPageData(
        category.id,
        this.request,
      )
      return content as CMSPageData | undefined
    } catch (error) {
      if (error instanceof CMSContentNotFoundError) {
        return undefined
      }

      log.error({
        message: 'Unexpected CMS error on PLP',
        err: error,
        categoryId: category.id,
      })
    }
  }

  /**
   * Builds the listing title: the category name followed by its ancestors,
   * plus a page suffix beyond the first page. Used in the head title and as
   * the ItemList JSON-LD name.
   *
   * @param category Category the listing page renders
   * @param page The 1-based page number
   * @returns The listing title without the shop name
   */
  private getListingTitle(category: Category, page: number): string {
    const baseTitle = [
      category.name,
      ...category.breadcrumbs.map((b) => b.value),
    ].join(' - ')

    const pageSuffix =
      page > 1
        ? ` - ${this.mappers.i18n.t('product_list_page.meta.page', { pageNumber: page })}`
        : ''

    return `${baseTitle}${pageSuffix}`
  }

  /**
   * Builds the PLP head meta: title, description, canonical link, robots, and
   * the Open Graph image.
   *
   * Only the first page with the default sort and no filters is indexable, so
   * every other variant gets `noindex, follow` and no canonical link.
   *
   * @param data Resolved category and URL-derived listing state
   * @param data.category Category the listing page renders
   * @param data.page The 1-based page number
   * @param data.sorting Resolved sorting; only the default sort is indexable
   * @param data.appliedFilters Filters parsed from the query string; a filtered
   *   listing is not indexable
   * @param cmsMeta Meta of the category's CMS content, the source of the Open
   *   Graph image, or `undefined` when the category has none
   * @returns SEOMeta for the `PageMetaHead` component. The title has no shop
   *   name suffix and the description is left out when the shop configuration
   *   could not be read, since the shop name sits mid-sentence.
   */
  protected async getMeta(
    { category, page, sorting, appliedFilters }: ProductListingViewData,
    cmsMeta: CMSPageMeta | undefined,
  ): Promise<SEOMeta> {
    const i18n = this.mappers.i18n
    const shopName = await this.services.shopConfig.getShopName()
    const isIndexableListingPage =
      page === 1 && sorting.isDefaultSortSelected && appliedFilters.count === 0

    return {
      title: withShopName(
        i18n,
        i18n.t('product_list_page.meta.title', {
          listingTitle: this.getListingTitle(category, page),
        }),
        shopName,
      ),
      description: shopName
        ? i18n.t('product_list_page.meta.description', {
            category: category.name,
            shopName,
          })
        : undefined,
      canonicalLink: isIndexableListingPage
        ? buildCanonicalUrl(this.request.url.href)
        : undefined,
      robots: isIndexableListingPage ? 'index, follow' : 'noindex, follow',
      image: cmsMeta?.image,
    }
  }

  protected override getViewProps(
    props: ProductListingViewData,
  ): Props<Components['ProductListing']> {
    const { category, page, appliedFilters, sorting } = props
    // The navigations carry the customer's segments, like the category itself.
    // A cacheable render has no customer, so it sends none.
    const customerToken = getValidAccessToken(this.request.session)

    const cmsContentPromise = lazyPromise(() => this.fetchCMSContent(category))

    // We use a lazy promise here so we make sure products are only fetched when also one of the Inertia props need it
    const productsPromise = lazyPromise(() => this.fetchProducts(props))

    return {
      category,
      meta: async () => {
        const cmsContent = await cmsContentPromise()
        return this.getMeta(
          props,
          cmsContent ? getPageMeta(cmsContent) : undefined,
        )
      },
      filters: Inertia.defer(() => this.fetchFilters(props), {
        group: 'filters',
      }),
      appliedFilters,
      sorting,
      // Eager, because the selector shares the header row with sorting and
      // must not shift it in. A lazy closure, so partial reloads of the
      // listing skip it; the lookup is cached per shop.
      imageViewOptions: () => this.services.attributes.fetchImageViewOptions(),
      products: async () => {
        const { products } = await productsPromise()
        return products
      },
      pagination: async () => {
        const { pagination } = await productsPromise()
        return pagination
      },
      listNavigationCategories: () =>
        this.services.categoryNavigation.fetchListNavigation(category.id, {
          showEmptyCategories: false,
          customerToken,
        }),
      treeNavigationCategories: () =>
        this.services.categoryNavigation.fetchTreeNavigation(category.id, {
          showEmptyCategories: false,
          customerToken,
        }),
      hreflangs: Inertia.serverOnly(() =>
        this.services.productListing.fetchCategoryHreflangs(category.id),
      ),
      /** ItemList of the page's products and BreadcrumbList for crawlers, which read only the server-rendered HTML. */
      jsonLd: Inertia.serverOnly(async () => {
        const { products } = await productsPromise()
        return getProductListingJsonLd({
          category,
          products,
          storefront: this.storefront,
          origin: this.request.origin,
          listingName: this.getListingTitle(category, page),
        })
      }),
      cmsContent: () => cmsContentPromise(),
    }
  }
}
