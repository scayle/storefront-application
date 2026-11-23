import type { AttributeGroupMulti } from '@scayle/storefront-api'
import { AttributeService } from '@scayle/storefront/services'
import { ATTRIBUTE_KEY_IMAGE_TYPE } from '@shared/constants/attributeKeys'
import type { ImageViewOption } from '@shared/types/ImageView'

/**
 * Maps the `imageType` attribute group to the image views the PLP and the
 * Search Results Page offer, in the order the Storefront API delivers them.
 * The labels pass through as delivered, already translated in the Panel. The
 * default view is not part of the list; the client adds it.
 */
function mapImageViewOptions(
  group: AttributeGroupMulti | null,
): ImageViewOption[] {
  return (group?.values ?? []).flatMap(({ value, label }) =>
    // The Storefront API types `value` as optional. A value without one has no
    // stable key to put in the URL or to match against an image.
    value ? [{ value, label }] : [],
  )
}

/**
 * Extends the SDK `AttributeService` with the attribute lookups this shop's
 * pages need. Registered on the `attributes` service slot, so controllers read
 * it as `this.services.attributes`. Add a method here when another feature
 * reads an attribute group.
 *
 * Every lookup goes through the inherited `fetchAttributeGroup`, which caches
 * the raw Storefront API response per shop, including when the shop has no
 * such group. Only the mapping happens here, on every call.
 *
 * @example
 * ```ts
 * // in a controller
 * imageViewOptions: () => this.services.attributes.fetchImageViewOptions(),
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/extending-sdk
 */
export class ShopAttributeService extends AttributeService {
  /**
   * Fetches the image views the shop offers for the image view selector on
   * the PLP and the Search Results Page.
   *
   * @returns One option per `imageType` attribute value with a stable value,
   *   in Storefront API order. Empty when the shop has no such group or the
   *   lookup fails, which hides the selector.
   */
  public async fetchImageViewOptions(): Promise<ImageViewOption[]> {
    return mapImageViewOptions(
      await this.fetchAttributeGroup(ATTRIBUTE_KEY_IMAGE_TYPE),
    )
  }
}
