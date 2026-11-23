import { Inertia, lazyPromise } from '@scayle/storefront'
import { BaseSearchController } from '@scayle/storefront/controllers'
import type { SearchViewData } from '@scayle/storefront/controllers'
import type { Components, Props } from '@scayle/storefront'
import { createLogger } from '@scayle/storefront/shared'
import type { SEOMeta } from '@shared/types/SEO'
import { getSearchJsonLd, withShopName } from '@server/utils/seo'

const log = createLogger('search')

/**
 * Search results page controller. Extends the SDK base controller for term
 * parsing and empty-term 404 handling, resolves the term to a PDP/PLP
 * redirect in {@link beforeRender}, and supplies listing, filter, and SEO
 * props via the registries.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/discovery/search
 */
export class SearchController extends BaseSearchController<'Search'> {
  /**
   * Number of products fetched per search results page.
   * Change this to use a different page size than the SDK default.
   */
  protected override readonly productsPerPage: number = 32

  /**
   * Whether sold-out products are included in search queries.
   * Set to `true` to keep sold-out products in the results grid.
   */
  protected override readonly includeSoldOut: boolean = false

  /**
   * Whether sellable-for-free products are included in search queries.
   * Set to `true` to include products sellable at zero price.
   */
  protected override readonly includeSellableForFree: boolean = false

  /**
   * Returns the Inertia page component rendered for search results.
   */
  protected override getTemplate(): 'Search' {
    return 'Search'
  }

  /**
   * Resolves a bare first-page search term to a more specific page and
   * redirects there instead of rendering the results page.
   *
   * Only runs on the first page of a main (non-partial) request with no applied
   * filters; when the term resolves to a PDP or PLP it issues a 302, otherwise
   * it falls through and the results page renders. A failed resolve is logged
   * and also falls through, since the redirect is optional and the results
   * page does not depend on it. `inertia.navigate` localizes
   * the resolved link for the active country, and sends an external link (from a
   * search navigation item) with a full page load.
   *
   * @param params Term, page, and filter state parsed from the query string
   * @param params.term The search term
   * @param params.page The 1-based page number
   * @param params.appliedFilters Filters parsed from the query string; the resolve redirect is skipped when any are applied
   * @returns A 302 redirect response when the term resolves, otherwise `undefined`
   */
  protected override async beforeRender({
    term,
    page,
    appliedFilters,
  }: SearchViewData): Promise<Response | undefined> {
    // On the first page without filters, attempt to resolve the term to a
    // more specific page (PDP, PLP) and redirect there instead of rendering.
    if (
      page === 1 &&
      appliedFilters.count === 0 &&
      this.inertia.isMainRequest()
    ) {
      const resolved = await this.services.search
        .resolve(term)
        .catch((error: unknown) => {
          log.error({ message: 'Failed to resolve search term', err: error })
          return undefined
        })
      if (resolved?.link) {
        return this.inertia.navigate(resolved.link, 302)
      }
    }
  }

  /**
   * Builds the title of the results page, which also names the ItemList
   * JSON-LD: the term, plus a page suffix beyond the first page.
   *
   * @param params Term and page parsed from the query string
   * @param params.term The search term
   * @param params.page The 1-based page number
   * @returns The localized results title
   */
  private getListName({ term, page }: SearchViewData): string {
    const i18n = this.mappers.i18n
    const pageSuffix =
      page > 1
        ? ` - ${i18n.t('product_list_page.meta.page', { pageNumber: page })}`
        : ''

    return `${i18n.t('search_page.meta.title', { term })}${pageSuffix}`
  }

  /**
   * Builds the search page head meta: the results title with the shop name,
   * and `noindex, nofollow`, since results pages are not meant for the search
   * index. A `noindex` page gets no canonical link, like the product listing
   * page variants. With its default whitelist, `buildCanonicalUrl` would also
   * point every results page at the bare search path, which renders a 404. To
   * add one, pass `['filters[term]', 'page']` as the whitelist.
   *
   * @param params Term and page parsed from the query string
   * @returns SEOMeta for the `PageMetaHead` component
   */
  protected async getMeta(params: SearchViewData): Promise<SEOMeta> {
    const shopName = await this.services.shopConfig.getShopName()

    return {
      title: withShopName(
        this.mappers.i18n,
        this.getListName(params),
        shopName,
      ),
      robots: 'noindex, nofollow',
    }
  }

  /**
   * Builds the Inertia props for the search results page.
   *
   * Shares one lazily-fetched products promise between the eager `products`
   * prop and the server-only `jsonLd`; `filters` is deferred, except for a
   * rejected term, which has none to load. The fetch is
   * deferred until one of those props is evaluated and runs at most once, so
   * a partial reload of an unrelated prop does not trigger it.
   *
   * @param params Term, page, and filter state parsed from the query string
   * @returns The props passed to the `Search` page component
   */
  protected override getViewProps(
    params: SearchViewData,
  ): Props<Components['Search']> {
    const getProducts = lazyPromise(() => this.fetchSearchProducts(params))
    const termRejected = this.isTermRejected(params.term)

    return {
      term: params.term,
      /** True when the search provider rejects the term, so the fetches skip it and the page shows a hint. */
      termRejected,
      appliedFilters: params.appliedFilters,
      // Eager, because the selector shares the header row with the filter
      // toggle and must not shift it in. A lazy closure, so partial reloads of
      // the results skip it; the lookup is cached per shop.
      imageViewOptions: () => this.services.attributes.fetchImageViewOptions(),
      products: async () => {
        const { products } = await getProducts()
        return products
      },
      pagination: async () => {
        const { pagination } = await getProducts()
        return pagination
      },
      meta: () => this.getMeta(params),
      /** ItemList of the result products for crawlers, which read only the server-rendered HTML. */
      jsonLd: Inertia.serverOnly(async () => {
        const { products } = await getProducts()

        return getSearchJsonLd({
          products,
          storefront: this.storefront,
          origin: this.request.origin,
          listName: this.getListName(params),
        })
      }),
      /** Unguarded by `<Deferred>`, so a rejection degrades to an absent filter panel. Eager `[]` for a rejected term, so the client skips the partial reload. */
      filters: termRejected
        ? []
        : Inertia.defer(() => this.fetchSearchFilters(params), {
            group: 'filters',
          }),
    }
  }
}
