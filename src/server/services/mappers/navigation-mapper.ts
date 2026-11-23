import type { NavigationV2Items } from '@scayle/storefront-api'
import { NavigationMapper } from '@scayle/storefront/mappers'
import type { NavigationItem } from '@scayle/storefront/types'

/**
 * Maps Storefront API navigation items to the application `NavigationItem`.
 *
 * Extends the tenant-invariant base {@link NavigationMapper} and layers the
 * tenant-specific `customData`-derived `linkColor` / `disabled` fields. The SVG
 * icon and category-link resolution are handled by the base mapper, so this
 * subclass only adds the genuinely tenant-specific fields.
 *
 * @example
 * ```ts
 * const mapper = new NavigationMapperService(context, mappers)
 * const header = mapper.mapNavigationToHeader(tree)
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/extending-sdk
 */
export class NavigationMapperService extends NavigationMapper {
  /**
   * Navigation includes for the header and footer trees: the category behind
   * each category target, which the category links read.
   */
  public override get Includes(): NavigationMapper['Includes'] {
    return { category: true }
  }

  /**
   * Maps a single navigation item, reusing the base mapping and adding the
   * tenant-specific `linkColor` and `disabled` fields.
   *
   * @param item Raw navigation item from the Storefront API.
   * @returns The mapped `NavigationItem` including custom-data fields.
   */
  public override mapNavigationItem(
    item: NavigationV2Items[number],
  ): NavigationItem {
    return {
      ...super.mapNavigationItem(item),
      linkColor: item.customData?.linkColor,
      disabled: !!item.customData?.disabledLink,
    }
  }
}
