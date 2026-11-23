import type { SearchV2With } from '@scayle/storefront-api'
import { SALE_PROPERTY_NAME } from '@scayle/storefront'
import { SearchMapper } from '@scayle/storefront/mappers'
import { buildSearchRoute } from '@shared/routes'

/**
 * Tenant search mapper. Inherits the tenant-invariant suggestion/resolve mapping
 * from the SDK {@link SearchMapper} and supplies the tenant search-results route.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/extending-sdk
 */
export class SearchMapperService extends SearchMapper {
  /**
   * Search includes for suggestions and resolve: the listing product includes,
   * and for each category the parents for the breadcrumb trail on category
   * suggestions plus the sale property.
   */
  public override get Includes(): SearchV2With {
    return {
      product: this.mappers.product.Includes,
      categories: { parents: 'all', properties: [SALE_PROPERTY_NAME] },
    }
  }

  /**
   * Resolves the tenant search-results page URL for a term.
   *
   * @param term Search term to encode into the URL
   * @returns Site-relative search-results URL
   */
  public override getSearchResultsPath(term: string): string {
    return buildSearchRoute(term)
  }
}
