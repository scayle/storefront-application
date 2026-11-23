import type { ProductImage } from '@scayle/storefront/types'
import type { ProductImage as StorefrontAPIProductImage } from '@scayle/storefront-api'
import { resolveImageUrl } from '@scayle/storefront'
import { getFirstAttributeValue } from '@scayle/storefront/shared'
import {
  ATTRIBUTE_KEY_APPLY_PADDING,
  ATTRIBUTE_KEY_IMAGE_TYPE,
} from '@shared/constants/attributeKeys'

/**
 * Image fields used to build the mapped `ProductImage`. Storefront API product
 * images also carry `url`; order line items only have `hash` and `name`.
 */
type ProductImageInput = Pick<
  StorefrontAPIProductImage,
  'hash' | 'name' | 'attributes' | 'url'
>

/**
 * Checks whether an image asks for a padded container.
 *
 * The attribute flags trimmed (enclosed) assets, which are cropped tight to the
 * product and otherwise sit flush against their frame. SCAYLE has no boolean
 * attribute type, so the attribute is only set when true and its presence is
 * the signal.
 *
 * @param image Product image from the Storefront API or an order line item.
 * @returns `true` when `applyPadding` exists in the image attributes.
 */
export function shouldApplyPadding(image: ProductImageInput): boolean {
  return !!image.attributes && ATTRIBUTE_KEY_APPLY_PADDING in image.attributes
}

/**
 * Maps one Storefront API image to the shared `ProductImage` shape: the absolute
 * CDN base URL, the padding flag and the image view the image belongs to. The
 * responsive `src`/`srcSet`/`sizes` are built on the client from this `url`
 * and a preset, so the payload ships a single URL per image instead of
 * expanded variants.
 *
 * @param image Product image from the Storefront API or an order line item.
 * @returns Mapped product image
 */
export function mapImage(image: ProductImageInput): ProductImage {
  return {
    url: image.url || resolveImageUrl(image.hash),
    name: image.name,
    applyPadding: shouldApplyPadding(image),
    imageType: getFirstAttributeValue(
      image.attributes,
      ATTRIBUTE_KEY_IMAGE_TYPE,
    )?.value,
  }
}
