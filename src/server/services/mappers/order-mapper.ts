import { getFirstAttributeValue } from '@scayle/storefront/shared'
import type { OrderResponse, OrderProduct } from '@scayle/storefront/types'
import { OrderMapper } from '@scayle/storefront/mappers'
import { buildProductDetailRoute } from '@shared/routes'
import { mapImage } from '@server/utils/image'
import {
  ATTRIBUTE_KEY_BRAND,
  ATTRIBUTE_KEY_COLOR,
  ATTRIBUTE_KEY_NAME,
} from '@shared/constants/attributeKeys'
import { formatDate } from '@shared/utils/formatter'

type OrderItemResponse = OrderResponse['items'][number]
type ProductResponse = OrderItemResponse['product']

/**
 * Application order mapper. Extends the SDK {@link OrderMapper} for the
 * tenant-invariant shape and layers tenant-specific product links and CDN image
 * URLs on top.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/extending-sdk
 */
export class OrderMapperService extends OrderMapper {
  protected override formatDate(date: Date): string | undefined {
    return formatDate(date, this.context.country.locale)
  }

  protected override mapProduct(product: ProductResponse): OrderProduct {
    const nameValue = getFirstAttributeValue(
      product.attributes,
      ATTRIBUTE_KEY_NAME,
    )
    const brandValue = getFirstAttributeValue(
      product.attributes,
      ATTRIBUTE_KEY_BRAND,
    )
    const colorValue = getFirstAttributeValue(
      product.attributes,
      ATTRIBUTE_KEY_COLOR,
    )

    const name = nameValue?.label ?? product.name ?? ''
    const brand = brandValue?.label ?? ''
    const color = colorValue?.label ?? ''

    const firstImage = product.images?.[0]

    return {
      id: product.id,
      name,
      link: buildProductDetailRoute(product.id, name),
      brand,
      color,
      image: firstImage ? mapImage(firstImage) : undefined,
    }
  }
}
