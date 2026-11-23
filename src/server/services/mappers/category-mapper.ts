import type {
  CategoryByIdEndpointParameters,
  Category as StorefrontAPICategory,
} from '@scayle/storefront-api'
import { SALE_PROPERTY_NAME } from '@scayle/storefront'
import { CategoryMapper } from '@scayle/storefront/mappers'
import { buildProductListingRoute } from '@shared/routes'

/**
 * Maps category data from the Storefront API to the application `Category` type.
 * Extends the SDK {@link CategoryMapper} and adds the tenant route scheme via
 * {@link buildProductListingRoute}.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/extending-sdk
 */
export class CategoryMapperService extends CategoryMapper {
  /**
   * Category includes for the product listing page: the parents for the
   * breadcrumbs, the sale property, and the product sorting for the default
   * sort option.
   */
  public override get Includes(): CategoryByIdEndpointParameters['with'] {
    return {
      parents: 'all',
      properties: { withName: [SALE_PROPERTY_NAME] },
      includeProductSorting: true,
    }
  }

  /**
   * Category includes for the tree and list navigation: only the sale
   * property. The parents and the product sorting stay on {@link Includes},
   * since the navigation nodes read neither.
   */
  public override get NavigationIncludes(): CategoryMapper['NavigationIncludes'] {
    return {
      properties: { withName: [SALE_PROPERTY_NAME] },
    }
  }

  /**
   * Resolves the product listing URL path for a category (e.g. `/c/women/shoes-42`).
   *
   * @param category Category id and url path segment
   * @returns URL path segment for the category listing page
   */
  public override getPath(
    category: Pick<StorefrontAPICategory, 'id' | 'path'>,
  ): string {
    return buildProductListingRoute(category.id, category.path)
  }
}
