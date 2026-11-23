import type { SearchService } from '@scayle/storefront/services'
import type { ShopAttributeService } from '../services/attribute-service'
import type { ServerI18nService } from '../services/i18n'
import type { ProductMapperService } from '../services/mappers/product-mapper'
import type { PromotionMapperService } from '../services/mappers/promotion-mapper'
import type { ShopConfigMapperService } from '../services/mappers/shop-config-mapper'

declare module '@scayle/storefront' {
  /**
   * Per-request mapper registry slots this shop declares. Merged over the SDK's
   * `DefaultMapperRegistry` to produce `MapperRegistry`, which the registry
   * middleware resolves and exposes as `ctx.get('mappers')`.
   *
   * A key the SDK does not ship is added; a key it does ship is retyped to the
   * subclass `registries.ts` registers, which is what lets a controller call a
   * method this shop added without a type assertion.
   */
  export interface MapperOverrides {
    /**
     * Retypes the SDK `promotion` slot to this shop's subclass, which adds
     * `mapPromotionForSummary` for the basket promotion summary.
     */
    promotion: PromotionMapperService
    /**
     * Retypes the SDK `product` slot to this shop's subclass, which adds
     * `VariantIncludes` so the basket requests its line variants with the same
     * selection as the PDP.
     */
    product: ProductMapperService
    /**
     * Retypes the SDK `shopConfig` slot to this shop's subclass, which adds
     * `mapDeliveryCost` so the basket can show the default delivery copy when
     * the shop configuration cannot be read.
     */
    shopConfig: ShopConfigMapperService
    /**
     * Translates message keys for the request locale. It sits in the mapper
     * registry rather than the service registry because mappers are its main
     * consumers and mapper factories only receive `{ storefront, mappers }`.
     */
    i18n: ServerI18nService
  }

  /**
   * Per-request service registry slots this shop declares. Merged over the SDK's
   * `DefaultServiceRegistry` to produce `ServiceRegistry`, resolved by the
   * registry middleware and exposed as `ctx.get('services')`.
   *
   * `cms` is deliberately absent: the SDK already ships that slot with the same
   * type, so re-declaring it here would add nothing.
   */
  export interface ServiceOverrides {
    /** Fetches search suggestions and resolve redirects. */
    search: SearchService
    /**
     * Retypes the SDK `attributes` slot to this shop's subclass, which adds
     * `fetchImageViewOptions` for the PLP and Search Results Page image view
     * selector.
     */
    attributes: ShopAttributeService
  }
}
