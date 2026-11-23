import type { ShopConfiguration } from '@scayle/storefront-api'
import { ShopConfigMapper } from '@scayle/storefront/mappers'
import type { ShopConfig } from '@scayle/storefront/types'
import type { MapperRegistry, StorefrontContext } from '@scayle/storefront'
import { formatCurrency } from '@shared/utils/formatter'
import type { DeliveryCosts } from '@shared/types/customData'
import type { ServerI18nService } from '../i18n'

/**
 * Maps SCAYLE shop configuration data to the application `ShopConfig`.
 *
 * Extends the tenant-invariant base {@link ShopConfigMapper} and layers the only
 * tenant-specific concern: `deliveryCost`, derived from Panel custom data with a
 * localized fallback. Registered on the `shopConfig` mapper-registry slot and
 * used by `ShopConfigService` for server-rendered shop data.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/extending-sdk
 */
export class ShopConfigMapperService extends ShopConfigMapper {
  private readonly i18nService: ServerI18nService

  constructor(context: StorefrontContext, mappers: MapperRegistry) {
    super(context)
    this.i18nService = mappers.i18n
  }

  /**
   * Maps raw shop configuration data, reusing the base mapping and adding the
   * basket delivery copy.
   *
   * @param shopConfig Raw shop configuration response
   * @returns Shop configuration with display name and basket delivery copy
   */
  public override mapShopConfig(shopConfig: ShopConfiguration): ShopConfig {
    return {
      ...super.mapShopConfig(shopConfig),
      deliveryCost: this.mapDeliveryCost(shopConfig.customData?.deliveryCosts),
    }
  }

  /**
   * Maps the Panel delivery costs for the basket summary, falling back to the
   * default copy ("from" a zero amount, fees determined during checkout) when
   * the Panel has no usable value. The basket also calls it with no argument
   * when the shop configuration cannot be read, so both cases show the same
   * copy.
   *
   * @param deliveryCosts Delivery costs from the shop country custom data, if any
   * @returns The Panel value and disclaimer when both are non-empty strings,
   *   otherwise the default copy
   */
  public mapDeliveryCost(deliveryCosts?: DeliveryCosts): DeliveryCosts {
    if (
      typeof deliveryCosts?.value === 'string' &&
      typeof deliveryCosts?.disclaimer === 'string' &&
      deliveryCosts.value &&
      deliveryCosts.disclaimer
    ) {
      return {
        value: deliveryCosts.value,
        disclaimer: deliveryCosts.disclaimer,
      }
    }

    return {
      value: this.i18nService.t('price.starting_from_with_amount', {
        amount: formatCurrency(0, this.context.country),
      }),
      disclaimer: this.i18nService.t('basket_summary.delivery_fees'),
    }
  }
}
