/**
 * Storefront API attribute keys consumed by server-side product/sibling/order
 * mappers and the PDP information block on the client. Centralizing them keeps
 * `getFirstAttributeValue(...)`, `getAttributeValuesByName(...)` calls and
 * `withKey` includes consistent and makes attribute-key changes easy to audit.
 *
 * Lives in `@shared/constants/` so both server mappers and client templates
 * (e.g. `SFProductDetails.vue`) can import the same source of truth.
 */

/** Product display name (used by all product mappers). */
export const ATTRIBUTE_KEY_NAME = 'name'

/** Product brand label (used by all product mappers). */
export const ATTRIBUTE_KEY_BRAND = 'brand'

/** Product color label (PDP, PLP, sibling mapper, order mapper). */
export const ATTRIBUTE_KEY_COLOR = 'color'

/** Storefront badge label (PDP, PLP). */
export const ATTRIBUTE_KEY_STOREFRONT_BADGE = 'storefrontBadge'

/** Product description (PDP). */
export const ATTRIBUTE_KEY_DESCRIPTION = 'description'

/** Variant size label (PDP, gift, order mappers). */
export const ATTRIBUTE_KEY_SIZE = 'size'

/** Promotion attribute (PLP includes — used by promotion resolution). */
export const ATTRIBUTE_KEY_PROMOTION = 'promotion'

/**
 * Image attribute flagging that the image container should be padded. Set on
 * trimmed (enclosed) assets, which are cropped tight to the product and otherwise
 * sit flush against their frame.
 */
export const ATTRIBUTE_KEY_APPLY_PADDING = 'applyPadding'

/**
 * Image attribute naming the image view an image belongs to (PLP and Search
 * Page image view selector). At most one value per image; its values are read
 * at request time, so the Storefront Application holds no list of them.
 */
export const ATTRIBUTE_KEY_IMAGE_TYPE = 'imageType'

/** PDP information section: fit-and-size details. */
export const ATTRIBUTE_KEY_FIT_SIZE = 'fit_size'

/** PDP information section: extras / care instructions. */
export const ATTRIBUTE_KEY_EXTRAS = 'extras'

/** PDP information section: design / styling notes. */
export const ATTRIBUTE_KEY_DESIGN = 'design'
