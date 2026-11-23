import type {
  Product as StorefrontAPIProduct,
  Variant as StorefrontAPIVariant,
  ProductImage as StorefrontAPIProductImage,
  ProductImageWith,
  ProductWith,
  VariantWith,
} from '@scayle/storefront-api'
import { ProductMapper } from '@scayle/storefront/mappers'
import { getFirstAttributeValue } from '@scayle/storefront/shared'
import { SUBSCRIPTION_ATTRIBUTE_KEYS } from '@scayle/storefront'
import type {
  ListingProduct,
  DetailedProduct,
  ProductImage,
  ProductVariant,
  ProductSibling,
  ProductVideo,
} from '@scayle/storefront/types'
import type { ProductDetailSection } from '@shared/types/Product'
import { mapImage as buildImage } from '@server/utils/image'
import { buildProductDetailRoute } from '@shared/routes'
import { getAttributeGroupByTypes } from '@server/utils/product'
import {
  ATTRIBUTE_KEY_APPLY_PADDING,
  ATTRIBUTE_KEY_BRAND,
  ATTRIBUTE_KEY_COLOR,
  ATTRIBUTE_KEY_DESCRIPTION,
  ATTRIBUTE_KEY_DESIGN,
  ATTRIBUTE_KEY_EXTRAS,
  ATTRIBUTE_KEY_FIT_SIZE,
  ATTRIBUTE_KEY_IMAGE_TYPE,
  ATTRIBUTE_KEY_NAME,
  ATTRIBUTE_KEY_PROMOTION,
  ATTRIBUTE_KEY_SIZE,
  ATTRIBUTE_KEY_STOREFRONT_BADGE,
} from '@shared/constants/attributeKeys'
import { VISIBLE_PAGE_COUNT } from '@shared/constants/pagination'
import { MAX_GALLERY_VIDEOS } from '@shared/constants/productGallery'
import { LOW_STOCK_THRESHOLD } from '@server/constants'

/**
 * The single application product mapper. Extends the SDK {@link ProductMapper},
 * implementing the tenant-coupled hooks (route building, responsive images,
 * Storefront API includes) and layering the tenant fields (color,
 * badge, variant label, detail sections) on top of the base map methods. Serves
 * both the PLP (`mapProduct`) and the PDP (`mapDetailedProduct`).
 *
 * Registered in the `product` mapper registry slot, which `MapperOverrides`
 * retypes to this class so the basket mapper can read {@link VariantIncludes}.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/extending-sdk
 */
export class ProductMapperService extends ProductMapper {
  protected override visiblePageCount: number = VISIBLE_PAGE_COUNT

  protected override readonly lowStockThreshold: number = LOW_STOCK_THRESHOLD

  /**
   * Minimal product includes for listings (PLP, recommendations, wishlist,
   * basket, search, CMS product sliders). Requests only the attribute keys
   * used by the listing and sibling mappers.
   */
  public override get Includes(): ProductWith {
    return {
      attributes: {
        withKey: [
          ATTRIBUTE_KEY_NAME,
          ATTRIBUTE_KEY_BRAND,
          ATTRIBUTE_KEY_COLOR,
          ATTRIBUTE_KEY_STOREFRONT_BADGE,
          ATTRIBUTE_KEY_PROMOTION,
        ],
      },
      priceRange: true,
      lowestPriorPrice: true,
      images: this.ImageIncludes,
      variants: { stock: {} },
      sellableTimeframe: true,
      siblings: {
        attributes: {
          withKey: [
            ATTRIBUTE_KEY_NAME,
            ATTRIBUTE_KEY_BRAND,
            ATTRIBUTE_KEY_COLOR,
          ],
        },
        images: this.ImageIncludes,
      },
    }
  }

  /**
   * Image includes for every image this mapper maps through `mapImage`: the
   * product images and the sibling images of {@link Includes} and
   * {@link DetailedIncludes}. Requests the two image attributes `mapImage`
   * reads, the padding flag and the image view.
   */
  protected get ImageIncludes(): ProductImageWith {
    return {
      attributes: {
        withKey: [ATTRIBUTE_KEY_APPLY_PADDING, ATTRIBUTE_KEY_IMAGE_TYPE],
      },
    }
  }

  /**
   * Variant includes for every variant this mapper maps through `mapVariant`:
   * the PDP variants in {@link DetailedIncludes} (which the gift flow reuses)
   * and the basket's line variants. Requests the size attribute the
   * `mapVariant` override reads plus the subscription attributes the SDK base
   * mapper reads.
   */
  public get VariantIncludes(): VariantWith {
    return {
      stock: {},
      attributes: {
        withKey: [ATTRIBUTE_KEY_SIZE, ...SUBSCRIPTION_ATTRIBUTE_KEYS],
      },
      price: {},
      lowestPriorPrice: true,
    }
  }

  /**
   * Full product includes for the PDP, reused by the gift flow. Videos request
   * no `attributes` or `customData` selector, since the gallery and the JSON-LD
   * read only each video's URL.
   */
  public override get DetailedIncludes(): ProductWith {
    return {
      attributes: 'all',
      variants: this.VariantIncludes,
      priceRange: true,
      lowestPriorPrice: true,
      images: this.ImageIncludes,
      videos: {},
      sellableTimeframe: true,
      categories: {
        properties: {
          withName: [],
        },
      },
      siblings: {
        attributes: {
          withKey: [
            ATTRIBUTE_KEY_NAME,
            ATTRIBUTE_KEY_BRAND,
            ATTRIBUTE_KEY_COLOR,
          ],
        },
        images: this.ImageIncludes,
      },
    }
  }

  /** Minimal includes for hreflang link queries: the name attribute `getPath` reads. */
  public override get HreflangIncludes(): ProductWith {
    return {
      attributes: {
        withKey: [ATTRIBUTE_KEY_NAME],
      },
    }
  }

  public override getPath(product: StorefrontAPIProduct): string {
    const name =
      getFirstAttributeValue(product.attributes, ATTRIBUTE_KEY_NAME)?.label ??
      ''
    return buildProductDetailRoute(product.id, name)
  }

  protected override mapImage(image: StorefrontAPIProductImage): ProductImage {
    return buildImage(image)
  }

  public override mapProduct(product: StorefrontAPIProduct): ListingProduct {
    const base = super.mapProduct(product)
    return {
      ...base,
      color:
        getFirstAttributeValue(product.attributes, ATTRIBUTE_KEY_COLOR)
          ?.label ?? '',
      badge: getFirstAttributeValue(
        product.attributes,
        ATTRIBUTE_KEY_STOREFRONT_BADGE,
      )?.label,
    }
  }

  public override mapDetailedProduct(
    product: StorefrontAPIProduct,
  ): DetailedProduct {
    const base = super.mapDetailedProduct(product)
    const description = getFirstAttributeValue(
      product.attributes,
      ATTRIBUTE_KEY_DESCRIPTION,
    )?.label
    return {
      ...base,
      color:
        getFirstAttributeValue(product.attributes, ATTRIBUTE_KEY_COLOR)
          ?.label ?? '',
      badge: getFirstAttributeValue(
        product.attributes,
        ATTRIBUTE_KEY_STOREFRONT_BADGE,
      )?.label,
      details: this.buildProductDetails(product, description),
      description,
    }
  }

  public override mapVariant(variant: StorefrontAPIVariant): ProductVariant {
    return {
      ...super.mapVariant(variant),
      label:
        getFirstAttributeValue(variant.attributes, ATTRIBUTE_KEY_SIZE)?.label ??
        '',
    }
  }

  public override mapSibling(sibling: StorefrontAPIProduct): ProductSibling {
    return {
      ...super.mapSibling(sibling),
      color:
        getFirstAttributeValue(sibling.attributes, ATTRIBUTE_KEY_COLOR)
          ?.label ?? '',
    }
  }

  /**
   * Caps the mapped videos at {@link MAX_GALLERY_VIDEOS} so the gallery and
   * JSON-LD consume one already-limited list. Extra Storefront API videos are
   * dropped here, not later in the client or SEO builder.
   *
   * @param product Raw product from the Storefront API.
   * @returns Mapped videos in Storefront API order, at most {@link MAX_GALLERY_VIDEOS}.
   */
  protected override mapVideos(product: StorefrontAPIProduct): ProductVideo[] {
    return super.mapVideos(product).slice(0, MAX_GALLERY_VIDEOS)
  }

  /**
   * Builds the localized PDP detail sections (fit & size, extras, design) in
   * display order. The product description (when available) is attached to the
   * design section as `intro` so the client renders it without knowing which
   * section owns it. Sections with no matching attributes are omitted so the
   * client never renders an empty accordion entry.
   *
   * @param product The product to derive detail sections from.
   * @param description Product description used as the design section's intro.
   * @returns Ordered list of renderable product detail sections (empty when none match).
   */
  private buildProductDetails(
    product: StorefrontAPIProduct,
    description: string | undefined,
  ): ProductDetailSection[] {
    const sections: ProductDetailSection[] = [
      {
        key: ATTRIBUTE_KEY_FIT_SIZE,
        label: this.mappers.i18n.t('product_details.information.fit_size'),
        content: getAttributeGroupByTypes(
          product.attributes,
          ATTRIBUTE_KEY_FIT_SIZE,
        ),
      },
      {
        key: ATTRIBUTE_KEY_EXTRAS,
        label: this.mappers.i18n.t('product_details.information.extras'),
        content: getAttributeGroupByTypes(
          product.attributes,
          ATTRIBUTE_KEY_EXTRAS,
          { prefixLabel: false },
        ),
      },
      {
        key: ATTRIBUTE_KEY_DESIGN,
        label: this.mappers.i18n.t('product_details.information.design'),
        intro: description,
        content: getAttributeGroupByTypes(
          product.attributes,
          ATTRIBUTE_KEY_DESIGN,
        ),
      },
    ]

    return sections.filter((section) => section.content.length > 0)
  }
}
