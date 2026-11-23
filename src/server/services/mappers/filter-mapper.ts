import { FilterMapper } from '@scayle/storefront/mappers'
import type { FilterItemWithValues } from '@scayle/storefront-api'
import type { Filter } from '@scayle/storefront/types'
import type { StorefrontContext } from '@scayle/storefront'

/**
 * Application filter mapper for product listing facets.
 * Inherits tenant-invariant mapping from the SDK {@link FilterMapper}.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/extending-sdk
 */
export class FilterMapperService extends FilterMapper {
  // Pass-through constructor and overrides: this is the tenant extension point
  // for filter mapping. Keep them even though they currently forward to the
  // base class unchanged, so a tenant customizing this mapper has a method to
  // add logic to instead of writing a new subclass.
  constructor(context: StorefrontContext) {
    super(context)
  }

  public override mapFilters(filters: FilterItemWithValues[]): Filter[] {
    return super.mapFilters(filters)
  }
  public override mapFilter(filter: FilterItemWithValues): Filter {
    return super.mapFilter(filter)
  }
}
