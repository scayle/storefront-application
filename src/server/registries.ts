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
import { createMapperRegistry, createServiceRegistry } from '@scayle/storefront'
import { createCMSService } from '@cms-server/service'
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

/**
 * Per-request mapper registry blueprint.
 *
 * Maps each `MapperRegistry` slot to a factory. Resolved once per request by
 * the registry middleware and exposed on the Hono context as
 * `ctx.get('mappers')`. Slots are typed via the `declare module` augmentation
 * in `src/server/types/index.ts`.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/extending-sdk
 */
export const mapperRegistry = createMapperRegistry({
  analytics: ({ storefront }) => new AnalyticsEventMapper(storefront),
  campaign: ({ storefront }) => new CampaignMapperService(storefront),
  product: ({ storefront, mappers }) =>
    new ProductMapperService(storefront, mappers),
  category: ({ storefront }) => new CategoryMapperService(storefront),
  filter: ({ storefront }) => new FilterMapperService(storefront),
  navigation: ({ storefront, mappers }) =>
    new NavigationMapperService(storefront, mappers),
  wishlist: ({ storefront, mappers }) =>
    new WishlistMapperService(storefront, mappers),
  promotion: ({ storefront }) => new PromotionMapperService(storefront),
  basket: ({ storefront, mappers }) =>
    new BasketMapperService(storefront, mappers),
  order: ({ storefront }) => new OrderMapperService(storefront),
  customer: ({ storefront, mappers }) =>
    new CustomerMapperService(storefront, mappers),
  search: ({ storefront, mappers }) =>
    new SearchMapperService(storefront, mappers),
  i18n: ({ storefront }) => new ServerI18nService(storefront),
  shopConfig: ({ storefront, mappers }) =>
    new ShopConfigMapperService(storefront, mappers),
})

/**
 * Per-request service registry blueprint.
 *
 * Maps each `ServiceRegistry` slot to a factory that receives the per-request
 * `RequestContext`: the storefront context, the resolved `mappers`, sibling
 * `services`, and the inbound `request` (`headers`, `originalIp`, `session`).
 * Each factory pulls out only the parts its service takes, so the slot states
 * its dependency surface. Resolved once per request and exposed as
 * `ctx.get('services')`.
 */
export const serviceRegistry = createServiceRegistry({
  campaigns: ({ storefront, mappers }) =>
    new CampaignsService(storefront, mappers),
  navigation: ({ storefront, mappers }) =>
    new NavigationService(storefront, mappers),
  categoryNavigation: ({ storefront, mappers, services }) =>
    new CategoryNavigationService(storefront, mappers, services),
  productListing: ({ storefront, mappers, services, request }) =>
    new ProductListingService(storefront, mappers, services, request),
  wishlist: ({ storefront, mappers, services }) =>
    new WishlistService(storefront, mappers, services),
  productDetail: ({ storefront, mappers, services, request }) =>
    new ProductDetailService(storefront, mappers, services, request),
  recommendations: ({ storefront, mappers, services }) =>
    new RecommendationsService(storefront, mappers, services),
  promotions: ({ storefront, mappers }) =>
    new PromotionsService(storefront, mappers),
  basket: ({ storefront, mappers, services, request }) =>
    new BasketService(storefront, mappers, services, request),
  checkout: ({ storefront, services }) =>
    new CheckoutService(storefront, services),
  order: ({ storefront, mappers, request }) =>
    new OrderService(storefront, mappers, request),
  // Override `getCustomData()` in a subclass to attach your project's order metadata to
  // every basket call and the checkout JWT. See the JSDoc of `OrderCustomDataService`.
  orderCustomData: ({ storefront, request }) =>
    new OrderCustomDataService(storefront, request),
  gifts: ({ storefront, mappers, services }) =>
    new GiftService(storefront, mappers, services),
  search: ({ storefront, mappers, services }) =>
    new SearchService(storefront, mappers, services),
  customer: ({ storefront, mappers, request }) =>
    new CustomerService(storefront, mappers, request),
  customerAddress: ({ storefront, request }) =>
    new CustomerAddressService(storefront, request),
  auth: ({ storefront, services, request }) =>
    new AuthFlowService(storefront, services, request),
  shopConfig: ({ storefront, mappers }) =>
    new ShopConfigService(storefront, mappers),
  attributes: ({ storefront }) => new ShopAttributeService(storefront),
  country: ({ storefront, request }) => new CountryService(storefront, request),
  subscription: ({ services }) => new SubscriptionService(services),
  cms: ({ storefront }) => createCMSService(storefront),
  analytics: ({ storefront, mappers, request }) =>
    new AnalyticsForwardService(storefront, mappers, request),
})
