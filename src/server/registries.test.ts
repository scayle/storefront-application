import { describe, expect, it } from 'vitest'
import {
  AnalyticsForwardService,
  AuthFlowService,
  BasketService,
  CampaignsService,
  CategoryNavigationService,
  CheckoutService,
  CountryService,
  GiftService,
  NavigationService,
  OrderCustomDataService,
  OrderService,
  ProductDetailService,
  ProductListingService,
  PromotionsService,
  RecommendationsService,
  SearchService,
  ShopConfigService,
  SubscriptionService,
  CustomerService,
  CustomerAddressService,
  WishlistService,
} from '@scayle/storefront/services'
import { AnalyticsEventMapper } from '@scayle/storefront/mappers'
import {
  createMockIncomingRequest,
  createMockStorefrontContext,
} from '../test/utils/context'
import { ServerI18nService } from './services/i18n'
import { ShopAttributeService } from './services/attribute-service'
import { BasketMapperService } from './services/mappers/basket-mapper'
import { ShopConfigMapperService } from './services/mappers/shop-config-mapper'
import { SearchMapperService } from './services/mappers/search-mapper'
import { CampaignMapperService } from './services/mappers/campaign-mapper'
import { ProductMapperService } from './services/mappers/product-mapper'
import { CategoryMapperService } from './services/mappers/category-mapper'
import { FilterMapperService } from './services/mappers/filter-mapper'
import { NavigationMapperService } from './services/mappers/navigation-mapper'
import { WishlistMapperService } from './services/mappers/wishlist-mapper'
import { PromotionMapperService } from './services/mappers/promotion-mapper'
import { OrderMapperService } from './services/mappers/order-mapper'
import { CustomerMapperService } from './services/mappers/customer-mapper'
import { mapperRegistry, serviceRegistry } from './registries'

/**
 * Resolves both registries in the order the runtime middleware chain does: the
 * mapper registry first, then the service registry around it.
 */
function resolveRegistries() {
  const storefront = createMockStorefrontContext()
  const mappers = mapperRegistry(storefront)
  const services = serviceRegistry({
    storefront,
    request: createMockIncomingRequest(),
    mappers,
  })

  return { mappers, services }
}

// Slot types already force each factory's arguments, and memoization is the
// SDK `createLazyRegistry`'s, so a wrong class on a slot is what is left to check.
describe('mapperRegistry', () => {
  it.for([
    { slot: 'analytics', type: AnalyticsEventMapper },
    { slot: 'campaign', type: CampaignMapperService },
    { slot: 'product', type: ProductMapperService },
    { slot: 'category', type: CategoryMapperService },
    { slot: 'filter', type: FilterMapperService },
    { slot: 'navigation', type: NavigationMapperService },
    { slot: 'wishlist', type: WishlistMapperService },
    { slot: 'promotion', type: PromotionMapperService },
    { slot: 'basket', type: BasketMapperService },
    { slot: 'order', type: OrderMapperService },
    { slot: 'customer', type: CustomerMapperService },
    { slot: 'search', type: SearchMapperService },
    { slot: 'i18n', type: ServerI18nService },
    { slot: 'shopConfig', type: ShopConfigMapperService },
  ] as const)('resolves the $slot slot to $type.name', ({ slot, type }) => {
    const { mappers } = resolveRegistries()

    expect(mappers[slot]).toBeInstanceOf(type)
  })
})

// `cms` is left out: it comes from the selected provider's `createCMSService`,
// which each provider's own service.test.ts covers.
describe('serviceRegistry', () => {
  it.for([
    { slot: 'campaigns', type: CampaignsService },
    { slot: 'navigation', type: NavigationService },
    { slot: 'categoryNavigation', type: CategoryNavigationService },
    { slot: 'productListing', type: ProductListingService },
    { slot: 'wishlist', type: WishlistService },
    { slot: 'productDetail', type: ProductDetailService },
    { slot: 'recommendations', type: RecommendationsService },
    { slot: 'promotions', type: PromotionsService },
    { slot: 'basket', type: BasketService },
    { slot: 'checkout', type: CheckoutService },
    { slot: 'order', type: OrderService },
    { slot: 'orderCustomData', type: OrderCustomDataService },
    { slot: 'gifts', type: GiftService },
    { slot: 'search', type: SearchService },
    { slot: 'customer', type: CustomerService },
    { slot: 'customerAddress', type: CustomerAddressService },
    { slot: 'auth', type: AuthFlowService },
    { slot: 'shopConfig', type: ShopConfigService },
    { slot: 'attributes', type: ShopAttributeService },
    { slot: 'country', type: CountryService },
    { slot: 'subscription', type: SubscriptionService },
    { slot: 'analytics', type: AnalyticsForwardService },
  ] as const)('resolves the $slot slot to $type.name', ({ slot, type }) => {
    const { services } = resolveRegistries()

    expect(services[slot]).toBeInstanceOf(type)
  })
})
